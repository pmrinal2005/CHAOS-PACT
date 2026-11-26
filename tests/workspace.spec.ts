import { expect, test } from "@playwright/test";
import type { WorkspaceDTO } from "../src/lib/types";

/**
 * Data-agnostic acceptance suite. It never assumes seeded records: the workspace is
 * either empty (fresh database) or contains real runs produced by Kane CLI.
 */
const source = async (request: import("@playwright/test").APIRequestContext) =>
  (await (await request.get("/api/workspace")).json()) as WorkspaceDTO;

test("health reports a complete, ready schema", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toMatchObject({ ok: true, schema: "ready", tables: 8 });
});

test("workspace API contains no sample or replay-fixture records", async ({ request }) => {
  const w = await source(request);
  expect(Array.isArray(w.projects)).toBeTruthy();
  expect(w.runs.every((r) => r.trigger !== "sample_replay")).toBeTruthy();
  expect(w.battles.every((b) => b.mode !== "sample_replay")).toBeTruthy();
  expect(JSON.stringify(w)).not.toContain("Nexus Commerce");
});

for (const [route, title] of [
  ["dashboard", "Mission Control"],
  ["arena", "Adversarial Arena"],
  ["evidence", "Evidence Vault"],
  ["coverage", "Coverage Map"],
  ["postmortems", "Post-Mortems"],
  ["integrations", "Integrations"],
  ["devices", "Mobile Grid"],
  ["team", "Team"],
  ["billing", "Billing & Credits"],
  ["settings", "Settings"],
  ["audit", "Blueprint audit"],
]) {
  test(`route ${route} renders without errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`/#/${route}`);
    // An empty workspace opens the onboarding dialog; the page behind it must still render.
    await expect(page.locator("main h1, .mission-hero h1, dialog h2, [role=dialog] h2").first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Failed query:");
    expect(errors).toEqual([]);
  });
}

test("fonts are self-hosted by next/font (no external font requests)", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (r) => {
    if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) external.push(r.url());
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(external).toEqual([]);
});

test("command palette opens with the keyboard and closes with Escape", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("unknown receipt ids resolve to a not-found response", async ({ request }) => {
  const res = await request.get("/api/receipt/00000000-0000-4000-8000-000000000000");
  expect([400, 404]).toContain(res.status());
});

test("public post-mortem index is reachable without the workspace", async ({ request }) => {
  const res = await request.get("/postmortems");
  expect(res.status()).toBe(200);
});

test("chaos lab checkout is public and renders the storefront", async ({ page }) => {
  await page.goto("/lab/checkout");
  await expect(page.getByRole("button", { name: /pay now/i })).toBeVisible();
});

test("mobile viewport has no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("a created project is persisted in PostgreSQL and listed by the workspace", async ({ request }) => {
  const name = `E2E ${Date.now()}`;
  const created = await request.post("/api/projects", {
    data: {
      name,
      repoUrl: "https://github.com/pmrinal2005/CHAOS-PACT",
      stagingUrl: "https://example.com",
      prodUrl: "https://example.com",
      prdMarkdown: "# Spec\n\n- The checkout returns a valid order confirmation.\n",
    },
  });
  expect(created.status()).toBe(201);
  const { project } = await created.json();
  const w = await source(request);
  expect(w.projects.some((p) => p.id === project.id && p.name === name)).toBeTruthy();
  const archived = await request.patch(`/api/projects/${project.id}`, { data: { archived: true } });
  expect(archived.ok()).toBeTruthy();
});
