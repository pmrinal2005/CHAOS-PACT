import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  adversarialBattles,
  evidenceArtifacts,
  kaneRuns,
  ndjsonEvents,
  projects,
  type BattleRow,
} from "@/db/schema";
import { auditPatch, unifiedDiff } from "./anticheat";
import { cfg, need } from "./config";
import { chatJson, llmProvider } from "./integrations";
import { logBattle, triggerRuns } from "./kane";
import {
  getLab,
  LAB_BASELINE,
  LAB_FAULTS,
  LAB_FILE,
  labObjective,
  labSource,
  parseLabSource,
  setLab,
  type LabConfig,
} from "./lab";
import { MAX_ATTEMPTS, platformNames, scenarioNames, shortId, type ChaosScenario } from "./types";

/** Lab battles use a virtual branch so every existing guard (never the default branch) still holds. */
export const LAB_BRANCH_PREFIX = "chaos-lab/";
export const isLabBattle = (b: Pick<BattleRow, "branch">) =>
  !!b.branch?.startsWith(LAB_BRANCH_PREFIX);

export const labUrl = (appUrl: string, battleId: string) =>
  `${appUrl}/lab/checkout?battle=${battleId}`;

/** Stage 2 (lab): apply a catalogued, realistic fault to the battle's own lab file and chain the referee. */
export async function startLabSabotage(
  input: { projectId: string; scenario: ChaosScenario; targets?: string[] },
  appUrl: string,
  requester: string,
) {
  const fault = LAB_FAULTS[input.scenario];
  need(fault, 400, "Unknown chaos scenario.");
  const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId));
  need(project, 404, "Project not found.");
  need(
    cfg().workerUrl && cfg().workerSecret,
    503,
    "No execution worker is configured (KANE_WORKER_URL, WORKER_SHARED_SECRET). A battle needs a live Kane CLI referee.",
  );
  const mutated = fault.mutate(LAB_BASELINE);
  const diff = unifiedDiff(LAB_FILE, labSource(LAB_BASELINE), labSource(mutated));
  const targets = input.targets?.length ? input.targets : ["desktop_web"];
  const [battle] = await db
    .insert(adversarialBattles)
    .values({
      projectId: project.id,
      battleMode: input.scenario === "readme_pricing_lie" ? "readme_lie_audit" : "chaos_sabotage",
      state: "SABOTAGE",
      saboteurMutationType: input.scenario,
      saboteurDiff: diff,
      baseBranch: "chaos-lab/baseline",
      targets,
    })
    .returning();
  const branch = `${LAB_BRANCH_PREFIX}battle-${battle.id.slice(0, 8)}`;
  await setLab(battle.id, { scenario: input.scenario, baseline: LAB_BASELINE, config: mutated, revision: 1 });
  const targetUrl = labUrl(appUrl, battle.id);
  const objective = labObjective(input.scenario, targetUrl, mutated);
  await logBattle(
    battle.id,
    "red",
    `Injected ${scenarioNames[input.scenario]} into ${LAB_FILE} on ${branch}: ${fault.describe}`,
    { branch, targetUrl, objective, commitSha: `lab-rev-1` },
  );
  const runs = await triggerRuns(
    {
      projectId: project.id,
      battleId: battle.id,
      role: "before",
      attempt: 0,
      trigger: "arena",
      name: `Referee: ${scenarioNames[input.scenario]} (Chaos Lab)`,
      objective,
      targetUrl,
      targets,
      commitSha: "lab-rev-1",
      requesterHash: requester,
      timeoutS: 240,
    },
    appUrl,
  );
  await logBattle(
    battle.id,
    "referee",
    `Kane CLI dispatched on ${runs.map((r) => platformNames[r.targetPlatform] || r.targetPlatform).join(" + ")} against ${targetUrl}.`,
  );
  return { battleId: battle.id, runIds: runs.map((r) => r.id), targetUrl };
}

/** Rule-based repair: revert exactly the keys the regressing diff changed (a scoped `git revert`). */
function revertRegression(current: LabConfig, baseline: LabConfig, broken: LabConfig): LabConfig {
  const next = structuredClone(current) as Record<string, unknown>;
  for (const k of Object.keys(baseline) as (keyof LabConfig)[])
    if (JSON.stringify(broken[k]) !== JSON.stringify(baseline[k])) next[k] = structuredClone(baseline[k]);
  return next as LabConfig;
}

/** Stage 4 (lab): diagnose from Kane's evidence, patch the lab file, audit, then request re-verification. */
export async function healLab(
  battle: BattleRow,
  failedRunId: string,
  appUrl: string,
  feedback = "",
): Promise<void> {
  if (battle.healerAttempts >= MAX_ATTEMPTS) {
    await logBattle(battle.id, "blue", `Attempt limit (${MAX_ATTEMPTS}) reached. Escalating to a human.`, {
      state: "BLOCKED_NEEDS_HUMAN",
    });
    return;
  }
  const [failed] = await db.select().from(kaneRuns).where(eq(kaneRuns.id, failedRunId));
  need(failed && failed.battleId === battle.id, 404, "Failed run not found for this battle.");
  const lab = await getLab(battle.id);
  const scenario = (lab.scenario || battle.saboteurMutationType) as ChaosScenario;
  const attempt = battle.healerAttempts + 1;
  const [ev] = await db.select().from(evidenceArtifacts).where(eq(evidenceArtifacts.runId, failed.id));
  const failedSteps = await db
    .select()
    .from(ndjsonEvents)
    .where(and(eq(ndjsonEvents.runId, failed.id), eq(ndjsonEvents.stepStatus, "failed")));
  await logBattle(
    battle.id,
    "blue",
    `Attempt ${attempt}/${MAX_ATTEMPTS}: diagnosing ${shortId("RUN", failed.id)} from ${ev ? "the unpacked evidence pack" : "the NDJSON stream"}.`,
    { state: "HEALING", healerAttempts: attempt, errorMessage: null },
  );

  const before = labSource(lab.config);
  const broken = LAB_FAULTS[scenario]?.mutate(lab.baseline) ?? lab.config;
  let after = "";
  let rationale = "";
  let engine = "rule-based (scoped revert of the regressing hunk)";
  if (llmProvider()) {
    try {
      const evidence = {
        objective: failed.objective,
        exit_code: failed.exitCode,
        result_code: failed.resultCode,
        summary: failed.summary,
        one_liner: failed.oneLiner,
        reason: failed.reason,
        failed_steps: failedSteps.map((s) => ({ step: s.stepIndex, remark: s.remark })),
        failure_yaml: ev?.failureYamlJson,
        network_errors: (ev?.networkLogSlice || []).filter((n) => Number(n.status) >= 400).slice(0, 10),
        console: (ev?.consoleLogSlice || []).slice(0, 10),
      };
      const proposal = await chatJson<{ content: string; rationale: string }>(
        'You are the Blue-Team Auto-Healer in CHAOS-PACT. Kane CLI, an independent browser referee, failed the lab checkout. Repair the root cause in the lab configuration file with the smallest change. Hard rules, enforced by an audit: do not weaken what the referee checks, do not hardcode values the test observed, keep the same JSON keys. Respond with JSON: {"content": string (the complete new JSON file), "rationale": string}.',
        `Referee evidence:\n${JSON.stringify(evidence, null, 2)}\n\nDiff that introduced the regression:\n${battle.saboteurDiff}\n\nCurrent ${LAB_FILE}:\n${before}${feedback ? `\n\nYour previous patch was rejected by the anti-cheat audit: ${feedback}` : ""}`,
      );
      const parsed = parseLabSource(String(proposal.content || ""));
      if (parsed) {
        after = labSource(parsed);
        rationale = String(proposal.rationale || "").slice(0, 240);
        engine = `${llmProvider()} model`;
      }
    } catch (err) {
      rationale = `Model unavailable (${err instanceof Error ? err.message.slice(0, 80) : "error"}); fell back to rule-based repair.`;
    }
  }
  if (!after) after = labSource(revertRegression(lab.config, lab.baseline, broken));

  const diff = unifiedDiff(LAB_FILE, before, after);
  const fixtureValues = Object.values(failed.finalStateJson || {})
    .filter((v): v is string | number => typeof v === "string" || typeof v === "number")
    .map(String);
  const audit = auditPatch({
    files: [{ path: LAB_FILE, before, after }],
    scopeDirs: ["lab"],
    fixtureValues,
    regressionLines: (battle.saboteurDiff || "")
      .split("\n")
      .filter((l) => /^\+[^+]/.test(l))
      .map((l) => l.slice(1)),
  });
  // Lab-specific intent check: the repair must restore behaviour, not just silence the referee.
  const repaired = parseLabSource(after);
  const restores =
    !!repaired &&
    (Object.keys(lab.baseline) as (keyof LabConfig)[]).every(
      (k) =>
        JSON.stringify(broken[k]) === JSON.stringify(lab.baseline[k]) ||
        JSON.stringify(repaired[k]) !== JSON.stringify(broken[k]),
    );
  audit.checks.push({
    name: "Regression actually reverted",
    passed: restores,
    detail: restores
      ? "Every field the saboteur changed now differs from the broken value."
      : "At least one field still holds the injected faulty value.",
  });
  const passed = audit.passed && restores;
  const notes = passed ? audit.notes : audit.checks.filter((c) => !c.passed).map((c) => `${c.name}: ${c.detail}`).join(" | ");
  await logBattle(
    battle.id,
    "audit",
    passed
      ? `Patch-intent audit passed (${audit.checks.length} checks). Healer engine: ${engine}. ${rationale}`.trim()
      : `Patch rejected: ${notes}`,
    {
      state: "ANTI_CHEAT_AUDIT",
      healerPatchDiff: diff || null,
      antiCheatPassed: passed,
      antiCheatNotes: notes,
      antiCheatChecks: audit.checks,
    },
  );
  if (!passed) {
    if (attempt >= MAX_ATTEMPTS) {
      await logBattle(battle.id, "blue", `No acceptable patch after ${MAX_ATTEMPTS} attempts. Escalating to a human.`, {
        state: "BLOCKED_NEEDS_HUMAN",
      });
      return;
    }
    const [fresh] = await db.select().from(adversarialBattles).where(eq(adversarialBattles.id, battle.id));
    return healLab(fresh, failedRunId, appUrl, notes);
  }
  const revision = lab.revision + 1;
  await setLab(battle.id, { ...lab, config: repaired!, revision });
  const commitSha = `lab-rev-${revision}`;
  await logBattle(battle.id, "blue", `Applied repair to ${LAB_FILE} (${commitSha}). Requesting re-verification.`, {
    state: "HEALING",
    commitSha,
  });
  await triggerRuns(
    {
      projectId: battle.projectId,
      battleId: battle.id,
      role: "after",
      attempt,
      trigger: "arena",
      name: `Re-verify: ${failed.name.replace(/^(Referee|Re-verify): /, "")}`,
      objective: failed.objective || battle.objective || undefined,
      targetUrl: failed.targetUrl || battle.targetUrl || undefined,
      targets: battle.targets.length ? battle.targets : [failed.targetPlatform],
      commitSha,
      timeoutS: 240,
    },
    appUrl,
  );
}
