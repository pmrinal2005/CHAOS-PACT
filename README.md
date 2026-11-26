# CHAOS-PACT

A verification control plane built on **pmrinal2005/CHAOS-PACT**. The Next.js App Router application uses the original `src/workspace/` screens, Drizzle/PostgreSQL ledger, API routes, and Docker worker. Historical Vite source is retained but is not the deployed application.

## Start here

- **Mission Control:** execution metrics, interactive time ranges, status filters, and run drill-down.
- **Run ledger / theater:** inspect progress, terminal events, exit codes, warnings, and extracted values. Replay a timeline or export a sample JSON trace.
- **Arena / evidence / coverage:** inspect battle history, per-step traces, and requirement relationships.
- **Blueprint audit:** 75 source-referenced findings covering the 50 research tracks and implementation sections. Search, filter, and export the report in the workspace, or read [the complete audit](docs/BLUEPRINT_AUDIT.md).
- **[Deploy to Vercel](docs/DEPLOYMENT.md)** and **[validation notes](docs/VALIDATION.md)**.

## The dashboard failure and repair

The original health route checked only `SELECT 1`; the workspace read selected every ORM column across eight tables. A database could therefore look healthy while a missing table or an old `projects` definition broke every screen. The browser printed the raw Drizzle error and globally blocked navigation. That error alone does not prove which connection, permission, or schema problem exists on a particular external deployment.

The repair has four parts:

1. A committed Drizzle baseline and **additive, transaction-locked schema preparation**. The first request checks the expected columns; missing tables and columns are added without dropping existing data. Incompatible legacy values are not silently rewritten.
2. `/api/health` selects the complete shape of all eight tables with `LIMIT 0`. An unusable schema returns HTTP 503, not a false green status.
3. Bounded PostgreSQL connection timeouts and sanitized API errors. Visitors never need a raw SQL statement to understand an outage.
4. A labelled read-only workspace during connection failures, with retry and recovery. Successful reads replace the fallback; changes are not claimed as saved while offline.

## Data provenance

An **empty** database receives the repository’s Nexus Commerce demonstration project: 128 illustrative executions, eight example battle histories, and eight inspectable sample traces. Sample data has a fixed capture window, is labelled throughout the UI, costs zero credits, and cannot receive HMAC verification receipts. The chart range is relative to that sample window, not today's time. Existing nonempty databases are never replaced. Set `WORKSPACE_SAMPLE_DATA=false` before first boot for an empty production workspace.

**A sample trace is not an authentic `.evidence` file.** Samples download as `.sample.json`. No genuine sealed Kane pack, native CLI cache, successful paid cloud run, or hackathon qualification is fabricated. Native replay and signed publication require actual worker-produced evidence. The worker's event data is JSONB; it preserves parsed payloads, not original stdout byte formatting.

## Local operation

1. Install the locked dependencies with `npm ci --include=dev`.
2. Copy `.env.example` to `.env` and supply `DATABASE_URL` for your PostgreSQL database. Keep credentials private.
3. Start with `npm run dev`. A fresh/local database with DDL permission prepares itself automatically. Alternatively, run `npx tsx scripts/prepare-database.ts` once using a migration role.
4. Visit `/`, `/api/health` and `/#/audit`.

No external service is needed to inspect the sample, connect project metadata, edit settings, or browse the audit. Live execution is separate. Use an owned staging application, a private workspace and a trusted worker with operator-configured secrets. Never connect production credentials to an unprotected public demo.

## Architecture and boundaries

- `src/db/schema.ts`, `src/db/bootstrap.ts`, `drizzle/`: six core tables plus team and settings; non-destructive initial preparation.
- `src/app/api/`, `src/lib/`: run dispatch, typed/typeless event handling, evidence, policy gates, receipts, and post-mortem drafts.
- `src/workspace/`: hash-routed application, command palette, responsive navigation, search, filters, evidence inspection and administration.
- `worker/`, `render.yaml`: optional offloaded Kane execution. Browser updates use **PostgreSQL-backed SSE**, not Supabase Realtime.
- `.testmuai/tests/`: authored checkout and workspace templates. These are not claimed to have been authored or passed by Kane. Configure the approved target and variables before use.
- `src/proxy.ts`: optional HTTP Basic protection for a **single-tenant** operator workspace. The username is `operator`; the password comes only from `WORKSPACE_PASSWORD`.

Important remaining gaps include tenant-scoped RLS, five authentic committed evidence packs, full AST-based repair auditing, automatic `git bisect`, cross-target native pack merging, and proven live mobile/20-browser execution. A device name alone does not make a web suite mobile. Social posts, a demo video, event eligibility, cost guarantees, third-party quotas and winner claims are external deliverables. See the audit rather than assuming the blueprint is fully implemented.

## Verification

Run type generation, `npm exec tsc -- --noEmit --pretty false`, and `npm run build`. Start the production preview, then `npx playwright test`. The browser suite uses `TEST_BASE_URL` (default `http://127.0.0.1:3000`) and the seeded sample project.

`npx tsx tests/schema-recovery.integration.ts` creates a uniquely named disposable database on the **local cluster only**, reproduces a legacy schema, verifies data retention and strict receipt checks, and drops only that test database. It requires local database-creation permission.

The upstream Vite prototype tests are preserved in `tests/legacy/`. They target a different UI/data model and are not represented as passing Next.js tests.
