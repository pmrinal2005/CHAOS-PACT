# CHAOS-PACT implementation audit

**Baseline:** pmrinal2005/CHAOS-PACT at `58512ee4024621d6f0260c2a34ca278a9a521456`. These findings distinguish source inspection from authenticated execution. Present = implemented path, Partial = incomplete or unverified integration, Missing = absent in the inspected tree, External = research or action outside the repository. The original Vite prototype is retained; its local simulated state is not production evidence.

### Domain 1 · §1 — demo.studio winner comparison

**External.** Competitive research is not an application feature. This source audit does not substantiate competitor rankings, market percentages, or cohort counts. No competitor code was imported.

Source: `User blueprint §1; upstream README.md`

### Domain 2 · §1 — GuardianKane workflow comparison

**External.** Competitive research is not an application feature. This source audit does not substantiate competitor rankings, market percentages, or cohort counts. No competitor code was imported.

Source: `User blueprint §1; upstream README.md`

### Domain 3 · §1 — GuardianKane commerce comparison

**External.** Competitive research is not an application feature. This source audit does not substantiate competitor rankings, market percentages, or cohort counts. No competitor code was imported.

Source: `User blueprint §1; upstream README.md`

### Domain 4 · §1 — KANE vs. ABLE comparison

**External.** Competitive research is not an application feature. This source audit does not substantiate competitor rankings, market percentages, or cohort counts. No competitor code was imported.

Source: `User blueprint §1; upstream README.md`

### Domain 5 · §1 — Latch receipt comparison

**External.** Competitive research is not an application feature. This source audit does not substantiate competitor rankings, market percentages, or cohort counts. No competitor code was imported.

Source: `User blueprint §1; upstream README.md`

### Domain 6 · §1 — kane-loop watcher comparison

**External.** Competitive research is not an application feature. This source audit does not substantiate competitor rankings, market percentages, or cohort counts. No competitor code was imported.

Source: `User blueprint §1; upstream README.md`

### Domain 7 · §1 — Furnish ledger comparison

**External.** Competitive research is not an application feature. This source audit does not substantiate competitor rankings, market percentages, or cohort counts. No competitor code was imported.

Source: `User blueprint §1; upstream README.md`

### Domain 8 · §1 — Agent Lighthouse repair comparison

**External.** Competitive research is not an application feature. This source audit does not substantiate competitor rankings, market percentages, or cohort counts. No competitor code was imported.

Source: `User blueprint §1; upstream README.md`

### Domain 9 · §1 — Helix test format comparison

**External.** Competitive research is not an application feature. This source audit does not substantiate competitor rankings, market percentages, or cohort counts. No competitor code was imported.

Source: `User blueprint §1; upstream README.md`

### Domain 10 · §1 — Hack Day cohort telemetry

**External.** Competitive research is not an application feature. This source audit does not substantiate competitor rankings, market percentages, or cohort counts. No competitor code was imported.

Source: `User blueprint §1; upstream README.md`

### Domain 11 — NDJSON stream contract

**Present.** The worker reads JSON objects line by line; stream_start and raw payloads are persisted. Contract version and PID remain in raw payloads.

Source: `worker/server.mjs; src/lib/kane.ts`

### Domain 12 — Progress and surface completions

**Partial.** Typeless numeric step lines and run_end, test_md_done, testrun_done, remote_done, and explore done are recognized. Complete remote session paths and Test Manager metadata remain in the payload rather than dedicated ledger columns.

Source: `src/lib/kane.ts: classifyEvent, eventPatch`

### Domain 13 — Confirmed product-bug classification

**Present.** Result code 740 and its verdict are stored separately from exit code 1. An ordinary failed assertion is not sufficient proof of a confirmed product bug.

Source: `src/lib/kane.ts; src/workspace/Execution.tsx`

### Domain 14 — Unresolved variable warnings

**Present.** Warning payloads retain variables, reasons, used_by and suggested_file. The theater displays missing names and the suggested file.

Source: `src/lib/kane.ts; src/workspace/Execution.tsx`

### Domain 15 — Sealed evidence archive

**Partial.** The worker finds packs, records validation status and digest, and uploads when storage is configured. The upstream tree contains no authentic committed packs.

Source: `worker/server.mjs: collectEvidence`

### Domain 16 — Local evidence viewing

**Present.** A genuine uploaded pack can be downloaded and opened with evidence serve. The command requires a real pack and local CLI.

Source: `src/workspace/Evidence.tsx`

### Domain 17 — Evidence merge and policy gates

**Partial.** Policy IDs are supported for authored and batch runs. Receipt signing requires validated evidence and a passing configured policy. A merged desktop-plus-mobile pack is not implemented.

Source: `worker/server.mjs; src/lib/agents.ts; src/lib/receipt.ts`

### Domain 18 — Reusable testmd and cached replay

**Partial.** Testmd jobs and reusable authored specifications are supported. The checkout template includes a shared helper. No authentic output cache is committed; replaying UI events is not native cached testmd execution.

Source: `worker/server.mjs; .testmuai/tests`

### Domain 19 — Noninteractive batch suites

**Present.** The worker assembles testrun run with tags, paths, parallel workers, --agent and closed stdin. Live behavior remains dependent on the installed CLI and account.

Source: `worker/server.mjs: buildCommand`

### Domain 20 — Extracted final state

**Present.** run_end.final_state is stored as JSONB and shown in the run inspector.

Source: `src/lib/kane.ts; src/db/schema.ts; src/workspace/Execution.tsx`

### Domain 21 — Network checkpoints

**Partial.** Plain-English objectives and specs can request network checks. The worker reads HAR/NDJSON records and retains failures; live status assertions cannot be certified from the code alone.

Source: `worker/server.mjs; src/lib/requirements.ts`

### Domain 22 — Console checkpoints

**Partial.** Console slices, errors, and warnings are inspected. Unpacked data is bounded, so the UI is not an unlimited console archive.

Source: `worker/server.mjs: collectEvidence; src/workspace/Evidence.tsx`

### Domain 23 — Core Web Vitals

**Partial.** Specs can request LCP and CLS checks. There is no structured collector for all LCP, CLS, INP, and TTFB measurements. An objective mentioning a metric is not a measured result.

Source: `src/workspace/Execution.tsx; .testmuai/tests/checkout_revenue_test.md`

### Domain 24 — Cookie security assertions

**Partial.** The test specification requests httpOnly, secure, and sameSite checks. No authentic cookie result was available in this environment.

Source: `src/workspace/Execution.tsx; .testmuai/tests/checkout_revenue_test.md`

### Domain 25 — Storage, clipboard, and conditional steps

**Partial.** The authored checkout template includes cart-state, clipboard, state extraction, and conditional test-environment verification. These are specifications, not passing evidence.

Source: `.testmuai/tests/checkout_revenue_test.md`

### Domain 26 — Append-only Assurance context

**Missing.** The repository stores current requirement snapshots in PostgreSQL. No committed, Kane-created .context history or context review approval proves the proposed build-time Assurance layer.

Source: `src/lib/requirements.ts; src/db/schema.ts`

### Domain 27 — Requirement trust states

**Present.** Derived, trusted, and stale claims are modeled. Updating a Markdown specification reconciles its claims. Generating a test is not treated as a successful execution.

Source: `src/lib/requirements.ts; src/app/api/projects/[id]/requirements/route.ts`

### Domain 28 — Two-axis coverage

**Partial.** The UI maps claims to specifications and displays trusted/active requirement coverage. The worker can request cover gaps --json. This is not a complete two-axis Test Manager reporting implementation.

Source: `src/lib/requirements.ts; src/workspace/Operations.tsx; worker/server.mjs`

### Domain 29 — Suite drift reconciliation

**Partial.** A signed docs-change webhook requests maintain reconcile --plan and cover gaps. No automatic approval of new requirements or complete CLI context lifecycle is proven.

Source: `src/app/api/webhooks/github/route.ts; worker/server.mjs`

### Domain 30 — Multi-browser exploration

**Partial.** The worker supports explore run --url. There is no confirmed 20-browser run, exploration-map import through explore context, or guaranteed cloud concurrency.

Source: `worker/server.mjs: buildCommand`

### Domain 31 — Remote HyperExecute grid

**Partial.** Remote suite dispatch is present. Device-name flags do not change a web member into a device member; correct target frontmatter, app artifacts, plugin, credentials, and entitlement are prerequisites.

Source: `worker/server.mjs; official Kane testrun guide`

### Domain 32 — Real Android and iOS devices

**Partial.** Android real-device arguments and an iOS simulator selection exist. A real iOS app/session workflow and uploaded, tested mobile application are not supplied.

Source: `worker/server.mjs; src/lib/types.ts`

### Domain 33 — Official GitHub Action

**Missing.** The repository implements a webhook and Docker worker, not a checked-in LambdaTest/kane-cli-run workflow.

Source: `Upstream .github/workflows inventory`

### Domain 34 — Chrome CDP cold starts

**Present.** The container sets an explicit Chrome path, skip-download flag, 60000 ms CDP timeout and two retries. A live cold-start timing measurement is not present.

Source: `worker/Dockerfile; worker/server.mjs`

### Domain 35 — Render execution plane

**Partial.** Dockerfile and Render service blueprint are present. A deployed worker, remaining promotional balance, zero-cost operation and availability SLA are external matters.

Source: `worker/Dockerfile; render.yaml`

### Domain 36 — Realtime transport and latency

**Partial.** Run updates use PostgreSQL-backed SSE and workspace polling. There is no Supabase Realtime channel token or demonstrated sub-100ms latency.

Source: `src/app/api/runs/[id]/stream/route.ts; src/workspace/workspace.tsx`

### Domain 37 — Storage and pack unpacking

**Partial.** Optional Supabase Storage upload, screenshots, console, HAR and failure.yaml are implemented. Extraction is into a temporary directory, not in memory; no bucket is provisioned by this repository.

Source: `worker/server.mjs: upload, collectEvidence`

### Domain 38 — Credit conservation

**Partial.** Instant replay consumes no live credits. Native testmd cache reuse requires actual recorded files. A shallow repository checkout does not persist new caches between worker jobs.

Source: `worker/server.mjs; src/app/api/kane/trigger/route.ts`

### Domain 39 — Read-only Assurance commands

**Partial.** cover gaps is requested for docs audits. A complete fsck and design explain pipeline and exhaustive zero-credit assertions are not established.

Source: `worker/server.mjs: runJob`

### Domain 40 — Groq and Gemini repair providers

**Partial.** Server-side provider clients and an evidence-informed patch proposal path exist. No paid/free model execution was performed and current free-tier quotas were not verified.

Source: `src/lib/integrations.ts; src/lib/agents.ts`

### Domain 41 — Three qualification bars

**External.** Each bar needs a real end-to-end run, genuine proof, and an actual agent/referee exchange. Only live runs with sealed evidence count.

Source: `User blueprint §5; original public/design-specification.md`

### Domain 42 — Verified tie-breaker

**External.** The UI exposes inspectable evidence. Judging weight and award decisions are not software invariants or independently confirmed by this audit.

Source: `User blueprint §5.1`

### Domain 43 — Closed-loop tie-breaker

**Partial.** The state machine exists in code; a successfully deployed live loop requires worker, repository, model and signing credentials. A Chaos Lab battle has been executed end to end against real TestMu credentials.

Source: `src/lib/agents.ts; src/lib/kane.ts`

### Domain 44 — Triple-layer Kane integration

**Partial.** Runtime orchestration and post-mortem self-verification are implemented paths. Build-time requirement approval and 100% verified project coverage are not proven.

Source: `src/lib/agents.ts; src/lib/requirements.ts`

### Domain 45 — Patch-intent auditing

**Partial.** The anti-cheat auditor checks file scope, test edits, removed validation and known fixture literals. It is heuristic text analysis, not an AST proof of semantic correctness.

Source: `src/lib/anticheat.ts`

### Domain 46 — HMAC receipts

**Present.** Canonical signed JSON binds run IDs, commit, timestamp and the stored validated pack digest. Missing/malformed digests and failed validation are rejected. This is not independent re-hashing of an external file on every GET.

Source: `src/lib/config.ts; src/lib/receipt.ts; src/app/api/receipt/[id]/route.ts`

### Domain 47 — Judge fallback

**Partial.** Recorded runs replay instantly from stored NDJSON events without credits. Live records replay through SSE. The five requested genuine sealed archives and byte-for-byte stdout storage are absent; JSONB preserves events rather than original whitespace.

Source: `src/app/api/runs/[id]/stream/route.ts`

### Domain 48 — Meetups and follow-up

**External.** Meetup dates and participation are outside the application and have not been independently established.

Source: `User blueprint §6`

### Domain 49 — B2B billing and tenancy

**Partial.** Credit budgets and a team roster exist. The control plane is single-workspace: team roles are not tenant isolation. There is no subscription billing, tenant-scoped RLS, or demonstrated willingness to pay.

Source: `src/db/schema.ts; src/workspace/Administration.tsx`

### Domain 50 — Public launch posts

**External.** Share snippets are available, but there are no verified public launch links, published engagement metrics, or submitted four-minute video. No social post was published on the operator’s behalf.

Source: `src/lib/agents.ts; src/workspace/Publishing.tsx`

### §2 — Concept selection

**Present.** CHAOS-PACT is the implemented concept. DOC-TRUTH-ENGINE and SHADOW-OPS are comparison alternatives, not additional products that must be deployed.

Source: `README.md; src/workspace/App.tsx`

### §3.2 — Lightweight browser control plane

**Present.** Next.js and PostgreSQL serve data and views. The browser does not run Chrome automation, Xcode, or an Android emulator. Live execution is separated into the worker.

Source: `src/app; src/db; worker`

### §3.3.1 — Authentication and balance preflight

**Partial.** whoami, optional noninteractive login, and balance are present. A human-readable balance is parsed; account limits and exact remaining credits require a live account.

Source: `worker/server.mjs: preflight`

### §3.3.2–4 — Flow branches and completed step counts

**Present.** Raw startup/unknown events are retained. Child IDs distinguish parallel steps, and done/failed transitions are counted instead of treating the highest step as a count.

Source: `src/lib/kane.ts: classifyEvent, ingestWorkerReport`

### §3.3.5–6 — Terminal and exit-code semantics

**Partial.** The ledger distinguishes pass, failure, infrastructure error and timeout/cancellation. Not every exit 1 means a product bug: suites can break, and policy failures differ from application regressions. Automatic doctor recovery is not a complete workflow.

Source: `src/lib/kane.ts; official Kane testrun guide`

### §3.3.7–8 — Evidence discovery and integrity

**Partial.** stderr hints and session/project directories are searched. Validation/digest checks guard receipt publication. File-name-based extraction still depends on archive layout; interoperability must be exercised with real packs.

Source: `worker/server.mjs; src/lib/agents.ts`

### §3.4 — Composable checkout specification

**Partial.** The repository now includes an authored six-domain template, shared helper, and a platform smoke specification. Configure owned staging URLs and test fixtures before execution. No live cache or evidence is fabricated.

Source: `.testmuai/tests; PRD.md`

### §3.5.1 — Explore and baseline stage

**Partial.** An EXPLORE state exists, but it does not establish a full accepted baseline and 20-browser map on every battle.

Source: `src/lib/agents.ts: startSabotage`

### §3.5.2–3 — Adversarial arena and referee

**Partial.** The original worker/branch workflow is preserved. The owned Chaos Lab target lets the Red team break a real page without touching any repository.

Source: `src/workspace/Operations.tsx; src/lib/agents.ts`

### §3.5.4–5 — Repair attempts and escalation

**Partial.** MAX_ATTEMPTS is three, with BLOCKED_NEEDS_HUMAN escalation. Patch checks and re-verification exist; there is no claimed proof of root-cause correctness, multi-worker race freedom, or full multi-target evidence merging.

Source: `src/lib/types.ts; src/lib/agents.ts`

### §3.5.6 — Self-verifying publication

**Partial.** Drafting, HMAC signing, a self-check request and the verification-to-publication transition exist. Editing a draft invalidates its previous verifier run.

Source: `src/lib/agents.ts; src/app/api/postmortems/[id]/route.ts`

### §4.1 — Core schema and additive recovery

**Present.** All six core tables plus settings and team roster are defined. The committed Drizzle baseline and a transaction-scoped advisory lock repair missing tables and columns without dropping existing rows. Incompatible types and unfillable legacy fields require operator migration.

Source: `src/db/schema.ts; src/db/bootstrap.ts; drizzle/0000_workspace_baseline.sql`

### §4.1 — Production tenant isolation

**Missing.** There is no organization key on the six core tables and no per-tenant PostgreSQL policies. A private single-tenant deployment is not a multi-tenant SaaS.

Source: `src/db/schema.ts`

### §4.2.1 — Unified execution dispatcher

**Present.** POST /api/kane/trigger accepts project-scoped replay and dispatches live jobs per target. It returns SSE URLs, not Supabase subscription tokens.

Source: `src/app/api/kane/trigger/route.ts; src/lib/kane.ts`

### §4.2.2 — GitHub PR and documentation gates

**Partial.** HMAC webhook verification, PR smoke jobs, reconciliation, and comments exist. PR smoke dispatch is desktop by default. Full git bisect, exact breaking-line attribution, check-run branch enforcement, and delivery deduplication are not implemented.

Source: `src/app/api/webhooks/github/route.ts; src/lib/agents.ts`

### §4.2.3 — Arena request boundary

**Partial.** Scenario validation and isolated-branch orchestration exist upstream. The Chaos Lab target avoids any remote mutation.

Source: `src/app/api/arena/sabotage/route.ts`

### §4.2.4 — Evidence-guided healer

**Partial.** Repair input includes failure context, logs, repository sources, and fixture values. It is not a guaranteed multimodal or AST-based repair, and requires external services for live operation.

Source: `src/lib/agents.ts: healBattle; src/lib/anticheat.ts`

### §4.2.5 — Incident post-mortem generator

**Partial.** Articles and social snippets are generated from the ledger. A passing live re-verification and validated evidence are required before signing. The full publication path was not exercised with real Kane credentials.

Source: `src/lib/agents.ts: publishPostmortem, selfVerify`

### §4.2.6 — Public receipt JSON and SVG

**Present.** Battle or linked run IDs resolve to JSON receipts or an SVG badge. Verification rechecks HMAC and stored digest.

Source: `src/app/api/receipt/[id]/route.ts`

### §5.1 — Four-minute demonstration

**External.** The storyboard is a plan, not a recording. A successful demo, real mobile run, and 45-second qualification proof cannot be inferred from the interface.

Source: `User blueprint §5.1`

### §5.2 — Live worker safeguards

**Partial.** Per-requester guards and reported balance checks exist. A ready remote account, durable job queue, global atomic credit reservations, sustained concurrency, and uptime remain deployment work.

Source: `src/lib/kane.ts: enforceRunGuards; worker/server.mjs`

### §6.1–4 — Launch kit and publishing authorization

**External.** HN, X, Reddit and LinkedIn templates are not evidence of publication. No engagement, award eligibility, pricing promise, or future event is certified.

Source: `User-supplied launch kit`

### Recovery — Schema-aware readiness

**Present.** Health probes all columns in all eight tables. A reachable server with an incompatible schema no longer passes as a healthy workspace.

Source: `src/app/api/health/route.ts`

### Recovery — Dashboard outage isolation

**Present.** Database errors are sanitized. A disconnected workspace keeps a labelled read-only view and retry action rather than exposing SELECT statements on every route.

Source: `src/lib/config.ts; src/workspace/workspace.tsx; src/workspace/Shell.tsx`

### Deployment — Reproducible Vercel build

**Present.** The standard Next.js preset uses npm ci and npm run build. The build no longer rewrites tsconfig; the migration is traced into server functions. Hosted deployment still needs the owner’s Vercel/Postgres configuration.

Source: `vercel.json; next.config.ts; tsconfig.json`

## Reference contracts

- https://github.com/LambdaTest/kane-cli/blob/main/skill-installer/skills/references/parsing.md
- https://github.com/LambdaTest/kane-cli/blob/main/docs/user-guide/evidence.md
- https://github.com/LambdaTest/kane-cli/blob/main/docs/user-guide/testrun.md
- https://openapi.vercel.sh/vercel.json

## Fine-detail differences from the proposed blueprint

- **Live proof versus source:** an implemented route, an authored test, and a validated native pack are three different things. Only the last, tied to a real passing run, can support a live receipt. The 75 findings contain 18 present, 38 partial, three missing, and 16 external items. Those counts are classifications, not a percentage of passing end-to-end coverage.
- **Versions:** the worker Dockerfile installs the CLI from npm without pinning v0.10.4. The worker's own version report is authoritative. No complete compatibility claim for every CLI version is made.
- **Event contract:** a numeric step with a supported status is a progress event even without a type. The raw JSONB record retains version, timestamp, PID, project/folder resolution, child flow, and extra fields. The UI displays child IDs rather than a complete parallel-flow graph. The audit does not equate a step count with a measured “agent tax.” Retries do not double-count inserted warnings or completed steps.
- **Evidence:** one-shot runs do not always copy packs to the project store; session storage and the stderr hint matter. Imported JSONB events are not byte-identical stdout. The verifier checks the pinned database digest, signature and run bindings; it does not re-download a public object on each receipt request. Independent archive-byte verification remains a separate task.
- **Mobile:** the blueprint's shorthand conflates mobile viewport checks, remote desktop Chrome, virtual devices, and native real devices. They are not interchangeable. Web and mobile members need separate compatible jobs. A shared objective plus two device labels is not dual-platform proof.
- **Time and cost:** SSE polling is not a less-than-100-ms WebSocket guarantee. The publisher's self-check request has a 90-second timeout rather than the storyboard's claimed 15 seconds. The 5× stream is a replay facility, not a guarantee that every genuine run finishes replaying in five seconds. Free credits, free hosting, and a zero-dollar deployment were not verified.
- **Gating:** a recorded “deployment locked” state or PR comment does not configure GitHub branch protection. Real required checks, commit-specific preview readiness, job deduplication and durable recovery must be configured and tested before relying on this for releases.
- **Publication:** the upstream article builder is ledger-driven Markdown composition, not proof of an LLM-written article. Public unverified previews are labelled and excluded from the published index. Editing an article clears the prior verifier link.
- **Commercial/launch:** the use of four track labels does not prove competition eligibility, rankings, adoption, revenue, or willingness to pay. No MIT license file was found in the upstream inventory; the launch template's MIT claim should not be published without an actual license decision.
- **Production safety:** the optional operator password is a per-deployment boundary, not role-based access control or multi-tenant RLS. A credential-free demonstration should have a dedicated database. The upstream in-memory worker queue and heuristic patch checks are not a fully hardened production agent platform.
