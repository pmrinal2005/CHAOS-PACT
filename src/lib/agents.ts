import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  adversarialBattles,
  evidenceArtifacts,
  kaneRuns,
  ndjsonEvents,
  projects,
  publishedPostmortems,
  type BattleRow,
  type RunRow,
} from "@/db/schema";
import { auditPatch, dirOf, unifiedDiff, type PatchFile } from "./anticheat";
import { cfg, HttpError, need, signReceipt } from "./config";
import { chatJson, GitHub } from "./integrations";
import { logBattle, triggerRuns } from "./kane";
import {
  MAX_ATTEMPTS,
  platformNames,
  scenarioNames,
  shortId,
  type ChaosScenario,
} from "./types";

const DEVTOOLS =
  "Assert that no network request returned a 5xx status code. Assert that there are zero browser console errors or unhandled JavaScript exceptions.";
const CODE = /\.(tsx?|jsx?|mjs|cjs|vue|svelte|py|rb|go|php)$/i;
const STYLE = /\.(css|scss|sass|less|tsx|jsx|vue|svelte|html)$/i;
const SKIP =
  /(^|\/)(node_modules|dist|build|\.next|vendor|coverage|\.testmuai|\.context|__tests__|tests?|e2e)\/|\.(test|spec)\.|\.min\.|lock/i;

/** Red-team fault catalogue: where to look, what to break, how the referee checks. */
export const SCENARIOS: Record<
  ChaosScenario,
  { match: RegExp; ext: RegExp; fault: string; targets: string[]; objective: (url: string) => string }
> = {
  silent_stripe_500: {
    match: /(checkout|payment|stripe|billing|order|cart)/i,
    ext: CODE,
    fault:
      "Make a checkout or payment API handler return an HTTP 500 (or throw) for a realistic subset of requests, for example when a promo code is applied, while the UI shows no visible error.",
    targets: ["desktop_web"],
    objective: (url) =>
      `Go to ${url}. Add the first available product or plan to the cart, apply any promo code shown on the page, and complete checkout up to the confirmation step. ${DEVTOOLS} Store the order confirmation code as 'order_id' and the total charged as 'final_price'.`,
  },
  mobile_cta_overlap: {
    match: /(checkout|cart|pay|banner|promo|layout|footer|global|style)/i,
    ext: STYLE,
    fault:
      "Introduce a layout regression so that a sticky banner or footer overlaps the primary checkout / pay call-to-action on narrow mobile viewports (412px wide or less) only. Desktop must look unchanged.",
    targets: ["desktop_web", "remote_pixel_7"],
    objective: (url) =>
      `Go to ${url}. Add the first available product or plan to the cart and open checkout. Verify the primary pay or checkout button is fully visible, not covered by any banner or footer, and can be tapped. Tap it and verify the next step loads. ${DEVTOOLS}`,
  },
  cookie_httponly_strip: {
    match: /(auth|session|cookie|login|signin|middleware)/i,
    ext: CODE,
    fault:
      "Strip the httpOnly (and secure) flag from the session cookie where it is set, leaving sign-in visually working.",
    targets: ["desktop_web"],
    objective: (url) =>
      `Go to ${url} and sign in or start a session the way a new visitor would. Assert that the session cookie exists and is marked httpOnly and secure. ${DEVTOOLS}`,
  },
  readme_pricing_lie: {
    match: /^(readme|prd)\.md$/i,
    ext: /\.md$/i,
    fault:
      "Add one confident documentation claim about a discount tier or promo code that the application does not actually implement.",
    targets: ["desktop_web"],
    objective: (url) =>
      `Go to ${url}. Verify in the live application that every pricing, discount and promo-code claim made in the project documentation is true. Fail if any documented claim cannot be reproduced. ${DEVTOOLS}`,
  },
  console_hydration_crash: {
    match: /(checkout|cart|product|pricing|page|layout|app)/i,
    ext: /\.(tsx|jsx|vue|svelte)$/i,
    fault:
      "Introduce an unhandled JavaScript exception or hydration mismatch that fires in the browser console on the checkout path without breaking the initial render.",
    targets: ["desktop_web"],
    objective: (url) =>
      `Go to ${url}. Navigate through the main purchase path to checkout. ${DEVTOOLS} Assert that the Largest Contentful Paint is under 2500ms.`,
  },
};

async function loadBattle(battleId: string) {
  const [battle] = await db.select().from(adversarialBattles).where(eq(adversarialBattles.id, battleId));
  need(battle, 404, "Battle not found.");
  const [project] = await db.select().from(projects).where(eq(projects.id, battle.projectId));
  need(project, 404, "Project not found.");
  return { battle, project };
}

const previewUrl = (template: string | null, branch: string, fallback: string) =>
  template?.includes("{branch}")
    ? template.replace("{branch}", branch.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase())
    : fallback;

/* ------------------------------ Stage 2: Red team ------------------------------ */

export async function startSabotage(
  input: { projectId: string; scenario: ChaosScenario; objective?: string; targetUrl?: string; targets?: string[] },
  appUrl: string,
  requester: string,
) {
  const scenario = SCENARIOS[input.scenario];
  need(scenario, 400, "Unknown chaos scenario.");
  const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId));
  need(project, 404, "Project not found.");
  need(cfg().workerUrl && cfg().workerSecret, 503, "No execution worker is configured (KANE_WORKER_URL, WORKER_SHARED_SECRET). A battle needs a live Kane CLI referee.");
  const gh = new GitHub(project.repoUrl);

  // Pick mutation candidates before any state is written, so failures stay clean.
  const baseSha = await gh.branchSha(project.defaultBranch);
  const tree = await gh.tree(baseSha);
  const candidates = tree
    .filter((n) => !SKIP.test(n.path) && scenario.ext.test(n.path) && scenario.match.test(n.path) && (n.size ?? 0) < 24_000)
    .sort((a, b) => a.path.length - b.path.length)
    .slice(0, 4);
  need(candidates.length, 422, `No files in ${project.repoUrl} match the "${scenarioNames[input.scenario]}" scenario.`);
  const files = await Promise.all(
    candidates.map(async (c) => ({ path: c.path, ...(await gh.file(c.path, baseSha)) })),
  );
  const mutation = await chatJson<{ path: string; content: string; description: string }>(
    "You are the Red-Team Chaos Saboteur in CHAOS-PACT, an authorised resilience drill. You mutate one file on an isolated chaos branch of the team's own repository so that their browser verification gate can be exercised. Make one small, realistic regression of the requested kind, the sort an AI coding agent ships by accident. Never touch tests. Respond with JSON: {\"path\": string, \"content\": string (the complete new file), \"description\": string (one sentence)}.",
    `Fault to inject: ${scenario.fault}\n\nCandidate files:\n${files.map((f) => `=== ${f.path} ===\n${f.content}`).join("\n\n")}`,
  );
  const target = files.find((f) => f.path === mutation.path);
  need(target && typeof mutation.content === "string", 502, "The saboteur chose a file outside the candidate set.");
  const diff = unifiedDiff(target!.path, target!.content, mutation.content);
  need(diff, 502, "The saboteur returned an unchanged file.");

  const [battle] = await db
    .insert(adversarialBattles)
    .values({
      projectId: project.id,
      battleMode: input.scenario === "readme_pricing_lie" ? "readme_lie_audit" : "chaos_sabotage",
      state: "SABOTAGE",
      saboteurMutationType: input.scenario,
      saboteurDiff: diff,
      baseBranch: project.defaultBranch,
      targets: input.targets?.length ? input.targets : scenario.targets,
    })
    .returning();
  const branch = `chaos-pact/battle-${battle.id.slice(0, 8)}`;
  await gh.createBranch(branch, baseSha);
  const commitSha = await gh.putFile(
    target!.path,
    mutation.content,
    `chaos(${input.scenario}): ${String(mutation.description).slice(0, 60)}`,
    branch,
    target!.sha,
  );
  const targetUrl = input.targetUrl || previewUrl(project.previewUrlTemplate, branch, project.stagingUrl);
  let objective = input.objective?.trim() || scenario.objective(targetUrl);
  if (input.scenario === "readme_pricing_lie") {
    const claims = diff.split("\n").filter((l) => /^\+[^+]/.test(l)).map((l) => l.slice(1).trim()).filter(Boolean);
    objective += ` The documentation states: ${claims.join(" ")}`;
  }
  await logBattle(battle.id, "red", `Injected ${scenarioNames[input.scenario]} into ${target!.path} on ${branch}: ${mutation.description}`, {
    branch,
    commitSha,
    targetUrl,
    objective,
  });
  const runs = await triggerRuns(
    {
      projectId: project.id,
      battleId: battle.id,
      role: "before",
      attempt: 0,
      trigger: "arena",
      name: `Referee: ${scenarioNames[input.scenario]}`,
      objective,
      targetUrl,
      targets: input.targets?.length ? input.targets : scenario.targets,
      commitSha,
      repoRef: branch,
      deployWaitS: cfg().deployWaitS,
      requesterHash: requester,
    },
    appUrl,
  );
  await logBattle(battle.id, "referee", `Kane CLI dispatched on ${runs.map((r) => platformNames[r.targetPlatform] || r.targetPlatform).join(" + ")} against ${targetUrl}.`);
  return { battleId: battle.id, runIds: runs.map((r) => r.id) };
}

/* --------------------------- Stage 3/5: Referee verdict --------------------------- */

export async function advanceBattle(run: RunRow, appUrl: string) {
  const { battle, project } = await loadBattle(run.battleId!);
  const phase = await db
    .select()
    .from(kaneRuns)
    .where(and(eq(kaneRuns.battleId, battle.id), eq(kaneRuns.role, run.role!), eq(kaneRuns.attempt, run.attempt)));
  if (phase.some((r) => r.status === "queued" || r.status === "running")) return;
  const failed = phase.find((r) => r.status === "failed");
  const infra = phase.find((r) => r.status === "error" || r.status === "timeout");
  const primary = phase.find((r) => r.targetPlatform === "desktop_web") || phase[0];
  const describe = (r: RunRow) =>
    `${shortId("RUN", r.id)} on ${platformNames[r.targetPlatform] || r.targetPlatform} exited ${r.exitCode}${r.resultCode ? ` (result_code ${r.resultCode})` : ""}${r.oneLiner ? `: ${r.oneLiner}` : ""}`;

  if (infra && !failed) {
    // Exit 2/3 is infrastructure, not a product bug: never trigger a code repair.
    await logBattle(battle.id, "referee", `Referee could not complete. ${describe(infra)}. ${infra.errorMessage || ""}`.trim(), {
      state: "BLOCKED_NEEDS_HUMAN",
      errorMessage: infra.errorMessage || "Kane CLI could not run (exit 2/3).",
      ...(run.role === "before" ? { beforeRunId: infra.id } : { afterRunId: infra.id }),
    });
    return;
  }

  if (run.role === "before") {
    if (failed) {
      await logBattle(battle.id, "referee", `Deployment LOCKED. ${describe(failed)}.`, {
        state: "REFEREE_FAIL",
        beforeRunId: failed.id,
        errorMessage: null,
      });
      if (battle.prNumber) await commentOnPr(battle, project.repoUrl, failed, appUrl);
      else await healBattle(battle.id, failed.id, appUrl).catch((err) => healError(battle.id, err));
      return;
    }
    if (battle.saboteurMutationType) {
      await logBattle(battle.id, "referee", "Referee passed even though a fault was injected. The objective's assertions do not cover this mutation; tighten the spec before trusting the gate.", {
        state: "BLOCKED_NEEDS_HUMAN",
        beforeRunId: primary.id,
        errorMessage: "Injected fault was not detected by the referee.",
      });
      return;
    }
    await sealPass(battle, primary, primary, appUrl);
    return;
  }

  if (failed) {
    if (battle.healerAttempts >= MAX_ATTEMPTS) {
      await logBattle(battle.id, "referee", `Re-verification failed after ${MAX_ATTEMPTS} repair attempts. ${describe(failed)}. Escalating.`, {
        state: "BLOCKED_NEEDS_HUMAN",
        afterRunId: failed.id,
      });
      return;
    }
    await logBattle(battle.id, "referee", `Re-verification failed. ${describe(failed)}.`, { afterRunId: failed.id });
    await healBattle(battle.id, failed.id, appUrl).catch((err) => healError(battle.id, err));
    return;
  }
  const [before] = battle.beforeRunId
    ? await db.select().from(kaneRuns).where(eq(kaneRuns.id, battle.beforeRunId))
    : [primary];
  await sealPass(battle, before || primary, primary, appUrl);
}

async function healError(battleId: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  await logBattle(battleId, "blue", `Healer could not run: ${message}`, { errorMessage: message });
}

async function sealPass(battle: BattleRow, before: RunRow, after: RunRow, appUrl: string) {
  await logBattle(battle.id, "referee", `Exit code 0 on every target. ${shortId("RUN", after.id)} verified the build.`, {
    state: "REFEREE_PASS",
    afterRunId: after.id,
    beforeRunId: battle.beforeRunId || before.id,
    errorMessage: null,
  });
  if (!battle.healerAttempts) return; // nothing was healed, so there is no incident to write up
  try {
    await publishPostmortem(battle.id, appUrl);
  } catch (err) {
    await logBattle(battle.id, "publisher", `Post-mortem not published: ${err instanceof Error ? err.message : err}`);
  }
}

async function commentOnPr(battle: BattleRow, repoUrl: string, failed: RunRow, appUrl: string) {
  if (!battle.prNumber || !cfg().githubToken) return;
  const [ev] = await db.select().from(evidenceArtifacts).where(eq(evidenceArtifacts.runId, failed.id));
  const shot = ev?.annotatedScreenshots.find((s) => s.step === ev.failingStepIndex) || ev?.annotatedScreenshots.at(-1);
  const bad = (ev?.networkLogSlice || []).filter((n) => Number(n.status) >= 400).slice(0, 5);
  const body = [
    `### CHAOS-PACT: verification failed`,
    `Kane CLI exited \`${failed.exitCode}\`${failed.resultCode ? ` with result_code \`${failed.resultCode}\`` : ""} on ${platformNames[failed.targetPlatform] || failed.targetPlatform}.`,
    failed.oneLiner || failed.summary ? `> ${failed.oneLiner || failed.summary}` : "",
    bad.length ? `**Network**\n${bad.map((n) => `- \`${n.method || "GET"} ${n.url || n.path || ""}\` returned ${n.status}`).join("\n")}` : "",
    ev?.consoleLogSlice.length ? `**Console**\n${ev.consoleLogSlice.slice(0, 5).map((c) => `- ${String(c.text || c.message || JSON.stringify(c)).slice(0, 200)}`).join("\n")}` : "",
    shot ? `![Failing step](${shot.url})` : "",
    `[Open the battle and trigger the Blue-Team repair](${appUrl}/#/arena?id=${battle.id})`,
  ]
    .filter(Boolean)
    .join("\n\n");
  try {
    await new GitHub(repoUrl).comment(battle.prNumber, body);
    await logBattle(battle.id, "system", `Posted failure summary on PR #${battle.prNumber}.`);
  } catch (err) {
    await logBattle(battle.id, "system", `Could not comment on PR #${battle.prNumber}: ${err instanceof Error ? err.message : err}`);
  }
}

/* ------------------- Stage 4: Blue-team repair with anti-cheat ------------------- */

export async function healBattle(battleId: string, failedRunId: string, appUrl: string, feedback = ""): Promise<void> {
  const { battle, project } = await loadBattle(battleId);
  need(["REFEREE_FAIL", "HEALING", "ANTI_CHEAT_AUDIT"].includes(battle.state), 409, `Battle is ${battle.state}; there is no failing verdict to heal.`);
  need(battle.branch, 409, "This battle has no branch to patch.");
  need(battle.branch !== project.defaultBranch, 409, "Refusing to patch the default branch.");
  if (battle.healerAttempts >= MAX_ATTEMPTS) {
    await logBattle(battleId, "blue", `Attempt limit (${MAX_ATTEMPTS}) reached. Escalating to a human.`, { state: "BLOCKED_NEEDS_HUMAN" });
    return;
  }
  const [failed] = await db.select().from(kaneRuns).where(eq(kaneRuns.id, failedRunId));
  need(failed && failed.battleId === battleId, 404, "Failed run not found for this battle.");
  const gh = new GitHub(project.repoUrl);
  const base = battle.baseBranch || project.defaultBranch;
  const attempt = battle.healerAttempts + 1;

  const [ev] = await db.select().from(evidenceArtifacts).where(eq(evidenceArtifacts.runId, failed.id));
  const failedSteps = await db
    .select()
    .from(ndjsonEvents)
    .where(and(eq(ndjsonEvents.runId, failed.id), eq(ndjsonEvents.stepStatus, "failed")));
  const changedFiles = (await gh.compare(base, battle.branch!)).filter((f) => f.status !== "removed").slice(0, 6);
  need(changedFiles.length, 422, `No differences between ${base} and ${battle.branch}; nothing to repair.`);
  const sources = await Promise.all(
    changedFiles.map(async (f) => ({ path: f.filename, patch: f.patch || "", ...(await gh.file(f.filename, battle.branch!)) })),
  );
  await logBattle(battleId, "blue", `Attempt ${attempt}/${MAX_ATTEMPTS}: diagnosing ${shortId("RUN", failed.id)} from ${ev ? "the unpacked evidence pack" : "the NDJSON stream (no evidence pack was uploaded)"}.`, {
    state: "HEALING",
    healerAttempts: attempt,
    errorMessage: null,
  });

  const evidence = {
    objective: failed.objective,
    exit_code: failed.exitCode,
    result_code: failed.resultCode,
    verdict: failed.bugVerdictJson,
    summary: failed.summary,
    reason: failed.reason,
    failed_steps: failedSteps.map((s) => ({ step: s.stepIndex, remark: s.remark })),
    failing_step_index: ev?.failingStepIndex,
    failure_yaml: ev?.failureYamlJson,
    network_errors: (ev?.networkLogSlice || []).filter((n) => Number(n.status) >= 400).slice(0, 15),
    console: (ev?.consoleLogSlice || []).slice(0, 15),
  };
  const proposal = await chatJson<{ files: { path: string; content: string }[]; rationale: string }>(
    "You are the Blue-Team Auto-Healer in CHAOS-PACT. Kane CLI, an independent browser referee, failed a build. Using its evidence and the diff that introduced the regression, repair the root cause in the application source with the smallest possible change. Hard rules, enforced by an audit: do not modify tests, _test.md specs or assurance files; do not delete validation or error handling; do not hardcode values the test observes; only edit the files provided. Respond with JSON: {\"files\": [{\"path\": string, \"content\": string (complete new file)}], \"rationale\": string}.",
    `Referee evidence:\n${JSON.stringify(evidence, null, 2)}\n\nDiff that introduced the regression (${base}...${battle.branch}):\n${sources.map((s) => s.patch).join("\n")}\n\nCurrent files:\n${sources.map((s) => `=== ${s.path} ===\n${s.content}`).join("\n\n")}${feedback ? `\n\nYour previous patch was rejected by the anti-cheat audit: ${feedback}` : ""}`,
  );
  const proposed = Array.isArray(proposal.files) ? proposal.files.filter((f) => f && typeof f.path === "string" && typeof f.content === "string") : [];
  const patch: (PatchFile & { sha?: string })[] = proposed.map((f) => {
    const src = sources.find((s) => s.path === f.path);
    return { path: f.path, before: src?.content ?? "", after: f.content, sha: src?.sha };
  });
  const diff = patch.map((f) => unifiedDiff(f.path, f.before, f.after)).filter(Boolean).join("\n");
  const fixtureValues = [
    ...Object.values(failed.finalStateJson || {}),
    ...Object.values(failed.variablesJson || {}).map((v) => (v && typeof v === "object" ? (v as { value?: unknown }).value : v)),
  ].filter((v): v is string | number => typeof v === "string" || typeof v === "number").map(String);
  const audit = auditPatch({
    files: patch,
    scopeDirs: [...new Set(sources.flatMap((s) => [s.path, dirOf(s.path)]).filter(Boolean))],
    fixtureValues,
    regressionLines: sources.flatMap((s) => s.patch.split("\n").filter((l) => /^\+[^+]/.test(l)).map((l) => l.slice(1))),
  });
  await logBattle(battleId, "audit", audit.passed ? `Patch-intent audit passed (${audit.checks.length} checks). ${String(proposal.rationale || "").slice(0, 240)}` : `Patch rejected: ${audit.notes}`, {
    state: "ANTI_CHEAT_AUDIT",
    healerPatchDiff: diff || null,
    antiCheatPassed: audit.passed,
    antiCheatNotes: audit.notes,
    antiCheatChecks: audit.checks,
  });
  if (!audit.passed) {
    if (attempt >= MAX_ATTEMPTS) {
      await logBattle(battleId, "blue", `No acceptable patch after ${MAX_ATTEMPTS} attempts. Escalating to a human.`, { state: "BLOCKED_NEEDS_HUMAN" });
      return;
    }
    return healBattle(battleId, failedRunId, appUrl, audit.notes);
  }
  let commitSha = battle.commitSha;
  for (const f of patch.filter((p) => p.before !== p.after && p.sha))
    commitSha = await gh.putFile(f.path, f.after, `fix(chaos-pact): blue-team repair attempt ${attempt}`, battle.branch!, f.sha!);
  await logBattle(battleId, "blue", `Committed repair to ${battle.branch} (${commitSha?.slice(0, 7)}). Requesting re-verification.`, {
    state: "HEALING",
    commitSha,
  });
  await triggerRuns(
    {
      projectId: project.id,
      battleId,
      role: "after",
      attempt,
      trigger: "arena",
      name: `Re-verify: ${failed.name.replace(/^(Referee|Re-verify): /, "")}`,
      objective: failed.objective || battle.objective || undefined,
      testmdPath: failed.testmdPath || undefined,
      surface: failed.testmdPath && !failed.objective ? failed.surface : undefined,
      targetUrl: failed.targetUrl || battle.targetUrl || undefined,
      targets: battle.targets.length ? battle.targets : [failed.targetPlatform],
      commitSha: commitSha || undefined,
      repoRef: battle.branch!,
      deployWaitS: cfg().deployWaitS,
      variables: failed.variablesJson || undefined,
    },
    appUrl,
  );
}

/* ---------------------- Stage 5/6: Receipt + post-mortem ---------------------- */

const slugify = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export async function publishPostmortem(battleId: string, appUrl: string) {
  const { battle, project } = await loadBattle(battleId);
  need(["REFEREE_PASS", "PUBLISHED"].includes(battle.state) && battle.afterRunId, 409, "A post-mortem needs a battle that Kane CLI re-verified to exit code 0.");
  const runIds = [battle.beforeRunId, battle.afterRunId].filter((v): v is string => !!v);
  const runs = await db.select().from(kaneRuns).where(inArray(kaneRuns.id, runIds));
  const evidence = await db.select().from(evidenceArtifacts).where(inArray(evidenceArtifacts.runId, runIds));
  const before = runs.find((r) => r.id === battle.beforeRunId);
  const after = runs.find((r) => r.id === battle.afterRunId)!;
  const evBefore = evidence.find((e) => e.runId === battle.beforeRunId);
  const evAfter = evidence.find((e) => e.runId === battle.afterRunId);

  const payload =
    battle.receiptPayload ||
    ({
      battleId,
      beforeRunId: battle.beforeRunId,
      afterRunId: battle.afterRunId,
      commitSha: battle.commitSha || after.commitSha || null,
      evidenceSha256: evAfter?.packSha256 || null,
      timestamp: new Date().toISOString(),
    } as Record<string, unknown>);
  const hash = signReceipt(payload);
  await db.update(adversarialBattles).set({ receiptPayload: payload, hmacReceiptHash: hash }).where(eq(adversarialBattles.id, battleId));

  const scenario = scenarioNames[battle.saboteurMutationType || ""] || (battle.battleMode === "pr_gate" ? `PR #${battle.prNumber ?? ""} gate` : battle.battleMode);
  const slug = `${slugify(scenario)}-${battle.id.slice(0, 8)}`;
  const title = `${scenario}: caught by Kane CLI, healed in ${battle.healerAttempts} attempt${battle.healerAttempts === 1 ? "" : "s"}`;
  const badNet = (evBefore?.networkLogSlice || []).filter((n) => Number(n.status) >= 400).slice(0, 8);
  const consoleErr = (evBefore?.consoleLogSlice || []).slice(0, 8);
  const shot = (ev?: typeof evBefore, step?: number | null) =>
    ev?.annotatedScreenshots.find((s) => s.step === step)?.url || ev?.annotatedScreenshots.at(-1)?.url || null;
  const beforeShot = shot(evBefore, evBefore?.failingStepIndex);
  const afterShot = shot(evAfter);
  const credits = runs.reduce((n, r) => n + (r.creditsConsumed || 0), 0);
  const tldr = `${project.name}: Kane CLI ${before ? `failed ${shortId("RUN", before.id)} (exit ${before.exitCode}${before.resultCode ? `, result_code ${before.resultCode}` : ""})` : "gated the build"}, the Blue-Team healer patched ${battle.branch}, and ${shortId("RUN", after.id)} re-verified to exit 0.`;
  const fence = (lang: string, body: string) => `\`\`\`${lang}\n${body.replace(/```/g, "'''")}\n\`\`\``;
  const body = [
    `## What broke`,
    battle.saboteurDiff
      ? `The Red-Team saboteur injected **${scenario}** on \`${battle.branch}\`.\n\n${fence("diff", battle.saboteurDiff)}`
      : `A change on \`${battle.branch}\` regressed the guarded flow.`,
    `## What Kane CLI caught`,
    before
      ? `${shortId("RUN", before.id)} on ${platformNames[before.targetPlatform] || before.targetPlatform} exited \`${before.exitCode}\`${before.resultCode ? ` with \`result_code: ${before.resultCode}\`` : ""}.\n\n${before.summary || before.oneLiner || before.reason || ""}`
      : "",
    before?.bugVerdictJson ? fence("json", JSON.stringify(before.bugVerdictJson, null, 2)) : "",
    badNet.length ? `**Network**\n\n${badNet.map((n) => `- \`${n.method || "GET"} ${n.url || n.path || ""}\` returned **${n.status}**`).join("\n")}` : "",
    consoleErr.length ? `**Console**\n\n${consoleErr.map((c) => `- ${String(c.text || c.message || JSON.stringify(c)).slice(0, 240)}`).join("\n")}` : "",
    `## The repair`,
    battle.healerPatchDiff ? fence("diff", battle.healerPatchDiff) : "The build passed without a healer patch.",
    `## Anti-cheat audit`,
    (battle.antiCheatChecks || []).map((c) => `- ${c.passed ? "PASS" : "FAIL"}: **${c.name}**. ${c.detail}`).join("\n") || "No patch was audited.",
    `## Re-verification`,
    `${shortId("RUN", after.id)} exited \`0\` after ${after.stepsDone} completed step${after.stepsDone === 1 ? "" : "s"}. The loop consumed ${credits.toFixed(1)} credits across ${runs.length} referee run${runs.length === 1 ? "" : "s"}.`,
    `## Timeline`,
    battle.log.map((l) => `- \`${l.at.slice(11, 19)} UTC\` **${l.actor}**: ${l.message}`).join("\n"),
  ]
    .filter(Boolean)
    .join("\n\n");
  const url = `${appUrl}/postmortems/${slug}`;
  const share = {
    hn: `Show HN: ${title} ${url}`,
    x: `${title}. Red team broke it, Kane CLI refereed it in a real browser, blue team healed it, HMAC receipt attached. ${url} #KaneCLIHackDay @TestMuAI`,
    reddit: `${title}\n\n${tldr}\n\n${url}`,
    linkedin: `${tldr}\n\nFull evidence-backed post-mortem with a verifiable HMAC receipt: ${url}`,
  };
  const values = {
    battleId,
    slug,
    title,
    summaryTldr: tldr,
    markdownBody: body,
    beforeScreenshotUrl: beforeShot,
    afterScreenshotUrl: afterShot,
    devtoolsProofJson: { network: badNet, console: consoleErr, receipt: { payload, hash } },
    socialShareSnippets: share,
  };
  const [existing] = await db.select().from(publishedPostmortems).where(eq(publishedPostmortems.battleId, battleId));
  const [post] = existing
    ? await db.update(publishedPostmortems).set(values).where(eq(publishedPostmortems.id, existing.id)).returning()
    : await db.insert(publishedPostmortems).values(values).returning();
  await logBattle(battleId, "publisher", `Signed HMAC-SHA256 receipt ${hash.slice(0, 12)}… and drafted ${url}.`);
  await selfVerify(post.id, appUrl);
  return post;
}

/** Layer 3: Kane CLI verifies the published article before it is stamped. */
export async function selfVerify(postmortemId: string, appUrl: string) {
  const [post] = await db.select().from(publishedPostmortems).where(eq(publishedPostmortems.id, postmortemId));
  need(post, 404, "Post-mortem not found.");
  const { battle } = await loadBattle(post.battleId);
  const url = `${appUrl}/postmortems/${post.slug}`;
  const [run] = await triggerRuns(
    {
      projectId: battle.projectId,
      battleId: battle.id,
      role: "self_verify",
      trigger: "self_verify",
      name: `Self-verify: /postmortems/${post.slug}`,
      objective: `Open ${url}. Assert that the page request returned HTTP status 200. Assert that every image on the page loaded with HTTP status 200. Assert that there are zero browser console errors. Assert that the text "HMAC receipt valid" is visible on the page.`,
      targetUrl: url,
      targets: ["desktop_web"],
      bugDetectionMode: "off",
      timeoutS: 90,
    },
    appUrl,
  );
  await db
    .update(publishedPostmortems)
    .set({ selfVerifiedRunId: run.id, status: "awaiting_verification", publishedAt: null })
    .where(eq(publishedPostmortems.id, post.id));
  return run;
}

export async function onSelfVerify(run: RunRow) {
  const [post] = await db.select().from(publishedPostmortems).where(eq(publishedPostmortems.selfVerifiedRunId, run.id));
  if (!post) return;
  if (run.status === "passed") {
    await db.update(publishedPostmortems).set({ status: "published", publishedAt: new Date() }).where(eq(publishedPostmortems.id, post.id));
    await logBattle(post.battleId, "publisher", `Kane CLI verified /postmortems/${post.slug} (exit 0). Article stamped as self-verified.`, { state: "PUBLISHED" });
  } else {
    await logBattle(post.battleId, "publisher", `Self-verification of /postmortems/${post.slug} did not pass (exit ${run.exitCode}). ${run.errorMessage || run.oneLiner || ""}`.trim());
  }
}

export { HttpError };
