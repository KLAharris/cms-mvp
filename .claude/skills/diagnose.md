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

Check first whether it is a new variant of a known issue (e.g., a different module with a depcruise violation — still use §7 fix pattern). If it is, apply that fix.

If genuinely new, run the three-phase investigation below.

---

### Phase A — Adaptive Questioning (code-first)

Goal: collect enough context so Phase B (5 Whys) starts with facts, not guesses.

**Before asking the user anything**, investigate the code autonomously:

1. Read the file and line number from the stack trace
2. Run `git log --oneline -5` to check recent changes
3. Run `git diff HEAD~1` to see what changed
4. Check relevant config files (`.env.example`, `vitest.config.ts`, `ci.yml`)
5. Grep for the failing symbol across the codebase

Only ask the user a question if the code investigation does not reveal the answer. Ask one question at a time and branch based on the answer:

```
Where is it failing? (ask only if stack trace doesn't make it obvious)
├── CI only  → check .github/workflows/ci.yml and recent git log
├── Local only → check .env, docker-compose, recent file changes
└── Both → check code change that affected both environments
```

Store each finding and each user answer immediately into `diagnostics[]` in the rootcause JSON (create the file if it does not exist yet):

```json
{
  "id": "<slug>",
  "date": "<today>",
  "diagnostics": [
    { "q": "Stack trace file read", "a": "Line 47: contentType accessed on undefined req.file" },
    { "q": "git log", "a": "Last commit modified media.controller.ts" }
  ]
}
```

Stop Phase A when you have: error category, affected file, and what changed recently.

---

### Phase B — 5 Whys (autonomous — no user questions)

Use the context gathered in Phase A to drill to the root condition. Do not ask the user anything in this phase — investigate the code for each answer.

| Why | Probe | How to investigate |
|-----|-------|--------------------|
| Why 1 | Why did this specific thing fail? | Read the failing file at the error line |
| Why 2 | Why did that happen? | Trace the call chain — read callers and dependencies |
| Why 3 | Why was it allowed to happen? | Check for missing guards, validation, or null checks |
| Why 4 | Why didn't an existing check catch it? | Check CI config, depcruise rules, vitest config |
| Why 5 | What structural condition allows it to recur? | Look for the same pattern elsewhere in the codebase |

Stop at Why 5 or earlier if the root condition is clear. If code investigation hits a dead end at any Why, state what was found and what is still unknown — do not ask the user to fill the gap unless it is truly unknowable from code alone.

---

### Phase C — Write rootcause and close the loop

Once the root condition is known, tick each item before reporting done:

- [ ] `docs/rootcause/<slug>.json` completed — `symptom`, `rootcause`, `fix`, `recurrence_risk`, `automation_gap` all filled
- [ ] New row added to the signature table in Step 1 of this file
- [ ] `docs/runbook.md` — new section added: symptom → diagnose → fix → prevent
- [ ] `.claude/skills/diagnose.md` signature table updated (this file)
- [ ] `.claude/skills/prevent.md` — new check added if the bug can be caught automatically
- [ ] Harness updated — new CI step in `.github/workflows/ci.yml` or hook in `.claude/settings.json`, OR `automation_gap` filled in rootcause JSON explaining why it cannot be automated

Do not report the bug as fixed until all boxes are ticked.

---

## Output format

**If pattern matched (Steps 1–3):**
```
Pattern matched: <rootcause slug>
Root cause: <one sentence from the rootcause file>
Fix: <the specific change needed, with code snippet if applicable>
Prevent: <one-line prevention note>
```

**If new bug (Steps 4A–4C):**
```
No match in signature table — investigating.
[Code findings from Phase A appear here]
[Ask user only if code doesn't reveal the answer]
[5 Whys conclusions appear here — no user questions]
Root condition: <what was found>
Rootcause entry written: docs/rootcause/<slug>.json
Signature table updated: <new row added above>
```
