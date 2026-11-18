import "dotenv/config";
import { ensureSchema } from "../src/db/bootstrap";
import { db, pool } from "../src/db";
import {
  projects,
  kaneRuns,
  adversarialBattles,
  ndjsonEvents,
  evidenceArtifacts,
  publishedPostmortems,
  teamMembers,
  workspaceSettings,
} from "../src/db/schema";

async function prepare() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  process.env.WORKSPACE_AUTO_MIGRATE = "true";
  await ensureSchema();
  for (const table of [
    projects,
    kaneRuns,
    adversarialBattles,
    ndjsonEvents,
    evidenceArtifacts,
    publishedPostmortems,
    teamMembers,
    workspaceSettings,
  ])
    await db.select().from(table).limit(0);
  console.log(
    "Workspace schema ready: all eight table shapes checked. No sample data inserted.",
  );
}
prepare()
  .catch((e) => {
    console.error(
      "Schema preparation failed. Check the migration role, TLS settings, and existing column definitions.",
      { code: e?.cause?.code || e?.code || "MIGRATION_FAILED" },
    );
    process.exitCode = 1;
  })
  .finally(() => pool.end());
