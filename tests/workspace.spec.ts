import { expect, test } from "@playwright/test";
import { SAMPLE_PROJECT_ID } from "../src/lib/sample-workspace";
import type { WorkspaceDTO } from "../src/lib/types";

const source = async (request: import("@playwright/test").APIRequestContext) =>
  (await (await request.get("/api/workspace")).json()) as WorkspaceDTO;

test("healthy workspace checks its complete schema and labels the replay dataset", async ({
  request,
}) => {
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toMatchObject({
    ok: true,
    schema: "ready",
    tables: 8,
  });
  const w = await source(request);
  expect(w.projects.some((p) => p.id === SAMPLE_PROJECT_ID)).toBeTruthy();
  const sample = w.runs.filter((r) => r.projectId === SAMPLE_PROJECT_ID);
  expect(sample).toHaveLength(128);
  expect(
    sample.every((r) => r.trigger === "sample_replay" && r.credits === 0),
  ).toBeTruthy();
});

for (const [route, title] of [
  ["dashboard", "Mission Control"],
  ["project?tab=Run+history", "Nexus Commerce"],
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
  test(`route ${route} renders independently`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`/#/${route}`);
    await expect(page.locator("main h1").first()).toContainText(title);
    await expect(page.locator("body")).not.toContainText("Failed query:");
    expect(errors).toEqual([]);
  });
}

test("telemetry ranges, recent status filters, chart toggles and ledger drill-down", async ({
  page,
}) => {
  await page.goto("/");
  const total = page.locator(".mc-metric").first().locator("strong");
  await expect(total).toHaveText("128");
  await page.getByLabel("Activity time range").selectOption("6");
  await expect(total).not.toHaveText("128");
  await page.getByLabel("Filter recent executions").selectOption("failed");
  await expect(page.locator(".mc-run-table .result-pill").first()).toHaveText(
    "Caught",
  );
  await page.getByRole("button", { name: "Total runs", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Total runs", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.locator(".mc-metric.peach").click();
  await expect(page.getByLabel("Filter runs by status")).toHaveValue("failed");
});

test("sample replay streams ordered events and offers JSON, not a fake native pack", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Trigger run", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("illustrative");
  await page.getByRole("button", { name: "Replay run", exact: true }).click();
  await expect(page.locator("main h1")).toHaveText(
    "Checkout flow verification",
  );
  await expect(page.locator(".event-row")).toHaveCount(8, { timeout: 12000 });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export sample trace" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.sample\.json$/);
  await page.getByRole("button", { name: "Share replay", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("Replay URL")).toHaveValue(/replay=1/);
});

test("sample evidence viewer supports inspection and keyboard scrubbing", async ({
  page,
}) => {
  await page.goto("/#/evidence");
  await page.locator(".evidence-tile").first().click();
  await expect(page.getByRole("dialog")).toContainText("ILLUSTRATIVE TRACE");
  await page.getByRole("tab", { name: "Network", exact: true }).click();
  await expect(page.locator(".log-drawer pre")).toContainText("200");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".viewer-step")).toContainText("STEP 02");
  await page.getByRole("tab", { name: "Pack", exact: true }).click();
  await expect(page.locator(".log-drawer pre")).toContainText(
    "No native .evidence pack",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("arena opens a selected battle replay without a repository mutation", async ({
  page,
}) => {
  let mutations = 0;
  page.on("request", (r) => {
    if (r.url().includes("/api/arena/sabotage")) mutations++;
  });
  await page.goto("/#/arena");
  await page.getByLabel("Battle scenario").selectOption({ index: 1 });
  await page
    .getByRole("button", { name: "Replay battle", exact: true })
    .click();
  await expect(page).toHaveURL(/theater.*replay=1/);
  await expect(page.locator(".event-row")).toHaveCount(8);
  expect(mutations).toBe(0);
});

test("keyboard command search and audit export", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".mission-hero")).toBeVisible();
  await page.keyboard.press("Control+k");
  await page
    .getByPlaceholder("Find a screen or a run...")
    .fill("Blueprint audit");
  await page.keyboard.press("Enter");
  await expect(page.locator("main h1")).toHaveText("Blueprint audit");
  await page.getByLabel("Filter audit status").selectOption("Missing");
  await page.getByLabel("Search audit findings").fill("tenant");
  await expect(page.locator(".audit-record")).toHaveCount(1);
  await page.locator(".audit-record summary").click();
  await expect(page.locator(".audit-record p")).toContainText("multi-tenant");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export audit" }).click();
  expect((await download).suggestedFilename()).toMatch(/audit.md$/);
});

test("database outage shows read-only navigation and recovers after retry", async ({
  page,
}) => {
  await page.route("**/api/workspace", (r) =>
    r.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Test connection interruption" }),
    }),
  );
  await page.goto("/");
  await expect(page.locator(".cs-recovery")).toBeVisible();
  await expect(page.locator(".mc-metric").first()).toContainText("128");
  await page.goto("/#/coverage");
  await expect(page.locator("main h1")).toHaveText("Coverage Map");
  await page.unroute("**/api/workspace");
  await page.getByRole("button", { name: "Reconnect", exact: true }).click();
  await expect(page.locator(".cs-recovery")).toHaveCount(0);
});

test("mobile navigation fits the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".mission-hero")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Open workspace navigation" }).click();
  await page
    .locator(".cs-nav-item")
    .filter({ hasText: "Evidence vault" })
    .click();
  await expect(page.locator("main h1")).toHaveText("Evidence Vault");
  await expect(page.locator(".cs-scrim")).toHaveCount(0);
});

test("project lifecycle persists and replay cannot cross project boundaries", async ({
  request,
}) => {
  const w = await source(request);
  const existing = w.runs.find((r) => r.projectId === SAMPLE_PROJECT_ID)!;
  const created = await request.post("/api/projects", {
    data: {
      name: "Temporary audit project",
      repoUrl: "example/audit-fixture",
      stagingUrl: "https://staging.example",
      prodUrl: "https://example.org",
      prdMarkdown: "- Checkout retains the cart.\n- Search shows products.",
      executionMode: "judge_instant_replay",
    },
  });
  expect(created.status()).toBe(201);
  const id = (await created.json()).project.id;
  try {
    const replay = await request.post("/api/kane/trigger", {
      data: {
        projectId: id,
        executionMode: "judge_instant_replay",
        replayRunId: existing.id,
      },
    });
    expect(replay.status()).toBe(409);
    const patch = await request.patch(`/api/projects/${id}`, {
      data: { name: "Updated audit project", archived: true },
    });
    expect(patch.ok()).toBeTruthy();
    const row = (await source(request)).projects.find((p) => p.id === id);
    expect(row).toMatchObject({
      name: "Updated audit project",
      archived: true,
    });
    expect(row?.requirements).toHaveLength(2);
  } finally {
    expect((await request.delete(`/api/projects/${id}`)).ok()).toBeTruthy();
  }
});

test("sample receipts, public article and cloud guards are truthful", async ({
  request,
}) => {
  const w = await source(request),
    b = w.battles.find((b) => b.mode === "sample_replay")!;
  const receipt = await request.get(`/api/receipt/${b.id}`);
  expect(await receipt.json()).toMatchObject({ valid: false, signed: false });
  const publish = await request.post("/api/blog/publish", {
    data: { battleId: b.id },
  });
  expect(publish.status()).toBe(409);
  const trigger = await request.post("/api/kane/trigger", {
    data: {
      projectId: SAMPLE_PROJECT_ID,
      executionMode: "live_cloud",
      objective: "Read the page heading",
      targets: ["desktop_web"],
    },
  });
  expect(trigger.status()).toBe(409);
  expect(
    (await request.get("/postmortems/sample-checkout-recovery")).status(),
  ).toBe(200);
  expect((await request.get("/postmortems")).status()).toBe(200);
  expect((await request.get("/api/runs/not-a-run")).status()).toBe(404);
});

test("four-step onboarding keeps an actual new workspace empty and persists its PRD", async ({
  page,
  request,
}) => {
  const repo = `onboarding-${Date.now()}`;
  let id = "";
  try {
    await page.goto("/");
    await page.getByRole("button", { name: "Switch project" }).click();
    await page
      .getByRole("button", { name: "Connect project", exact: true })
      .click();
    await page
      .getByLabel("GitHub repository", { exact: true })
      .fill(`example/${repo}`);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Continue", exact: true }),
    ).toBeDisabled();
    await page
      .getByLabel("Staging URL", { exact: true })
      .fill("https://staging.example");
    await page
      .getByLabel("Production URL", { exact: true })
      .fill("https://example.org");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page
      .locator("input[type=file]")
      .setInputFiles({
        name: "audit-prd.md",
        mimeType: "text/markdown",
        buffer: Buffer.from(
          "# Example\n- Cart state is retained.\n- Checkout confirms the order.",
        ),
      });
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    const saved = page.waitForResponse(
      (res) =>
        res.url().endsWith("/api/projects") &&
        res.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Enter workspace" }).click();
    id = (await (await saved).json()).project.id;
    await expect(page.locator(".cs-project-text strong")).toHaveText(repo);
    await expect(
      page.locator(".mc-metric").first().locator("strong"),
    ).toHaveText("0");
    await page.reload();
    await expect(page.locator(".cs-project-text strong")).toHaveText(repo);
    await page
      .locator(".cs-nav-item")
      .filter({ hasText: "Coverage map" })
      .click();
    await expect(page.locator("main")).toContainText("Cart state is retained.");
  } finally {
    if (id) await request.delete(`/api/projects/${id}`);
  }
});

test("a team roster entry survives refresh and is removable", async ({
  page,
  request,
}) => {
  const email = `fixture-${Date.now()}@example.org`;
  await page.goto("/#/team");
  await page.getByLabel("Name", { exact: true }).fill("Temporary operator");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Role", { exact: true }).selectOption("Viewer");
  await page.getByRole("button", { name: "Add member" }).click();
  try {
    await expect(page.locator("main")).toContainText(email);
    await page.reload();
    await expect(page.locator("main")).toContainText(email);
    const member = (await source(request)).members.find(
      (m) => m.email === email,
    )!;
    expect(member.role).toBe("Viewer");
  } finally {
    const member = (await source(request)).members.find(
      (m) => m.email === email,
    );
    if (member)
      expect(
        (await request.delete(`/api/team?id=${member.id}`)).ok(),
      ).toBeTruthy();
  }
});

test("fully disconnected sample timeline remains replayable without writes", async ({
  page,
}) => {
  let writes = 0;
  await page.route("**/api/**", (r) => {
    if (r.request().method() !== "GET") writes++;
    return r.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"error":"Test outage"}',
    });
  });
  await page.goto("/");
  await expect(page.locator(".cs-recovery")).toBeVisible();
  await page.getByRole("button", { name: "Trigger run", exact: true }).click();
  await page.getByRole("button", { name: "Replay run", exact: true }).click();
  await expect(page.locator(".event-row")).toHaveCount(8);
  expect(writes).toBe(0);
});
