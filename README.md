# CHAOS-PACT

Adversarial revenue guard for the KaneCLI Online Hackathon, built on **pmrinal2005/CHAOS-PACT**: a Next.js 16 App Router control plane, Drizzle/PostgreSQL ledger and a Docker worker that drives **Kane CLI (`@testmuai/kane-cli` 0.10.x)**.

A Red-Team saboteur breaks a target, Kane CLI referees it in a real browser (DevTools network/console/cookie assertions, `result_code: 740` bug classification, sealed `.evidence` packs), a Blue-Team healer repairs it under an anti-cheat patch-intent audit, Kane re-verifies, an HMAC-SHA256 receipt is signed and a post-mortem is published and self-verified by Kane.

## No mock data

The workspace starts **empty**. Every run, event, battle, receipt and post-mortem is produced by a real Kane CLI execution on the worker. There is no seeded or sample dataset; if the database is unreachable the UI says so and stays read-only instead of showing placeholders.

## Dashboard

Aurora design system (`src/workspace/aurora.css`, `mission.css`), fonts self-hosted through `next/font` (Plus Jakarta Sans, Space Grotesk, JetBrains Mono), animated Mission Control with a live loop orbit, activity ticker, count-up metrics, qualification ring and DevTools domain map. Responsive from phones (drawer navigation) to wide desktops. Hash-routed screens: Mission Control, Run ledger / theater, Adversarial arena, Evidence vault, Coverage map, Post-mortems, Integrations, Device grid, Team, Billing, Settings, Blueprint audit.

## Chaos Lab

`/lab/checkout` is an owned, public sabotage target. Each battle gets its own copy of `lab/checkout.config.json`; the Red team injects a catalogued fault (silent API 500, mobile CTA overlay, console crash, cookie flag stripping, README pricing lie), Kane CLI referees the live page, the healer patches the file (Groq/Gemini when a key is set, otherwise a scoped rule-based revert) and the anti-cheat audit checks the diff. No repository or model key is needed.

## Local operation

1. `npm ci --include=dev`
2. Copy `.env.example` to `.env` and set `DATABASE_URL`. The schema is prepared additively on first request (or run `npx tsx scripts/prepare-database.ts`).
3. `npm run dev`, then open `/` and `/api/health`.
4. For live runs start the worker (`worker/`, needs Chrome + `@testmuai/kane-cli` + `LT_USERNAME`/`LT_ACCESS_KEY`) and set `KANE_WORKER_URL`, `WORKER_SHARED_SECRET` and `WORKSPACE_PASSWORD` on the control plane.

## Deployment

Control plane: Vercel (`vercel.json`). Worker: Render (`render.yaml`, `worker/Dockerfile`). Database: any PostgreSQL (Supabase pooled URL works). See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and [docs/SETUP.md](docs/SETUP.md).

## CI gate

`.github/workflows/chaos-pact-gate.yml` runs `LambdaTest/kane-cli-run@v1` on pull requests, Vercel deployments and manual dispatch, with the sealed evidence pack uploaded as an artifact.

## Verification

`npx next typegen`, `npm exec tsc -- --noEmit`, `npm run build`, then with a running server `npx playwright test` (`TEST_BASE_URL`, `WORKSPACE_PASSWORD` if protected). `npx tsx tests/schema-recovery.integration.ts` exercises legacy-schema recovery on a disposable local database. See [docs/VALIDATION.md](docs/VALIDATION.md).

## Boundaries

Tenant-scoped RLS, `git bisect` automation, cross-target native evidence merging and 20-browser `explore` runs on the grid depend on external entitlements; see the Blueprint audit screen for the per-requirement status.
