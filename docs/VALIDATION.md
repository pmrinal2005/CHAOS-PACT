# Validation record

Verified against local PostgreSQL and the real TestMu AI cloud account (Kane CLI 0.10.9):

- Chaos Lab battle `silent_stripe_500`: Kane `run` failed with exit 1 and `result_code 740` (sealed evidence), the healer applied a scoped repair that passed the anti-cheat audit, Kane re-verified with exit 0, the HMAC receipt validated at `/api/receipt/<battle>`, and the post-mortem was published after Kane self-verified the public page (exit 0).
- No seeded, sample or mock records exist in the application or the database.
- Type generation, `tsc --noEmit`, `next build`, and the Playwright suite in `tests/workspace.spec.ts` pass.
