import { eq } from "drizzle-orm";
import { db } from "@/db";
import { evidenceArtifacts, kaneRuns, ndjsonEvents } from "@/db/schema";
import { handle, need } from "@/lib/config";
import { toEvent, toEvidence, toRun } from "@/lib/serialize";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f-]{36}$/i;

export const GET = (_req: Request, { params }: Ctx) =>
  handle(async () => {
    const { id } = await params;
    need(UUID.test(id), 404, "Run not found.");
    const [run] = await db.select().from(kaneRuns).where(eq(kaneRuns.id, id));
    need(run, 404, "Run not found.");
    const [events, [evidence]] = await Promise.all([
      db.select().from(ndjsonEvents).where(eq(ndjsonEvents.runId, id)).orderBy(ndjsonEvents.seqNo),
      db.select().from(evidenceArtifacts).where(eq(evidenceArtifacts.runId, id)),
    ]);
    return Response.json({ run: toRun(run, evidence ? { screenshots: evidence.annotatedScreenshots } : null), events: events.map(toEvent), evidence: evidence ? toEvidence(evidence) : null });
  });

export const PATCH = (req: Request, { params }: Ctx) =>
  handle(async () => {
    const { id } = await params;
    need(UUID.test(id), 404, "Run not found.");
    const b = await req.json();
    const [run] = await db.update(kaneRuns).set({ reviewed: !!b.reviewed }).where(eq(kaneRuns.id, id)).returning();
    need(run, 404, "Run not found.");
    return Response.json({ run: toRun(run) });
  });
