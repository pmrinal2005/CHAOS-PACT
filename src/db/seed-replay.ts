import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  projects,
  kaneRuns,
  adversarialBattles,
  ndjsonEvents,
  evidenceArtifacts,
  publishedPostmortems,
  workspaceSettings,
} from "@/db/schema";
import { sampleWorkspace, sampleDetail } from "@/lib/sample-workspace";

let installed: Promise<void> | null = null;
async function seed() {
  if (process.env.WORKSPACE_SAMPLE_DATA === "false") return;
  if ((await db.select({ id: projects.id }).from(projects).limit(1)).length)
    return;
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(27413, 2)`);
    if ((await tx.select({ id: projects.id }).from(projects).limit(1)).length)
      return;
    const [marker] = await tx
      .select()
      .from(workspaceSettings)
      .where(eq(workspaceSettings.key, "sample_installed"));
    if (marker) return; // Deleting the example project must be permanent.
    const demo = sampleWorkspace(),
      p = demo.projects[0];
    await tx
      .insert(projects)
      .values({
        id: p.id,
        name: p.name,
        repoUrl: p.repoUrl,
        stagingUrl: p.staging,
        prodUrl: p.production,
        defaultBranch: p.branch,
        specFilename: p.spec,
        requirementsJson: p.requirements,
        prdMarkdown: p.requirements.map((r) => `- ${r.text}`).join("\n"),
        assuranceCoveragePct: p.coveragePct,
        executionMode: p.mode,
        createdAt: new Date(p.createdAt),
      });
    await tx
      .insert(adversarialBattles)
      .values(
        demo.battles.map((b) => ({
          id: b.id,
          projectId: p.id,
          battleMode: b.mode,
          state: b.state,
          saboteurMutationType: b.scenario,
          healerAttempts: b.attempts,
          antiCheatPassed: b.antiCheatPassed,
          antiCheatNotes: b.antiCheatNotes,
          antiCheatChecks: b.antiCheatChecks,
          branch: b.branch,
          baseBranch: b.baseBranch,
          targetUrl: b.targetUrl,
          objective: b.objective,
          targets: b.targets,
          log: b.log,
          createdAt: new Date(b.at),
          updatedAt: new Date(b.updatedAt),
        })),
      );
    await tx
      .insert(kaneRuns)
      .values(
        demo.runs.map((r) => ({
          id: r.id,
          projectId: p.id,
          battleId: r.battleId,
          name: r.name,
          objective: r.objective,
          surface: r.surface,
          targetPlatform: r.platform,
          commitSha: r.sha,
          exitCode: r.exitCode,
          status: r.status,
          resultCode: r.resultCode,
          bugVerdictJson: r.verdict,
          finalStateJson: r.finalState,
          creditsConsumed: 0,
          durationS: r.duration,
          startedAt: new Date(r.at),
          completedAt: new Date(r.completedAt!),
          targetUrl: r.targetUrl,
          trigger: r.trigger,
          role: r.role,
          attempt: r.attempt,
          requirementId: r.requirementId,
          summary: r.summary,
          oneLiner: r.oneLiner,
          reason: r.reason,
          stepsDone: r.stepsDone,
          stepsFailed: r.stepsFailed,
          reviewed: !r.review,
        })),
      );
    for (const b of demo.battles)
      await tx
        .update(adversarialBattles)
        .set({ beforeRunId: b.beforeRunId, afterRunId: b.afterRunId })
        .where(eq(adversarialBattles.id, b.id));
    const records = demo.runs.map(sampleDetail);
    const events = records.flatMap((d) =>
      d.events.map((e) => ({
        runId: d.run.id,
        seqNo: e.seq,
        eventType: e.type,
        stepIndex: e.step,
        stepStatus: e.stepStatus,
        remark: e.remark,
        rawPayload: e.payload,
        emittedAt: new Date(e.at),
      })),
    );
    for (let i = 0; i < events.length; i += 80)
      await tx.insert(ndjsonEvents).values(events.slice(i, i + 80));
    await tx
      .insert(evidenceArtifacts)
      .values(
        records
          .filter((d) => !!d.evidence)
          .map((d) => ({
            runId: d.run.id,
            failingStepIndex: d.evidence!.failingStep,
            failureYamlJson: d.evidence!.failure,
            annotatedScreenshots: d.evidence!.screenshots,
            networkLogSlice: d.evidence!.network,
            consoleLogSlice: d.evidence!.console,
            devtoolsAssertionsSummary: d.evidence!.devtools,
          })),
      );
    await tx
      .insert(publishedPostmortems)
      .values(
        demo.postmortems.map((a) => ({
          id: a.id,
          battleId: a.battleId,
          slug: a.slug,
          title: a.title,
          summaryTldr: a.tldr,
          markdownBody: a.body,
          beforeScreenshotUrl: a.beforeShot,
          afterScreenshotUrl: a.afterShot,
          status: "draft",
          createdAt: new Date(a.createdAt),
        })),
      );
    await tx
      .insert(workspaceSettings)
      .values({ key: "sample_installed", value: true });
  });
}
export function ensureSampleWorkspace() {
  return (installed ??= seed().catch((e) => {
    installed = null;
    throw e;
  }));
}
