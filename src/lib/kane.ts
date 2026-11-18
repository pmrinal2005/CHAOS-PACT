import { and, count, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  adversarialBattles,
  evidenceArtifacts,
  kaneRuns,
  ndjsonEvents,
  projects,
  workspaceSettings,
  type RunRow,
} from "@/db/schema";
import { cfg, HttpError, need } from "./config";
import { coveragePct } from "./requirements";
import type { BattleLogEntry, JsonMap } from "./types";

export type TriggerInput = {
  projectId: string;
  name?: string;
  objective?: string;
  testmdPath?: string;
  testmdContent?: string;
  surface?: string;
  targets: string[];
  bugDetectionMode?: string;
  variables?: JsonMap;
  targetUrl?: string;
  battleId?: string;
  role?: string;
  attempt?: number;
  trigger?: string;
  requirementId?: string;
  commitSha?: string;
  repoRef?: string;
  tags?: string;
  parallel?: number;
  timeoutS?: number;
  deployWaitS?: number;
  assurance?: boolean;
  requesterHash?: string;
};

export async function setSetting(key: string, value: unknown) {
  await db
    .insert(workspaceSettings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: workspaceSettings.key,
      set: { value, updatedAt: new Date() },
    });
}
export async function getSetting<T>(key: string): Promise<T | null> {
  const [row] = await db
    .select()
    .from(workspaceSettings)
    .where(eq(workspaceSettings.key, key));
  return row ? (row.value as T) : null;
}

export async function logBattle(
  battleId: string,
  actor: BattleLogEntry["actor"],
  message: string,
  patch: Partial<typeof adversarialBattles.$inferInsert> = {},
) {
  const entry: BattleLogEntry[] = [
    { at: new Date().toISOString(), actor, message },
  ];
  await db
    .update(adversarialBattles)
    .set({
      ...patch,
      updatedAt: new Date(),
      log: sql`${adversarialBattles.log} || ${JSON.stringify(entry)}::jsonb`,
    })
    .where(eq(adversarialBattles.id, battleId));
}

/** Per-requester rate limit and credit guard for operator-triggered runs. */
export async function enforceRunGuards(requester: string, runs: number) {
  const { rateLimitPerHour } = cfg();
  const [{ n }] = await db
    .select({ n: count() })
    .from(kaneRuns)
    .where(
      and(
        eq(kaneRuns.requesterHash, requester),
        eq(kaneRuns.trigger, "manual"),
        gte(kaneRuns.startedAt, new Date(Date.now() - 3600_000)),
      ),
    );
  if (n + runs > rateLimitPerHour)
    throw new HttpError(
      429,
      `Rate limit reached: ${rateLimitPerHour} live runs per hour. Replay a sealed run instead, or try again later.`,
    );
  const report = await getSetting<{ balance?: number | null }>("worker_report");
  if (report && typeof report.balance === "number" && report.balance < 1)
    throw new HttpError(429, "The TestMu AI credit balance is exhausted.");
}

async function failSetup(runId: string, message: string, appUrl: string) {
  await db
    .update(kaneRuns)
    .set({
      status: "error",
      exitCode: 2,
      errorMessage: message,
      completedAt: new Date(),
    })
    .where(eq(kaneRuns.id, runId));
  await onRunCompleted(runId, appUrl);
}

/** Creates one kane_runs row per target and dispatches each to the cloud worker. */
export async function triggerRuns(
  input: TriggerInput,
  appUrl: string,
): Promise<RunRow[]> {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, input.projectId));
  need(project, 404, "Project not found.");
  need(
    project.id !== "c0aa5000-0000-4000-8000-000000000001",
    409,
    "This is a sample replay project. Connect your own project to execute a live verification.",
  );
  const c = cfg();
  if (c.workerUrl) {
    need(
      process.env.WORKSPACE_PASSWORD,
      403,
      "Protect the workspace before connecting a live worker.",
    );
    need(
      c.appUrl,
      503,
      "APP_BASE_URL is required for trusted worker callbacks.",
    );
    appUrl = c.appUrl;
  }
  const created: RunRow[] = [];
  for (const platform of input.targets) {
    const baseSurface =
      input.surface ||
      (input.testmdPath || input.testmdContent ? "testmd" : "run");
    // Cloud-grid devices are only reachable through `testrun run --remote`.
    const surface =
      platform === "remote_pixel_7" || platform === "ios_simulator"
        ? "testrun"
        : baseSurface;
    const targetUrl = input.targetUrl || project.stagingUrl;
    const [run] = await db
      .insert(kaneRuns)
      .values({
        projectId: project.id,
        battleId: input.battleId,
        surface,
        targetPlatform: platform,
        commitSha: input.commitSha,
        name:
          input.name ||
          input.testmdPath ||
          (input.objective || "Kane CLI run").split(/[.\n]/)[0].slice(0, 90),
        objective: input.objective,
        testmdPath: input.testmdPath,
        testmdContent: input.testmdContent,
        targetUrl,
        bugDetectionMode: input.bugDetectionMode || "continue",
        variablesJson: input.variables,
        trigger: input.trigger || "manual",
        role: input.role,
        attempt: input.attempt ?? 0,
        requirementId: input.requirementId,
        requesterHash: input.requesterHash,
      })
      .returning();
    created.push(run);

    if (!c.workerUrl || !c.workerSecret) {
      await failSetup(
        run.id,
        "No execution worker is configured. Set KANE_WORKER_URL and WORKER_SHARED_SECRET to dispatch live Kane CLI runs.",
        appUrl,
      );
      continue;
    }
    const job = {
      runId: run.id,
      callbackUrl: `${appUrl}/api/worker/events`,
      surface,
      platform,
      objective: input.objective,
      url: targetUrl,
      testmdPath: input.testmdPath,
      testmdContent: input.testmdContent,
      tags: input.tags,
      parallel: input.parallel,
      bugDetection: input.bugDetectionMode || "continue",
      variables: input.variables,
      timeoutS: input.timeoutS || 180,
      repo: {
        url: project.repoUrl,
        ref: input.repoRef || input.commitSha || project.defaultBranch,
      },
      deployWaitS: input.deployWaitS || 0,
      assurance: !!input.assurance,
      policyId: c.policyId || undefined,
    };
    try {
      const res = await fetch(`${c.workerUrl}/jobs`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${c.workerSecret}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(job),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        await failSetup(
          run.id,
          `The execution worker rejected the job (HTTP ${res.status}): ${(await res.text()).slice(0, 200)}`,
          appUrl,
        );
        continue;
      }
      await db
        .update(kaneRuns)
        .set({ status: "running" })
        .where(and(eq(kaneRuns.id, run.id), eq(kaneRuns.status, "queued")));
    } catch (err) {
      await failSetup(
        run.id,
        `The execution worker is unreachable: ${err instanceof Error ? err.message : "network error"}`,
        appUrl,
      );
    }
  }
  return db
    .select()
    .from(kaneRuns)
    .where(
      inArray(
        kaneRuns.id,
        created.map((r) => r.id),
      ),
    );
}

/** Classifies one stdout line per the Kane CLI stream contract (v1). */
export function classifyEvent(payload: JsonMap) {
  const typed = typeof payload.type === "string";
  const progress =
    !typed &&
    typeof payload.step === "number" &&
    ["running", "done", "failed"].includes(String(payload.status));
  return {
    eventType: typed
      ? (payload.type as string)
      : progress
        ? "progress"
        : "unknown",
    stepIndex: typeof payload.step === "number" ? payload.step : null,
    childId: typeof payload.child_id === "string" ? payload.child_id : null,
    stepStatus:
      progress && typeof payload.status === "string" ? payload.status : null,
    remark:
      typeof payload.remark === "string"
        ? payload.remark
        : typeof payload.message === "string"
          ? payload.message
          : typeof payload.one_liner === "string"
            ? payload.one_liner
            : null,
  };
}

const num = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;
const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);

/** Extracts run fields from surface-specific events. */
function eventPatch(p: JsonMap): Partial<typeof kaneRuns.$inferInsert> {
  switch (p.type) {
    case "stream_start":
      return { cliVersion: str(p.cli_version) };
    case "run_end":
      return {
        summary: str(p.summary),
        oneLiner: str(p.one_liner),
        reason: str(p.reason),
        durationS: num(p.duration),
        creditsConsumed: num(p.credits_consumed) ?? num(p.credits),
        finalStateJson: (p.final_state as JsonMap) || undefined,
        testManagerUrl: str(p.test_url),
        resultCode: str(p.result_code),
        bugVerdictJson: (p.verdict as JsonMap) || undefined,
      };
    case "test_md_done":
      return {
        durationS: num(p.duration_s),
        testManagerUrl: str(p.share_url),
        oneLiner: str(p.overall_status)
          ? `testmd ${p.overall_status}`
          : undefined,
      };
    case "testrun_done":
    case "remote_done":
    case "done":
      return { durationS: num(p.duration_s) ?? num(p.duration) };
    case "error":
      return { errorMessage: str(p.message) };
    default:
      return {};
  }
}

export type WorkerReport = {
  runId: string;
  events?: { seq: number; payload: JsonMap; ts?: string }[];
  preflight?: {
    cliVersion?: string;
    whoami?: string;
    balance?: number | null;
    authenticated?: boolean;
  };
  final?: {
    exitCode: number | null;
    error?: string;
    stderrTail?: string;
    assurance?: JsonMap;
    evidence?: {
      packUrl?: string | null;
      packSha256?: string | null;
      packBytes?: number | null;
      validationExitCode?: number | null;
      policyVerdict?: JsonMap | null;
      failingStepIndex?: number | null;
      failure?: JsonMap | null;
      screenshots?: { step: number; url: string; annotated: boolean }[];
      network?: JsonMap[];
      console?: JsonMap[];
      devtools?: JsonMap | null;
    } | null;
  };
};

/** Persists a batch of worker output and finalises the run when it exits. */
export async function ingestWorkerReport(body: WorkerReport, appUrl: string) {
  const [run] = await db
    .select()
    .from(kaneRuns)
    .where(eq(kaneRuns.id, body.runId));
  need(run, 404, "Run not found.");
  if (run.completedAt) return; // A terminal ledger entry cannot be reopened by a late callback.
  if (body.preflight)
    await setSetting("worker_report", { ...body.preflight, at: Date.now() });

  const events = (body.events || []).filter(
    (e) =>
      e &&
      Number.isInteger(e.seq) &&
      e.payload &&
      typeof e.payload === "object",
  );
  if (events.length) {
    const inserted = await db
      .insert(ndjsonEvents)
      .values(
        events.map((e) => ({
          runId: run.id,
          seqNo: e.seq,
          rawPayload: e.payload,
          emittedAt: new Date(
            Date.parse(str(e.payload.ts) || e.ts || "") || Date.now(),
          ),
          ...classifyEvent(e.payload),
        })),
      )
      .onConflictDoNothing()
      .returning({ payload: ndjsonEvents.rawPayload });
    let patch: Partial<typeof kaneRuns.$inferInsert> = {};
    const warnings: JsonMap[] = [];
    for (const e of inserted) {
      const next = eventPatch(e.payload);
      for (const [k, v] of Object.entries(next))
        if (v !== undefined) patch = { ...patch, [k]: v };
      if (e.payload.type === "warning") warnings.push(e.payload);
    }
    // Count completions, never the highest step index (bifurcation offsets it).
    const [steps] = await db
      .select({
        done: sql<number>`count(*) filter (where ${ndjsonEvents.stepStatus} = 'done')::int`,
        failed: sql<number>`count(*) filter (where ${ndjsonEvents.stepStatus} = 'failed')::int`,
      })
      .from(ndjsonEvents)
      .where(eq(ndjsonEvents.runId, run.id));
    await db
      .update(kaneRuns)
      .set({
        ...patch,
        stepsDone: steps.done,
        stepsFailed: steps.failed,
        ...(warnings.length
          ? {
              warningsJson: sql`coalesce(${kaneRuns.warningsJson}, '[]'::jsonb) || ${JSON.stringify(warnings)}::jsonb`,
            }
          : {}),
        ...(run.status === "queued" ? { status: "running" } : {}),
      })
      .where(eq(kaneRuns.id, run.id));
  }

  if (!body.final || run.completedAt) return;
  const f = body.final;
  // The process exit code is authoritative: 0 pass, 1 fail, 2 infra, 3 timeout.
  const status =
    f.exitCode === 0
      ? "passed"
      : f.exitCode === 1
        ? "failed"
        : f.exitCode === 3
          ? "timeout"
          : "error";
  const completedAt = new Date();
  const finalized = await db.transaction(async (tx) => {
    const [fresh] = await tx
      .select()
      .from(kaneRuns)
      .where(eq(kaneRuns.id, run.id))
      .for("update");
    if (fresh.completedAt) return false;
    await tx
      .update(kaneRuns)
      .set({
        status,
        exitCode:
          f.exitCode !== null && [0, 1, 2, 3].includes(f.exitCode)
            ? f.exitCode
            : 2,
        completedAt,
        durationS:
          fresh.durationS ??
          (completedAt.getTime() - run.startedAt.getTime()) / 1000,
        stderrTail: f.stderrTail?.slice(-4000),
        assuranceJson: f.assurance,
        errorMessage:
          status === "error" || status === "timeout"
            ? f.error ||
              fresh.errorMessage ||
              (status === "timeout"
                ? "Kane CLI timed out or was cancelled (exit 3)."
                : "Kane CLI reported an auth, setup or infrastructure error (exit 2).")
            : fresh.errorMessage,
      })
      .where(eq(kaneRuns.id, run.id));
    if (f.evidence) {
      const ev = f.evidence;
      const values = {
        runId: run.id,
        packStoragePath: ev.packUrl || null,
        packSha256: ev.packSha256 || null,
        packBytes: ev.packBytes ?? null,
        validationExitCode: ev.validationExitCode ?? null,
        policyVerdictJson: ev.policyVerdict || null,
        failingStepIndex: ev.failingStepIndex ?? null,
        failureYamlJson: ev.failure || null,
        annotatedScreenshots: ev.screenshots || [],
        networkLogSlice: (ev.network || []).slice(0, 400),
        consoleLogSlice: (ev.console || []).slice(0, 400),
        devtoolsAssertionsSummary: ev.devtools || null,
      };
      await tx
        .insert(evidenceArtifacts)
        .values(values)
        .onConflictDoUpdate({ target: evidenceArtifacts.runId, set: values });
    }
    return true;
  });
  if (finalized) await onRunCompleted(run.id, appUrl);
}

/** Fan-out after any run reaches a terminal state. */
export async function onRunCompleted(runId: string, appUrl: string) {
  const [run] = await db.select().from(kaneRuns).where(eq(kaneRuns.id, runId));
  if (!run) return;
  if (run.requirementId && run.status === "passed") {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, run.projectId));
    if (project) {
      const requirements = project.requirementsJson.map((r) =>
        r.id === run.requirementId
          ? { ...r, trust: "trusted" as const, lastRunId: run.id }
          : r,
      );
      await db
        .update(projects)
        .set({
          requirementsJson: requirements,
          assuranceCoveragePct: coveragePct(requirements),
        })
        .where(eq(projects.id, project.id));
    }
  }
  if (!run.battleId || !run.role) return;
  const agents = await import("./agents");
  try {
    if (run.role === "self_verify") await agents.onSelfVerify(run);
    else await agents.advanceBattle(run, appUrl);
  } catch (err) {
    await logBattle(
      run.battleId,
      "system",
      `Loop error: ${err instanceof Error ? err.message : err}`,
      {
        errorMessage: err instanceof Error ? err.message : String(err),
      },
    );
  }
}
