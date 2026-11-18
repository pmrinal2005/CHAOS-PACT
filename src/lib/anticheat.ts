import type { AuditCheck } from "./types";

/** Minimal line diff (LCS) rendered as a unified diff. */
export function unifiedDiff(path: string, before: string, after: string) {
  const a = before.split("\n");
  const b = after.split("\n");
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const x = a.slice(start, endA);
  const y = b.slice(start, endB);
  const ops: string[] = [];
  if (x.length * y.length > 2_000_000) {
    ops.push(...x.map((l) => `-${l}`), ...y.map((l) => `+${l}`));
  } else {
    const w = y.length + 1;
    const table = new Uint32Array((x.length + 1) * w);
    for (let i = x.length - 1; i >= 0; i--)
      for (let j = y.length - 1; j >= 0; j--)
        table[i * w + j] =
          x[i] === y[j]
            ? table[(i + 1) * w + j + 1] + 1
            : Math.max(table[(i + 1) * w + j], table[i * w + j + 1]);
    let i = 0;
    let j = 0;
    while (i < x.length && j < y.length) {
      if (x[i] === y[j]) {
        ops.push(` ${x[i]}`);
        i++;
        j++;
      } else if (table[(i + 1) * w + j] >= table[i * w + j + 1]) ops.push(`-${x[i++]}`);
      else ops.push(`+${y[j++]}`);
    }
    while (i < x.length) ops.push(`-${x[i++]}`);
    while (j < y.length) ops.push(`+${y[j++]}`);
  }
  if (!ops.some((o) => o[0] !== " ")) return "";
  const lead = a.slice(Math.max(0, start - 3), start).map((l) => ` ${l}`);
  const tail = a.slice(endA, endA + 3).map((l) => ` ${l}`);
  const from = Math.max(0, start - 3) + 1;
  return [
    `--- a/${path}`,
    `+++ b/${path}`,
    `@@ -${from},${lead.length + x.length + tail.length} +${from},${lead.length + y.length + tail.length} @@`,
    ...lead,
    ...ops,
    ...tail,
  ].join("\n");
}

export type PatchFile = { path: string; before: string; after: string };

const TEST_PATH =
  /(_test\.md$|^\.testmuai\/|(^|\/)__tests__\/|\.(test|spec)\.[cm]?[jt]sx?$|(^|\/)(tests?|e2e|cypress|playwright)\/|^\.context\/)/i;
// Validation and guard clauses. A 4xx response is a guard; a 5xx is not.
const GUARD_LINE =
  /\b(throw\s|assert\w*\s*\(|expect\s*\(|validate\w*\s*\(|verify\w*\s*\(|\.status\s*\(\s*4\d\d|status:\s*4\d\d|if\s*\(\s*!)/;
const ISO_DATE = /\b20\d\d-\d\d-\d\d\b/;

function changed(file: PatchFile) {
  const before = new Map<string, number>();
  for (const l of file.before.split("\n")) before.set(l, (before.get(l) || 0) + 1);
  const added: string[] = [];
  for (const l of file.after.split("\n")) {
    const n = before.get(l) || 0;
    if (n > 0) before.set(l, n - 1);
    else added.push(l);
  }
  const removed: string[] = [];
  for (const [l, n] of before) for (let i = 0; i < n; i++) removed.push(l);
  return { added, removed };
}

/**
 * Anti-Cheat Patch-Intent Guard. Deterministic audit of a healer patch:
 * the patch must repair the product, not weaken the referee.
 */
export function auditPatch(input: {
  files: PatchFile[];
  /** Directories the healer is allowed to touch (from the breaking diff). */
  scopeDirs: string[];
  /** Literal values observed by the test (variables, final_state). */
  fixtureValues: string[];
  /**
   * Lines the breaking diff itself added. Reverting them is the repair, so
   * they are never counted as protected validation logic.
   */
  regressionLines?: string[];
}): { passed: boolean; checks: AuditCheck[]; notes: string } {
  const { files } = input;
  const checks: AuditCheck[] = [];
  const touched = files.filter((f) => f.before !== f.after);

  checks.push({
    name: "Patch is non-empty",
    passed: touched.length > 0,
    detail: touched.length
      ? `${touched.length} file(s) changed.`
      : "The healer returned no effective change.",
  });

  const testFiles = touched.filter((f) => TEST_PATH.test(f.path));
  checks.push({
    name: "No assertions weakened",
    passed: !testFiles.length,
    detail: testFiles.length
      ? `Test or assurance files were modified: ${testFiles.map((f) => f.path).join(", ")}`
      : "No _test.md, .testmuai, .context or test files were touched.",
  });

  let removedGuards = 0;
  let addedGuards = 0;
  const gutted: string[] = [];
  const hardcoded: string[] = [];
  const fixtures = input.fixtureValues
    .map((v) => String(v).trim())
    .filter((v) => v.length >= 4);
  const regression = new Set((input.regressionLines || []).map((l) => l.trim()).filter(Boolean));
  for (const f of touched) {
    const { added, removed } = changed(f);
    removedGuards += removed.filter((l) => GUARD_LINE.test(l) && !regression.has(l.trim())).length;
    addedGuards += added.filter((l) => GUARD_LINE.test(l)).length;
    const beforeLines = f.before.split("\n").filter((l) => l.trim()).length;
    const afterLines = f.after.split("\n").filter((l) => l.trim()).length;
    if (beforeLines >= 10 && afterLines < beforeLines * 0.5) gutted.push(f.path);
    const removedText = removed.join("\n");
    for (const line of added) {
      const fixture = fixtures.find((v) => line.includes(v) && !removedText.includes(v));
      const date = line.match(ISO_DATE)?.[0];
      if (fixture) hardcoded.push(`${f.path}: fixture value "${fixture}"`);
      else if (date && !f.before.includes(date))
        hardcoded.push(`${f.path}: literal date ${date}`);
    }
  }
  checks.push({
    name: "No validation logic deleted",
    passed: removedGuards <= addedGuards && !gutted.length,
    detail: gutted.length
      ? `More than half of ${gutted.join(", ")} was deleted.`
      : removedGuards > addedGuards
        ? `${removedGuards} guard/validation line(s) removed but only ${addedGuards} added.`
        : "Guards and validation checks are preserved.",
  });
  checks.push({
    name: "No hardcoded constants introduced",
    passed: !hardcoded.length,
    detail: hardcoded.length
      ? `Test-observed values were hardcoded: ${[...new Set(hardcoded)].slice(0, 4).join("; ")}`
      : "No fixture values or literal dates were hardcoded.",
  });

  const inScope = (p: string) =>
    !input.scopeDirs.length ||
    input.scopeDirs.some((d) => d === "" || p === d || p.startsWith(d.endsWith("/") ? d : `${d}/`));
  const outside = touched.filter((f) => !inScope(f.path));
  checks.push({
    name: "Scope boundaries respected",
    passed: !outside.length && touched.length <= 5,
    detail: outside.length
      ? `Files outside the declared module scope: ${outside.map((f) => f.path).join(", ")}`
      : touched.length > 5
        ? `${touched.length} files changed; a repair must stay minimal (max 5).`
        : "All changes are inside the declared module scope.",
  });

  const failed = checks.filter((c) => !c.passed);
  return {
    passed: !failed.length,
    checks,
    notes: failed.length
      ? failed.map((c) => `${c.name}: ${c.detail}`).join(" | ")
      : "All patch-intent checks passed.",
  };
}

export const dirOf = (path: string) =>
  path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
