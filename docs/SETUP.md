# Manual wiring: Supabase, Render, TestMu AI, Vercel, GitHub

1. **Database (Supabase free):** create a project, copy the *Transaction pooler* connection string (port 6543). Set it as `DATABASE_URL` on Vercel. Add `DATABASE_SSL=require`. The first request creates the 8 tables additively.
2. **Storage (optional, for downloadable `.evidence` packs):** Supabase Storage, create a *public* bucket `evidence-packs`; give the worker `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET`.
3. **TestMu AI:** dashboard > Settings > Keys: copy username + access key. They go only on the Render worker as `LT_USERNAME` / `LT_ACCESS_KEY` (and GitHub secrets for the Action).
4. **Render worker:** New > Blueprint from this repo (`render.yaml`). Set `WORKER_SHARED_SECRET` (random 32+ chars), `LT_USERNAME`, `LT_ACCESS_KEY`, optional `GITHUB_TOKEN`, Supabase vars. Wait for `/health` to be green. Use a >=2GB instance for Chrome.
5. **Vercel:** import the repo (Next.js preset, root dir `.`). Environment: `DATABASE_URL`, `APP_BASE_URL=https://chaos-pact.vercel.app`, `KANE_WORKER_URL=https://<render-service>.onrender.com`, `WORKER_SHARED_SECRET` (same as worker), `HMAC_SECRET` (random 32+ bytes), `WORKSPACE_PASSWORD` (login `operator`), `KANE_CREDIT_BUDGET=10000`, optional `GROQ_API_KEY` / `GEMINI_API_KEY`, `GITHUB_TOKEN`, `GITHUB_WEBHOOK_SECRET`. Redeploy after saving.
6. **Smoke test:** open `/api/health` (expect 200), sign in, create a project pointing at `https://chaos-pact.vercel.app`, go to *Adversarial arena*, choose Chaos Lab, press *Unleash Saboteur*.
7. **GitHub:** repo secrets `LT_USERNAME`, `LT_ACCESS_KEY`; optional webhook to `/api/webhooks/github` (content type JSON, secret = `GITHUB_WEBHOOK_SECRET`, events: pull requests, push).
8. **Rotate** any access key that has been shared in chat or committed anywhere.
