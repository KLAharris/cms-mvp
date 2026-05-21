# CLAUDE.md — CMS MVP

This file is read automatically by Claude Code at the start of every session. It is the single source of truth for project context, architecture rules, and workflow.

---

## What This System Does

A headless CMS with two surfaces:
- **Admin API** — authenticated REST API (JWT) used by the admin SPA
- **Public API** — read-only REST API (X-API-Key) for external frontends

Content goes through a draft → in_review → published lifecycle. Media is stored in S3/MinIO with variant generation via BullMQ. All mutations are recorded in an append-only audit log.

---

## Stack

| Layer        | Tech                                                              |
| ------------ | ----------------------------------------------------------------- |
| Framework    | NestJS + TypeScript strict mode                                   |
| ORM          | Prisma 6 + PostgreSQL (Neon in prod, Testcontainers in CI)        |
| Validation   | Zod                                                               |
| Queue        | BullMQ + Redis 7                                                  |
| Storage      | MinIO (local) / S3-compatible (prod)                              |
| Testing      | Vitest, Supertest, Testcontainers                                 |
| CI           | GitHub Actions                                                    |
| Package mgr  | pnpm workspaces                                                   |

---

## Architecture — Hexagonal (Ports & Adapters)

Every module has exactly three layers. Dependencies point inward only.

```
adapters/in/http/      ← NestJS controllers (driving)
application/           ← use cases + port interfaces
domain/                ← entities, value objects, domain services (pure TS)
adapters/out/          ← Prisma repos, Redis cache, S3 storage (driven)
```

### Hard Rules — Code Review Failures If Violated

- No Prisma types inside `application/` or `domain/`
- No NestJS decorators inside `application/` or `domain/`
- No `import` from `adapters/` inside `application/` or `domain/`
- Domain invariants enforced on the entity, never in the controller
- Authorization checked at BOTH route layer AND use case layer
- `AuditPort` injected directly into use cases — no event bus

---

## Module Status

| Module       | Status      | Responsibility                                      |
| ------------ | ----------- | --------------------------------------------------- |
| auth         | ✅ Done     | Login, JWT, refresh tokens, password reset, API keys |
| users        | ✅ Done     | User CRUD, role assignment, invite flow             |
| content      | ✅ Done     | Article/Page CRUD, lifecycle, scheduling, versioning |
| media        | ✅ Done     | Upload pipeline, variants, library                  |
| public-api   | ✅ Done     | Read-only endpoints, caching, rate limiting, OpenAPI |
| audit        | ✅ Done     | Append-only event log, admin list/filter/export     |
| notifications| ✅ Done     | Email: password reset, user invites (Resend + BullMQ) |
| web (SPA)    | ✅ Done     | React + MUI v6, auth screens, dashboard, content editor, media library |

---

## Key Decisions (Locked)

- Access token: 15 min, Bearer header
- Refresh token: 7 days, HTTP-only cookie, rotation on use
- API key: sha256 hash stored, raw returned once on creation
- Public API auth: `X-API-Key` header → `ApiKeyGuard`
- Test database: Neon branch `cms_test` (`TEST_DATABASE_URL`)
- Redis: `redis://localhost:6379` local, `redis:7-alpine` in CI
- Cache TTL: list 300s, detail 600s
- Rate limit: 60 req/min per API key via `ApiKeyThrottlerGuard`
- Swagger UI at `/docs`, Redoc at `/redoc`
- Soft delete: 30-day retention, then hard delete via BullMQ cron
- Audit log: append-only — `AuditPort` exposes only `save()` and `findMany()`, no update/delete at any layer
- Actor IP: passed as plain string in command objects — controllers extract from `req.ip`

---

## Repository Structure

```
cms-mvp/
├── apps/
│   ├── api/                  ← NestJS backend (hexagonal)
│   │   ├── src/modules/      ← one folder per module
│   │   ├── prisma/           ← schema + migrations
│   │   └── test/             ← fakes, builders, integration, e2e
│   └── web/                  ← React SPA (not started yet)
├── docs/
│   ├── tasks/                ← slice task files (DoD per phase, markdown)
│   ├── tickets/              ← structured JSON tickets (CMS-001..CMS-020)
│   ├── coverage/             ← per-module coverage marker files (*.covered)
│   ├── rootcause/            ← bug rootcause cache (one JSON per bug)
│   ├── prompts/              ← grill-me.md and other skills
│   └── 01..09-*.md           ← project documentation
├── PROGRESS.md               ← session state (in progress / blocked / done)
└── .claude/
    └── templates/            ← CONTEXT.md, EVAL_TASK.md, README.md
```

---

## Test Patterns

- **Domain tests**: pure unit, no I/O
- **Use case tests**: unit with in-memory fakes (never mocks)
- **Adapter tests**: Vitest + Testcontainers Postgres or Supertest
- **Fakes**: `apps/api/test/fakes/` or `apps/api/tests/doubles/`
- **Builders**: `apps/api/test/builders/`
- Coverage target: ≥ 98% line/branch; 100% on critical paths

---

## Git & PR Workflow

- Branch: `feat/slice<N>-<name>` or `feat/slice<N>-phase<P>-<name>`
- Commits: conventional commit format (`feat:`, `fix:`, `test:`, `chore:`)
- Codex/Claude Code does NOT commit or push unless explicitly told to
- One PR per phase, squash merge to main via `gh pr merge --squash`
- CI must be green before merge

---

## Definition of Done (per change)

A task is done when:
1. All DoD checks in the task file pass
2. `pnpm --filter @cms/api typecheck` exits 0
3. `pnpm --filter @cms/api lint` exits 0
4. Relevant Vitest suite exits 0
5. No pre-existing tests broken
6. No Prisma/NestJS types leaked into domain or application layers

## Task Checkbox Rule

When a DoD checkbox in a `docs/tasks/*.md` file is satisfied by code you have written or verified, edit that file and tick the box (`[ ]` → `[x]`) before moving to the next item. Do not batch-tick at the end — tick each item as it is confirmed passing.

## Session Protocol

At the start of every session: read `PROGRESS.md` to understand what is in progress, blocked, and next.
At the end of every session: update `PROGRESS.md` — move completed tickets to Recently Done, update In Progress, note any new blockers.

## Bug Loop Protocol (mandatory — run in order every time a bug is fixed)

When a bug is found and fixed, complete all four steps before closing the task:

1. **Rootcause** — write `docs/rootcause/<slug>.json` *before* applying the fix. Use `/diagnose` to match against known patterns first; only create a new entry if no match exists.
2. **Runbook** — add or update the section in `docs/runbook.md`: symptom → diagnose commands → fix → prevent rule.
3. **Skill** — if the error pattern is new, add a row to the signature table in `.claude/skills/diagnose.md`. If the prevention check is new, add a Check block to `.claude/skills/prevent.md`.
4. **Harness** — decide if the bug can be caught automatically. If yes: add a CI step to `.github/workflows/ci.yml` or a hook to `.claude/settings.json`. If no (requires human judgment): document why in the rootcause JSON under `"automation_gap"`.

**The harness (CI) does not update itself.** Steps 1–3 are Claude's responsibility. Step 4 requires a code change that Claude makes. CI only runs what is already configured.

---

## Common Commands

```bash
# Type check
pnpm --filter @cms/api typecheck

# Lint
pnpm --filter @cms/api lint

# Run all tests
pnpm --filter @cms/api test

# Run tests for a specific module
pnpm --filter @cms/api exec vitest run src/modules/<module>

# Prisma migrate (dev)
pnpm --filter @cms/api prisma migrate dev

# Regenerate Prisma client after schema changes
pnpm --filter @cms/api prisma generate

# Check architecture constraints
pnpm --filter @cms/api depcruise
```

---

## Known Gotchas

- Redis requires auth locally (`requirepass` in docker-compose) but CI uses no-auth `redis:7-alpine`. Tests hitting Redis locally fail with `NOAUTH` — this is expected and pre-existing; CI is the source of truth.
- Neon free tier has cold starts — integration tests may be slow on first run.
- Prisma client must be regenerated after schema changes.
- `TEST_DATABASE_URL` must point to the `cms_test` Neon branch, not main.
- Media tests live under `apps/api/test/unit/media/` not `src/modules/media/`.
- `tsc --noEmit` has no script — use `pnpm --filter @cms/api typecheck` instead.