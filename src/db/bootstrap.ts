import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { db } from "@/db";

/** Additive installation only: never drop tables, rewrite rows, or change a column type. */
let ready: Promise<void> | null = null;
async function prepare() {
  if (process.env.WORKSPACE_AUTO_MIGRATE === "false") return;
  // A pre-provisioned, read-only runtime role needs no DDL permissions.
  const baseline = await readFile(
    join(process.cwd(), "drizzle/0000_workspace_baseline.sql"),
    "utf8",
  );
  const statements = baseline
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);
  const tables = statements
    .filter((s) => s.startsWith("CREATE TABLE"))
    .map((statement) => ({
      name: statement.match(/^CREATE TABLE "([a-z_]+)"/)![1],
      columns: statement
        .split("\n")
        .map((s) => s.trim().replace(/,$/, ""))
        .filter((s) => s.startsWith('"')),
      statement,
    }));
  const columns = await db.execute<{ table_name: string; column_name: string }>(
    sql`select table_name, column_name from information_schema.columns where table_schema = 'public'`,
  );
  const found = new Set(
    columns.rows.map((c) => `${c.table_name}.${c.column_name}`),
  );
  if (
    tables.every((t) =>
      t.columns.every((c) => found.has(`${t.name}.${c.split('"')[1]}`)),
    )
  )
    return;
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(27413, 1)`);
    await tx.execute(sql`set local lock_timeout = '5s'`);
    for (const t of tables) {
      await tx.execute(
        sql.raw(
          t.statement.replace("CREATE TABLE", "CREATE TABLE IF NOT EXISTS"),
        ),
      );
      // The definitions come only from the committed Drizzle migration, never from a request.
      if (columns.rows.some((r) => r.table_name === t.name)) {
        for (const c of t.columns) {
          const key = c.split('"')[1];
          if (found.has(`${t.name}.${key}`)) continue;
          // A legacy run can be named without inventing an outcome or evidence.
          const definition =
            t.name === "kane_runs" && key === "name"
              ? c.replace("NOT NULL", "DEFAULT 'Imported run' NOT NULL")
              : c;
          await tx.execute(
            sql.raw(
              `ALTER TABLE "${t.name}" ADD COLUMN IF NOT EXISTS ${definition}`,
            ),
          );
        }
      }
    }
    for (const s of statements.filter((s) => !s.startsWith("CREATE TABLE"))) {
      if (s.startsWith("ALTER TABLE")) {
        const m = s.match(
          /^ALTER TABLE "([a-z_]+)" ADD CONSTRAINT "([a-z_]+)"/,
        );
        if (!m) throw new Error("Unsupported baseline constraint");
        const exists = await tx.execute(
          sql`select 1 from pg_constraint where conname = ${m[2]} and conrelid = to_regclass(${`public.${m[1]}`})`,
        );
        if (!exists.rowCount) await tx.execute(sql.raw(s));
      } else if (/^CREATE (UNIQUE )?INDEX /.test(s)) {
        await tx.execute(sql.raw(s.replace("INDEX ", "INDEX IF NOT EXISTS ")));
      }
    }
  });
}
export function ensureSchema() {
  return (ready ??= prepare().catch((e) => {
    ready = null;
    throw e;
  }));
}
