# CHAOS-PACT

An adversarial revenue guard. A Red-Team saboteur breaks a chaos branch, **Kane CLI** referees it in a real
browser, and a Blue-Team healer repairs it under an anti-cheat audit. Healed battles are sealed with an
HMAC receipt and published as a post-mortem that Kane CLI verifies before it goes live.

Built on the original Mission Control workspace UI (`src/workspace/`), now served by Next.js (App Router)
with PostgreSQL via Drizzle. Every number on screen is read from the database; a fresh workspace is empty.

## Architecture

```
Browser (src/workspace, hash-routed client app)
   |  GET /api/workspace (polling)      GET /api/runs/:id/stream (SSE, live tail or 5x replay)
Next.js control plane (src/app/api, src/lib)  <->  PostgreSQL (src/db/schema.ts)
   |  POST {KANE_WORKER_URL}/jobs       ^  POST /api/worker/events (NDJSON batches, evidence, exit code)
Cloud Kane worker (worker/server.mjs, Docker)  ->  kane-cli  ->  headless Chrome / TestMu AI cloud grid
```

| Path | Purpose |
| --- | --- |
| `src/db/schema.ts` | `projects`, `kane_runs`, `ndjson_events`, `adversarial_battles`, `evidence_artifacts`, `published_postmortems` (+ settings, team) |
| `src/lib/kane.ts` | Run dispatch, NDJSON classification (typeless step lines, surface-specific terminal events), exit-code handling, guards |
| `src/lib/agents.ts` | Saboteur, referee state machine, healer (max 3 attempts), receipt + post-mortem + self-verification |
| `src/lib/anticheat.ts` | Deterministic patch-intent audit (no test edits, no deleted validation, no hardcoded fixtures, scope) |
| `worker/` | The execution worker: spawns `kane-cli`, streams stdout, validates and unpacks `.evidence` packs |

### API

| Route | What it does |
| --- | --- |
| `POST /api/kane/trigger` | Dispatch a run per target (`live_cloud`) or replay a sealed run's stream (`judge_instant_replay`) |
| `POST /api/webhooks/github` | Signed PR/push webhook: PR gate, PRD/README re-ingestion, smoke suite |
| `POST /api/arena/sabotage` | Mutate an isolated `chaos-pact/battle-*` branch, then chain the referee |
| `POST /api/agent/heal` | Blue-Team repair with the anti-cheat audit; re-verifies; escalates after 3 attempts |
| `POST /api/blog/publish` | Sign the receipt, write the post-mortem, dispatch Kane's self-verification |
| `GET /api/receipt/[id]` | Recompute the HMAC receipt (JSON, or `?format=svg` badge) |
| `POST /api/worker/events` | Worker callback (bearer `WORKER_SHARED_SECRET`) |

Battle states: `EXPLORE -> SABOTAGE -> REFEREE_FAIL -> HEALING -> ANTI_CHEAT_AUDIT -> REFEREE_PASS -> PUBLISHED`,
with `BLOCKED_NEEDS_HUMAN` as the escalation exit. Kane exit codes drive it: `0` pass, `1` product failure
(heal), `2` setup/infrastructure (never heal), `3` timeout.

## Run locally

```bash
npm install
cp .env.example .env          # set DATABASE_URL at minimum
npx drizzle-kit push          # create the tables
npm run dev
```

Without a worker the app is fully usable but live runs are recorded as exit code 2 with a clear message.
See `.env.example` for every variable.

## Deploy

**Control plane (Vercel).** Import the repository; `vercel.json` sets the framework and build command.
Add the variables from `.env.example` (at least `DATABASE_URL`, `APP_BASE_URL`, `KANE_WORKER_URL`,
`WORKER_SHARED_SECRET`, `HMAC_SECRET`). For Supabase Postgres use the pooled connection string and
`DATABASE_SSL=no-verify`. Create the tables once:

```bash
DATABASE_URL="postgresql://..." npx drizzle-kit push --config drizzle.prod.config.ts
```

**Worker (Render or any Docker host).** `render.yaml` deploys `worker/Dockerfile` (Chrome, git, kane-cli).
Set `WORKER_SHARED_SECRET` (same value as Vercel), `LT_USERNAME`, `LT_ACCESS_KEY`, and optionally
`GITHUB_TOKEN` (private repos) and `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` + a public
`evidence-packs` bucket so sealed packs and screenshots can be downloaded and displayed.
Cloud-grid devices additionally need `kane-cli plugin install remote-execution` and a plan that includes them.

**GitHub.** Add a webhook to the guarded repository: payload URL `https://<app>/api/webhooks/github`,
content type `application/json`, secret `GITHUB_WEBHOOK_SECRET`, events *Pull requests* and *Pushes*.
Battles and PR gates test a branch deployment: set the project's preview URL template
(for example `https://my-app-git-{branch}-my-team.vercel.app`) in Project > Settings.

## Known limits

- No sign-in yet: anyone who can reach the app can trigger runs (rate-limited per requester per hour).
- Events reach the browser over server-sent events backed by Postgres rather than Supabase Realtime.
- The evidence unpacker classifies files inside a `.evidence` archive by name (screenshots, network,
  console, `failure.yaml`); adjust `collectEvidence` in `worker/server.mjs` if a CLI release changes the layout.
