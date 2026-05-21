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

If genuinely new, run the two-phase investigation below.

---

### Phase A — Adaptive Questioning

Goal: collect enough context so Phase B (5 Whys) starts with facts, not guesses.

Ask **one question at a time**. After each answer, decide the next question based on what was just learned. Stop when you have: error category, environment, full error text, and what changed recently.

**Before asking any question:** check if a partial `docs/rootcause/<slug>.json` already exists with a `diagnostics[]` array. If it does, read those answers and skip questions already covered.

Branch on the first answer:

```
Where is it failing?
├── CI only
│   ├── Which CI step? (lint / typecheck / test / build)
│   ├── Full error output from the failing step?
│   └── Did it pass on the last push? What changed since?
├── Local only
│   ├── What command triggered it?
│   ├── Full error output?
│   └── Any recent env changes? (.env, docker, packages)
└── Both CI and local
    ├── Full error output?
    ├── Does it fail consistently or intermittently?
    └── What changed recently? (schema, deps, config)
```

Store each answer immediately into `diagnostics[]` in the rootcause JSON (create the file if it does not exist yet):

```json
{
  "id": "<slug>",
  "date": "<today>",
  "diagnostics": [
    { "q": "Where is it failing?", "a": "CI only" },
    { "q": "Which CI step?", "a": "Test (API)" }
  ]
}
```

---

### Phase B — 5 Whys

Once Adaptive Questioning has enough context, drill to the root condition. Ask one why at a time and wait for the answer before continuing.

| Why | Probe |
|-----|-------|
| Why 1 | Why did this specific thing fail? (immediate cause) |
| Why 2 | Why did that happen? (system behavior) |
| Why 3 | Why was it allowed to happen? (missing constraint) |
| Why 4 | Why didn't an existing check catch it? (prevention gap) |
| Why 5 | What structural condition allows it to recur? (root condition) |

Stop at Why 5 or earlier if the root condition is clear. Do not keep asking after the root is found.

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
No match in signature table — starting investigation.
[Adaptive Questioning questions appear here, one at a time]
[5 Whys questions appear here, one at a time]
Root condition: <what was found>
Rootcause entry written: docs/rootcause/<slug>.json
Signature table updated: <new row added above>
```
