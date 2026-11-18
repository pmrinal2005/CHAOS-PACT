# Validation record

## Scope

Tested the updated Next.js control plane against local PostgreSQL, using the cloned `pmrinal2005/CHAOS-PACT` source at `58512ee4024621d6f0260c2a34ca278a9a521456`. No remote repository was mutated, no live Kane credits were consumed, and no deployment to an owner's Vercel account is claimed.

## Acceptance results

**25 of 25 Playwright browser/API tests passed** against the production preview. The suite is `tests/workspace.spec.ts`; the ten upstream prototype tests are preserved separately under `tests/legacy/`.

| Check | Result |
| --- | --- |
| All 12 navigation destinations load, plus execution theater | Passed |
| No dashboard route displays a raw failed database query | Passed |
| Time-window metrics, status filtering, chart visibility, ledger drill-down | Passed |
| SSE replay, ordered progress events, share URL, JSON sample download | Passed |
| Evidence frame navigation, keyboard controls, network and pack inspectors | Passed |
| Sample battle selection and replay without remote mutations | Passed |
| Command palette, searchable audit, status filtering, report export | Passed |
| Workspace outage, read-only navigation, retry and recovery | Passed |
| Fully disconnected sample playback without mutation requests | Passed |
| Four-step onboarding, URL validation, PRD ingestion, empty real project | Passed |
| Project changes persist; another project's replay cannot be selected | Passed |
| Team roster create/read/delete and reload persistence | Passed |
| Unsigned sample receipt, publication guard and live-dispatch guard | Passed |
| Public article and published index, missing-run 404 | Passed |
| Mobile drawer navigation and viewport width | Passed |

## Data-integrity tests

`tests/schema-recovery.integration.ts` creates and cleans up a separate local database. It does not modify the primary workspace schema to simulate failure.

- Recreated a legacy `projects` table without the expected new columns, containing a sentinel project. The additive upgrade retained the exact row and ID and created the seven missing tables. Sample initialization did not replace the existing project.
- Verified matching HMAC/digest bindings and rejection of missing digests, altered digests, and invalid pack-validation status. These are cryptographic unit fixtures, not claims of authentic Kane packs.
- Replayed duplicate worker callback batches: warnings were not duplicated, completed steps were counted rather than inferred from step indices, and separate child flows retained their context.
- Delivered simultaneous and late terminal callbacks: a finalized run was not reopened or reclassified.
- Verified public database-failure responses omit SQL text. The expected sanitized `42703` log comes from an intentional test case.

## Deployment and rendering

- The managed production build and startup health check passed.
- Both Drizzle configs passed `drizzle-kit check`. Regeneration reported no schema changes.
- `/api/health` reported connected PostgreSQL, a ready schema, and eight tables.
- `vercel.json` was checked twice against Vercel's published JSON schema. It uses the Next.js preset and a lockfile-based install; the referenced SSE and receipt routes exist.
- The migration SQL was confirmed in the Next.js file-tracing manifests for the workspace and health functions.
- Desktop (1440 × 960), laptop (1280 × 800), and mobile (390 × 844) rendering checks produced no resource errors or document-width overflow.
- JavaScript syntax validation of the Docker worker passed. This is not an authenticated cloud execution test.

## Release gate

Run the three independent checks from the project root: Next.js type generation, TypeScript with `--noEmit --pretty false`, and the Next.js production build. Then start the platform-managed preview and verify its health check. The final release logs are written to `/tmp/next-typegen.log`, `/tmp/tsc.log`, and `/tmp/build.log` in the validation environment.

## Not certified by these tests

A real TestMu AI login, actual grid execution, native evidence sealing, cloud object access, model-generated repairs, third-party quotas, external Vercel deployment, production-scale concurrency, tenant isolation, and hackathon qualification require separate acceptance. See `docs/BLUEPRINT_AUDIT.md` for the full classification.
