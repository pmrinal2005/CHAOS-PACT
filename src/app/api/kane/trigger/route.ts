import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { kaneRuns, ndjsonEvents, projects } from "@/db/schema";
import { appUrlFor, handle, isHttpUrl, need, requesterHash } from "@/lib/config";
import { enforceRunGuards, triggerRuns } from "@/lib/kane";
import { toRun } from "@/lib/serialize";
import { PLATFORMS, SURFACES } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Unified execution and multi-target dispatcher. */
export const POST = (req: Request) =>
  handle(async () => {
    const b = await req.json();
    const [project] = await db.select().from(projects).where(eq(projects.id, String(b.projectId || "")));
    need(project, 404, "Project not found.");
    const mode = b.executionMode === "judge_instant_replay" ? "judge_instant_replay" : "live_cloud";

    if (mode === "judge_instant_replay") {
      // Replays a sealed run's own NDJSON stream. Nothing is synthesised.
      const hasEvents = sql`exists (select 1 from ${ndjsonEvents} where ${ndjsonEvents.runId} = ${kaneRuns.id})`;
      const [run] = await db
        .select()
        .from(kaneRuns)
        .where(
          and(
            b.replayRunId ? eq(kaneRuns.id, String(b.replayRunId)) : eq(kaneRuns.projectId, project.id),
            isNotNull(kaneRuns.completedAt),
            hasEvents,
          ),
        )
        .orderBy(desc(kaneRuns.startedAt))
        .limit(1);
      need(run, 409, "No sealed run with a recorded NDJSON stream exists yet. Switch to Live Cloud mode to record one.");
      return Response.json({ mode, runId: run.id, runIds: [run.id], streamUrl: `/api/runs/${run.id}/stream?replay=5`, run: toRun(run) });
    }

    const targets: string[] = Array.isArray(b.targets) && b.targets.length ? b.targets : ["desktop_web"];
    need(targets.every((t) => (PLATFORMS as readonly string[]).includes(t)), 400, `targets must be drawn from: ${PLATFORMS.join(", ")}.`);
    const surface = b.surface ? String(b.surface) : undefined;
    need(!surface || (SURFACES as readonly string[]).includes(surface), 400, `surface must be one of: ${SURFACES.join(", ")}.`);
    const objective = typeof b.objective === "string" ? b.objective.trim().slice(0, 6000) : "";
    const testmdPath = typeof b.testmdPath === "string" ? b.testmdPath.trim() : "";
    const testmdContent = typeof b.testmdContent === "string" ? b.testmdContent : "";
    if (surface === "explore") need(isHttpUrl(b.url || project.stagingUrl), 400, "Exploration needs a target URL.");
    else need(objective || testmdPath || testmdContent || b.tags, 400, "Provide an objective, a testmd path, or suite tags.");
    need(!b.url || isHttpUrl(b.url), 400, "url must be a valid http(s) URL.");
    need(!testmdPath || /^[\w./-]+$/.test(testmdPath) && !testmdPath.includes(".."), 400, "testmdPath must be a repository-relative path.");
    const requester = requesterHash(req);
    await enforceRunGuards(requester, targets.length);

    const runs = await triggerRuns(
      {
        projectId: project.id,
        name: typeof b.name === "string" ? b.name.slice(0, 120) : undefined,
        objective: objective || undefined,
        testmdPath: testmdPath || undefined,
        testmdContent: testmdContent || undefined,
        surface,
        targets,
        bugDetectionMode: ["off", "stop", "continue"].includes(b.bugDetectionMode) ? b.bugDetectionMode : "continue",
        variables: b.variables && typeof b.variables === "object" ? b.variables : undefined,
        targetUrl: b.url || undefined,
        requirementId: typeof b.requirementId === "string" ? b.requirementId : undefined,
        tags: typeof b.tags === "string" ? b.tags : undefined,
        requesterHash: requester,
      },
      appUrlFor(req),
    );
    return Response.json(
      { mode, runId: runs[0].id, runIds: runs.map((r) => r.id), streamUrl: `/api/runs/${runs[0].id}/stream`, runs: runs.map((r) => toRun(r)) },
      { status: 202 },
    );
  });
