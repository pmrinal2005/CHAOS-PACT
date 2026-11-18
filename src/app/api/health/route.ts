import { db } from "@/db";
import { ensureSchema } from "@/db/bootstrap";
import {
  projects,
  kaneRuns,
  ndjsonEvents,
  evidenceArtifacts,
  adversarialBattles,
  publishedPostmortems,
  teamMembers,
  workspaceSettings,
} from "@/db/schema";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await ensureSchema();
    // SELECT all fields, LIMIT 0: catches schema drift without reading user data.
    await Promise.all(
      [
        projects,
        kaneRuns,
        ndjsonEvents,
        evidenceArtifacts,
        adversarialBattles,
        publishedPostmortems,
        teamMembers,
        workspaceSettings,
      ].map((t) => db.select().from(t).limit(0)),
    );
    return Response.json(
      { ok: true, database: "connected", schema: "ready", tables: 8 },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      {
        ok: false,
        database: "unavailable",
        remedy:
          "Check the database connection and apply the committed workspace baseline.",
      },
      { status: 503 },
    );
  }
}
