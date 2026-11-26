# Vercel deployment and recovery

## Control plane

Import this repository using **Next.js** with the repository root as the root directory, the Node.js runtime supported by Next.js 16 (Node 22 recommended), and no static-export override. `vercel.json` declares `npm ci --include=dev` and `npm run build`. It does not alter source files, run database pushes during the build, or route API requests into a static SPA. SSE responses disable proxy buffering. The worker is not deployed as a Vercel Function.

The checked-in configuration was validated against https://openapi.vercel.sh/vercel.json. A passing local production build and schema validation do not mean that an owner’s Vercel project has already been deployed.

## Database checklist

1. Set `DATABASE_URL` separately for the appropriate Vercel Production and Preview environments. `localhost` on Vercel is **not** your hosted Postgres. Use the provider's supported pooled URL and a small connection limit. Keep different environments on separate databases.
2. Prefer verified TLS (`DATABASE_SSL=require`) with the provider's required CA. The legacy `no-verify` option exists only for compatibility; it does not verify the server identity.
3. Back up an existing database. On a trusted host, run `npx tsx scripts/prepare-database.ts` with the migration-role URL. The transactional additive upgrade is also automatic on the first request when `WORKSPACE_AUTO_MIGRATE` is not `false`. No `DROP` or force push is part of the automatic upgrade.
4. After provisioning, use a least-privileged runtime role with read/write/sequence access, and set `WORKSPACE_AUTO_MIGRATE=false`. Run migrations explicitly before future schema releases. If required legacy columns cannot be safely populated, preparation rolls back and an operator must map their values.
5. The workspace starts empty: there is no sample or mock data. Create a project in the UI and run a Chaos Lab battle to produce real records.
6. Redeploy after changing environment variables. Open `/api/health`: expect HTTP 200, `schema: ready`, eight tables. Then open `/api/workspace`: expect the projects, runs, battles, and settings JSON, not an HTML login page or SQL error.

If health fails, check DNS, TLS, connection pool limits, role/table permissions, and that the connection points to the migrated database. A healthy Postgres socket does not prove the schema is compatible. For an intentionally restricted runtime role, use the migration role to resolve missing columns rather than granting the application superuser access.

## Private and live operation

- **Protect all real workspaces** with a long random `WORKSPACE_PASSWORD` over HTTPS. Username: `operator`.  This is a single-workspace access boundary, not multi-tenant authentication.
- Set a fixed `APP_BASE_URL` to the trusted public origin. Never use an untrusted request host to configure worker callbacks. Time-limited preview hostnames must match the deployment actually being tested.
- Set `KANE_WORKER_URL` and matching server-side `WORKER_SHARED_SECRET` on the control plane and worker. Add `LT_USERNAME` and `LT_ACCESS_KEY` **only on the worker**. Real runs are not available without a protected workspace.
- Configure `HMAC_SECRET` with a high-entropy secret. Legacy receipts cease to validate if it is replaced. Do not expose it with `NEXT_PUBLIC_`.
- Optional integrations: a repository-scoped `GITHUB_TOKEN`, `GITHUB_WEBHOOK_SECRET`, a supported model provider key, and the storage credentials documented in `.env.example`. Avoid public uploads of session tokens, personal information, or private test traces. Configure storage access controls separately.
- `/api/worker/events` uses its own bearer authentication. `/api/webhooks/github` verifies the raw signed payload. Public receipt and article routes intentionally remain readable to the verifier. Do not put confidential incident details in public articles.
- Rate limiting is not full budget governance. Isolate test accounts, entitlements, and approved staging targets. Do not allow public, arbitrary, credentialed runs.

## Cloud worker prerequisites

Deploy the existing `render.yaml` separately, ensure the worker's health endpoint is reachable, and verify the installed CLI version. Configure the `remote-execution` plugin and the entitlement required by the selected grid job. A virtual mobile suite needs authored mobile target metadata and a compatible test app; `--device-name` alone is insufficient. No pre-authenticated cloud account is included here.

## Release checks

- Install from the committed lockfile; run Next.js type generation, TypeScript, and the production build.
- Verify the migration SQL appears in server output-file tracing manifests.
- Run the isolated recovery test against a disposable local cluster.
- Exercise all workspace destinations and an SSE replay. Confirm a failed workspace fetch leaves read-only navigation, never a raw failed query.
- Use actual sealed packs and real cloud credentials for a separate live acceptance test. Do not count synthetic records toward event qualification or live test coverage.

For a provider-specific CA, `DATABASE_CA_PEM` accepts the PEM content, including escaped newlines. This enables certificate verification rather than disabling it. Environment files, dependency directories, and local build/test artifacts are excluded from Vercel uploads.
