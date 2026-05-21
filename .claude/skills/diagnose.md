# /diagnose — Match an error to a known rootcause and fix it

When the user pastes an error message or test failure output, follow these steps:

## Step 1 — Identify the pattern

Scan the error for these known signatures:

| Signature in error | Rootcause | Runbook section |
|--------------------|-----------|-----------------|
| `Connection is closed` + Redis + test teardown | redis-teardown-race-condition | Runbook §1 |
| `Test timed out` + rate limit / throttle / 60 req | rate-limit-test-timeout | Runbook §2 |
| `Missing script: dev` + web / @cms/web | web-missing-dev-script | Runbook §3 |
| `RESEND_API_KEY is required` + startup | resend-eager-init-crash | Runbook §4 |
| `depcruise` violation + notification / barrel | notification-service-barrel-depcruise | Runbook §5 |
| Upload accepts wrong MIME / 200 without auth on media | media-security-missing-validation | Runbook §6 |
| `depcruise` + `@prisma/client` + application / domain | depcruise-16-architecture-violations | Runbook §7 |
| `Foreign key constraint failed` + integration test | integration-test-fk-cleanup-order | Runbook §8 |
| `Hook timed out` + `beforeAll` + Testcontainers / postgres | testcontainers-timeout-public-content | Runbook §9 |
| `ETIMEDOUT` / `connect ETIMEDOUT` + Neon / TEST_DATABASE_URL | users-test-neon-cold-start | Runbook §10 |

## Step 2 — Read the matching rootcause file

Read `docs/rootcause/<matched-slug>.json` to get the exact symptom, rootcause, and fix.

## Step 3 — Apply the fix from the runbook

Open `docs/runbook.md` and navigate to the matching section. Follow the **Diagnose → Fix** steps exactly.

## Step 4 — If no pattern matches

1. Check whether it's a new variant of a known issue (e.g., a different module with a depcruise violation — still use §7 fix pattern).
2. If genuinely new, ask the user to describe when it started, what changed, and whether it's reproducible.
3. Once diagnosed and fixed, write a new rootcause entry to `docs/rootcause/<slug>.json` using the README format.

## Output format

Reply with:
```
**Pattern matched:** <rootcause slug>
**Root cause:** <one sentence from the rootcause file>
**Fix:** <the specific change needed, with code snippet if applicable>
**Prevent:** <one-line prevention note>
```
If no pattern matches, say "No matching rootcause" and ask the two diagnostic questions above.
