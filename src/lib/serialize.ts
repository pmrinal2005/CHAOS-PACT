import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  adversarialBattles,
  evidenceArtifacts,
  kaneRuns,
  projects,
  publishedPostmortems,
  teamMembers,
  workspaceSettings,
  type BattleRow,
  type EventRow,
  type EvidenceRow,
  type PostmortemRow,
  type ProjectRow,
  type RunRow,
} from "@/db/schema";
import { cfg } from "./config";
import { llmProvider, parseRepo } from "./integrations";
import { coveragePct } from "./requirements";
import {
  shortId,
  type BattleDTO,
  type EventDTO,
  type EvidenceDTO,
  type PostmortemDTO,
  type ProjectDTO,
  type RunDTO,
  type RunDisplay,
  type SystemStatus,
  type WorkspaceDTO,
} from "./types";

export const toProject = (p: ProjectRow): ProjectDTO => ({
  id: p.id,
  name: p.name,
  repo: parseRepo(p.repoUrl)?.full || p.repoUrl,
  repoUrl: p.repoUrl,
  branch: p.defaultBranch,
  staging: p.stagingUrl,
  production: p.prodUrl,
  previewUrlTemplate: p.previewUrlTemplate || "",
  spec: p.specFilename || "",
  requirements: p.requirementsJson,
  covered: p.requirementsJson.filter((r) => r.trust === "trusted").length,
  coveragePct: coveragePct(p.requirementsJson),
  mode: p.executionMode,
  archived: p.archived,
  createdAt: p.createdAt.getTime(),
});

export const toRun = (
  r: RunRow,
  evidence?: { screenshots: { url: string }[] } | null,
): RunDTO => {
  const display: RunDisplay =
    r.status === "passed" && r.role === "after" ? "healed" : (r.status as RunDisplay);
  return {
    id: r.id,
    label: shortId("RUN", r.id),
    projectId: r.projectId,
    battleId: r.battleId,
    name: r.name,
    objective: r.objective,
    testmdPath: r.testmdPath,
    surface: r.surface,
    platform: r.targetPlatform,
    status: r.status,
    display,
    exitCode: r.exitCode,
    resultCode: r.resultCode,
    verdict: r.bugVerdictJson,
    finalState: r.finalStateJson,
    credits: r.creditsConsumed ?? 0,
    duration: r.durationS ?? 0,
    sha: r.commitSha,
    at: r.startedAt.getTime(),
    completedAt: r.completedAt?.getTime() ?? null,
    review: r.status === "failed" && !r.reviewed,
    testManagerUrl: r.testManagerUrl,
    targetUrl: r.targetUrl,
    summary: r.summary,
    oneLiner: r.oneLiner,
    reason: r.reason,
    error: r.errorMessage,
    role: r.role,
    attempt: r.attempt,
    trigger: r.trigger,
    requirementId: r.requirementId,
    stepsDone: r.stepsDone,
    stepsFailed: r.stepsFailed,
    cliVersion: r.cliVersion,
    warnings: r.warningsJson || [],
    assurance: r.assuranceJson,
    stderrTail: r.stderrTail,
    hasEvidence: !!evidence,
    thumb: evidence?.screenshots.at(-1)?.url ?? null,
  };
};

export const toEvent = (e: EventRow): EventDTO => ({
  seq: e.seqNo,
  type: e.eventType,
  step: e.stepIndex,
  childId: e.childId,
  stepStatus: e.stepStatus,
  remark: e.remark,
  payload: e.rawPayload,
  at: e.emittedAt.getTime(),
});

export const toEvidence = (e: EvidenceRow): EvidenceDTO => ({
  runId: e.runId,
  packUrl: e.packStoragePath,
  packSha256: e.packSha256,
  packBytes: e.packBytes,
  validationExitCode: e.validationExitCode,
  policyVerdict: e.policyVerdictJson,
  failingStep: e.failingStepIndex,
  failure: e.failureYamlJson,
  screenshots: e.annotatedScreenshots,
  network: e.networkLogSlice,
  console: e.consoleLogSlice,
  devtools: e.devtoolsAssertionsSummary,
});

export const toBattle = (b: BattleRow): BattleDTO => ({
  id: b.id,
  label: shortId("BTL", b.id),
  projectId: b.projectId,
  mode: b.battleMode,
  state: b.state,
  scenario: b.saboteurMutationType,
  saboteurDiff: b.saboteurDiff,
  attempts: b.healerAttempts,
  healerDiff: b.healerPatchDiff,
  antiCheatPassed: b.antiCheatPassed,
  antiCheatNotes: b.antiCheatNotes,
  antiCheatChecks: b.antiCheatChecks || [],
  beforeRunId: b.beforeRunId,
  afterRunId: b.afterRunId,
  receiptHash: b.hmacReceiptHash,
  branch: b.branch,
  baseBranch: b.baseBranch,
  targetUrl: b.targetUrl,
  objective: b.objective,
  targets: b.targets,
  prNumber: b.prNumber,
  error: b.errorMessage,
  log: b.log,
  at: b.createdAt.getTime(),
  updatedAt: b.updatedAt.getTime(),
});

export const toPostmortem = (p: PostmortemRow, projectId: string): PostmortemDTO => ({
  id: p.id,
  battleId: p.battleId,
  projectId,
  slug: p.slug,
  title: p.title,
  tldr: p.summaryTldr,
  body: p.markdownBody,
  beforeShot: p.beforeScreenshotUrl,
  afterShot: p.afterScreenshotUrl,
  status: p.status,
  selfVerifiedRunId: p.selfVerifiedRunId,
  share: p.socialShareSnippets || {},
  createdAt: p.createdAt.getTime(),
  publishedAt: p.publishedAt?.getTime() ?? null,
});

export function systemStatus(
  appUrl: string,
  workerReport: SystemStatus["workerReport"],
): SystemStatus {
  const c = cfg();
  return {
    worker: !!(c.workerUrl && c.workerSecret),
    appUrl,
    hmac: !!c.hmacSecret,
    github: !!c.githubToken,
    githubWebhook: !!c.githubWebhookSecret,
    llm: llmProvider(),
    rateLimitPerHour: c.rateLimitPerHour,
    workerReport,
  };
}

/** Everything the workspace shell needs, in one round trip. */
export async function loadWorkspace(appUrl: string): Promise<WorkspaceDTO> {
  const [projectRows, runRows, battleRows, postRows, members, settingRows, [usage], evidenceRows] =
    await Promise.all([
      db.select().from(projects).orderBy(projects.createdAt),
      db.select().from(kaneRuns).orderBy(desc(kaneRuns.startedAt)).limit(600),
      db.select().from(adversarialBattles).orderBy(desc(adversarialBattles.createdAt)).limit(200),
      db
        .select({ post: publishedPostmortems, projectId: adversarialBattles.projectId })
        .from(publishedPostmortems)
        .innerJoin(adversarialBattles, eq(adversarialBattles.id, publishedPostmortems.battleId))
        .orderBy(desc(publishedPostmortems.createdAt)),
      db.select().from(teamMembers).orderBy(teamMembers.createdAt),
      db.select().from(workspaceSettings),
      db
        .select({ consumed: sql<number>`coalesce(sum(${kaneRuns.creditsConsumed}), 0)::float` })
        .from(kaneRuns),
      db
        .select({ runId: evidenceArtifacts.runId, screenshots: evidenceArtifacts.annotatedScreenshots })
        .from(evidenceArtifacts),
    ]);
  const evidenceByRun = new Map(evidenceRows.map((e) => [e.runId, e]));
  const settings = Object.fromEntries(settingRows.map((s) => [s.key, s.value]));
  const report = (settings.worker_report as SystemStatus["workerReport"]) || null;
  delete settings.worker_report;
  return {
    projects: projectRows.map(toProject),
    runs: runRows.map((r) => toRun(r, evidenceByRun.get(r.id))),
    battles: battleRows.map(toBattle),
    postmortems: postRows.map((r) => toPostmortem(r.post, r.projectId)),
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      at: m.createdAt.getTime(),
    })),
    settings,
    system: systemStatus(appUrl, report),
    credits: {
      consumed: usage.consumed,
      budget: Number(settings.credit_budget) || cfg().creditBudget,
      reportedBalance: typeof report?.balance === "number" ? report.balance : null,
    },
  };
}
