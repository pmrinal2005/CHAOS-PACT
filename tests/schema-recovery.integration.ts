/** Run only against the LOCAL development cluster: npx tsx tests/schema-recovery.integration.ts */
import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { eq, sql } from "drizzle-orm";
import { db, pool } from "../src/db";
import { ensureSchema } from "../src/db/bootstrap";
import { ensureSampleWorkspace } from "../src/db/seed-replay";
import {
  projects,
  kaneRuns,
  adversarialBattles,
  evidenceArtifacts,
} from "../src/db/schema";
import { receiptFor } from "../src/lib/receipt";
import { signReceipt, handle, sha256 } from "../src/lib/config";
import { classifyEvent, ingestWorkerReport } from "../src/lib/kane";
import { loadWorkspace } from "../src/lib/serialize";

async function probe() {
  const url = new URL(process.env.DATABASE_URL!);
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
  assert.match(url.pathname, /^\/chaospact_audit_[a-f0-9]+$/);
  const pId = randomUUID();
  await db.execute(
    sql`create table projects (id uuid primary key default gen_random_uuid(), name text not null, repo_url text not null, staging_url text not null, prod_url text not null)`,
  );
  await db.execute(
    sql`insert into projects (id,name,repo_url,staging_url,prod_url) values (${pId}, 'Preserve this project', 'https://github.com/example/existing', 'https://staging.example', 'https://example.org')`,
  );
  await Promise.all([ensureSchema(), ensureSchema(), ensureSchema()]);
  await ensureSampleWorkspace();
  const w = await loadWorkspace("http://localhost:3000");
  assert.equal(w.projects.length, 1);
  assert.equal(w.projects[0].name, "Preserve this project");
  assert.equal(w.projects[0].id, pId);
  assert.equal(w.projects[0].branch, "main");
  assert.deepEqual(w.projects[0].requirements, []);
  assert.equal(w.runs.length, 0);
  console.log(
    "PASS: missing columns + seven missing tables repaired; original row retained; sample not injected into existing data.",
  );
  process.env.HMAC_SECRET = randomBytes(32).toString("hex");
  const [run] = await db
    .insert(kaneRuns)
    .values({
      projectId: pId,
      surface: "run",
      targetPlatform: "desktop_web",
      name: "Receipt unit fixture",
      status: "passed",
      exitCode: 0,
      trigger: "unit_fixture",
    })
    .returning();
  const [battle] = await db
    .insert(adversarialBattles)
    .values({
      projectId: pId,
      battleMode: "unit_fixture",
      state: "REFEREE_PASS",
      afterRunId: run.id,
    })
    .returning();
  const payload = {
    battleId: battle.id,
    afterRunId: run.id,
    evidenceSha256: null as string | null,
  };
  await db
    .update(adversarialBattles)
    .set({ receiptPayload: payload, hmacReceiptHash: signReceipt(payload) })
    .where(eq(adversarialBattles.id, battle.id));
  assert.equal((await receiptFor(battle.id))?.valid, false);
  const digest = sha256("test bytes, not Kane evidence");
  payload.evidenceSha256 = digest;
  await db
    .update(adversarialBattles)
    .set({ receiptPayload: payload, hmacReceiptHash: signReceipt(payload) })
    .where(eq(adversarialBattles.id, battle.id));
  await db
    .insert(evidenceArtifacts)
    .values({ runId: run.id, packSha256: digest, validationExitCode: 0 });
  assert.equal((await receiptFor(run.id))?.valid, true);
  await db
    .update(evidenceArtifacts)
    .set({ packSha256: sha256("different fixture bytes") })
    .where(eq(evidenceArtifacts.runId, run.id));
  assert.equal((await receiptFor(run.id))?.valid, false);
  await db
    .update(evidenceArtifacts)
    .set({ packSha256: digest, validationExitCode: 1 })
    .where(eq(evidenceArtifacts.runId, run.id));
  assert.equal((await receiptFor(run.id))?.valid, false);
  console.log(
    "PASS: signed digest matches; missing, changed, and invalid evidence fail closed.",
  );
  assert.equal(
    classifyEvent({ step: 4, status: "done", child_id: "branch-a" }).eventType,
    "progress",
  );
  assert.equal(
    classifyEvent({ type: "coverage", pct: 66 }).eventType,
    "coverage",
  );
  assert.equal(
    classifyEvent({ type: "run_end", status: "passed" }).stepStatus,
    null,
  );
  const [streamRun] = await db
    .insert(kaneRuns)
    .values({
      projectId: pId,
      surface: "run",
      targetPlatform: "desktop_web",
      name: "Parser unit fixture",
      trigger: "unit_fixture",
    })
    .returning();
  const batch = {
    runId: streamRun.id,
    events: [
      {
        seq: 0,
        payload: { type: "stream_start", v: 1, cli_version: "test-fixture" },
      },
      {
        seq: 1,
        payload: {
          type: "warning",
          code: "unresolved_variables",
          variables: [{ name: "fixture", reason: "not_declared" }],
        },
      },
      {
        seq: 2,
        payload: {
          step: 9,
          status: "done",
          child_id: "a",
          remark: "First branch",
        },
      },
      {
        seq: 3,
        payload: {
          step: 9,
          status: "done",
          child_id: "b",
          remark: "Second branch",
        },
      },
      {
        seq: 4,
        payload: {
          type: "run_end",
          status: "passed",
          final_state: { source: "unit test" },
        },
      },
    ],
  };
  await ingestWorkerReport(batch, "http://localhost");
  await ingestWorkerReport(batch, "http://localhost");
  await Promise.all(
    [0, 1].map(() =>
      ingestWorkerReport(
        { runId: streamRun.id, final: { exitCode: 0 } },
        "http://localhost",
      ),
    ),
  );
  await ingestWorkerReport(
    { runId: streamRun.id, final: { exitCode: 2 } },
    "http://localhost",
  );
  const [sealed] = await db
    .select()
    .from(kaneRuns)
    .where(eq(kaneRuns.id, streamRun.id));
  assert.equal(sealed.stepsDone, 2);
  assert.equal(sealed.warningsJson?.length, 1);
  assert.equal(sealed.status, "passed");
  assert.equal(sealed.exitCode, 0);
  console.log(
    "PASS: duplicate callbacks do not double-count warnings or completed steps; child contexts survive and terminal runs do not reopen.",
  );
  const res = await handle(async () => {
    throw Object.assign(
      new Error("Failed query: select private_column from projects"),
      { cause: { code: "42703" } },
    );
  });
  assert.equal(res.status, 503);
  assert.doesNotMatch(await res.text(), /select|private_column/i);
  console.log("PASS: progress classification and sanitized database errors.");
}
async function main() {
  if (process.env.CHAOS_AUDIT_PROBE === "1") return probe();
  const url = new URL(process.env.DATABASE_URL!);
  assert.ok(
    ["127.0.0.1", "localhost"].includes(url.hostname),
    "The recovery test refuses external databases.",
  );
  const name = `chaospact_audit_${randomBytes(5).toString("hex")}`;
  await db.execute(sql`create database ${sql.identifier(name)}`);
  try {
    url.pathname = `/${name}`;
    const result = spawnSync(
      process.execPath,
      [...process.execArgv, process.argv[1]],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          DATABASE_URL: url.toString(),
          CHAOS_AUDIT_PROBE: "1",
          WORKSPACE_AUTO_MIGRATE: "true",
        },
        timeout: 45000,
      },
    );
    assert.equal(result.status, 0, "Disposable database probe failed");
  } finally {
    await db.execute(sql`drop database ${sql.identifier(name)} with (force)`);
  }
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
