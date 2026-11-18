import type { Requirement } from "./types";

/** Extracts requirement claims from a Markdown PRD/README. */
export function parseRequirements(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const bullets = lines
    .filter((line) => /^(?:[-*+]|\d+\.)\s+/.test(line))
    .map((line) => line.replace(/^(?:[-*+]|\d+\.)\s+(?:\[[ xX]\]\s*)?/, ""));
  const headings = lines
    .filter((line) => /^#{1,6}\s/.test(line))
    .map((line) => line.replace(/^#{1,6}\s+/, ""));
  return [
    ...new Set(bullets.length ? bullets : headings.length ? headings : lines.slice(0, 1)),
  ]
    .map((t) => t.slice(0, 400))
    .slice(0, 500);
}

/**
 * Reconciles a new document against the stored requirement set.
 * Unchanged claims keep their trust; claims that left the source become stale.
 */
export function syncRequirements(old: Requirement[], text: string): Requirement[] {
  const claims = parseRequirements(text);
  const byText = new Map(old.map((r) => [r.text, r]));
  let next = old.reduce((m, r) => Math.max(m, Number(r.id.replace(/\D/g, "")) || 0), 0);
  const kept = claims.map(
    (claim): Requirement =>
      byText.get(claim)
        ? {
            ...byText.get(claim)!,
            trust: byText.get(claim)!.trust === "stale" ? "derived" : byText.get(claim)!.trust,
          }
        : { id: `REQ-${String(++next).padStart(3, "0")}`, text: claim, trust: "derived" },
  );
  const stale = old
    .filter((r) => !claims.includes(r.text) && (r.trust === "trusted" || r.testmd))
    .map((r): Requirement => ({ ...r, trust: "stale" }));
  return [...kept, ...stale];
}

export const coveragePct = (requirements: Requirement[]) => {
  const live = requirements.filter((r) => r.trust !== "stale");
  return live.length
    ? Math.round((live.filter((r) => r.trust === "trusted").length / live.length) * 1000) / 10
    : 0;
};

const slug = (v: string) =>
  v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "requirement";

export const testmdPathFor = (r: Requirement) =>
  `.testmuai/tests/${r.id.toLowerCase()}-${slug(r.text)}_test.md`;

/** Drafts a `_test.md` spec for one requirement, with DevTools checkpoints. */
export function draftTestmd(r: Requirement, url: string) {
  return `---
mode: testing
url: ${url}
timeout: 120
tags: [revenue-guard, web, mobile, ${r.id.toLowerCase()}]
---
# ${r.id}: ${r.text}

## Open the application
Open ${url}.

## Exercise the requirement
Perform the user-visible steps needed to demonstrate this behaviour: ${r.text}

## Verify the visible outcome
Verify the page shows the expected result for: ${r.text}

## Network checkpoint
Assert that no network request returned a 5xx status code.

## Console checkpoint
Assert that there are zero browser console errors or unhandled JavaScript exceptions.

## Performance checkpoint
Assert that the Largest Contentful Paint is under 2500ms.
`;
}
