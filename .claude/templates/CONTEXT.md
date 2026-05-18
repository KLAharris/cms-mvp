# CMS-MVP — Agent Context

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

**Hard rules — these are code review failures if violated:**
- No Prisma types inside `application/` or `domain/`
- No NestJS decorators inside `application/` or `domain/`
- No `import` from `adapters/` inside `application/` or `domain/`
- Domain invariants enforced on the entity, never in the controller
- Authorization checked at BOTH route layer AND use case layer

---

## Modules

| Module       | Status | Responsibility                                      |
| ------------ | ------ | --------------------------------------------------- |
| auth         | ✅ Done | Login, JWT, refresh tokens, password reset, API keys |
| users        | ✅ Done | User CRUD, role assignment, invite flow             |
| content      | ✅ Done | Article/Page CRUD, lifecycle, scheduling            |
| media        | ✅ Done | Upload pipeline, variants, library                  |
| public-api   | ✅ Done | Read-only endpoints, caching, rate limiting, OpenAPI |
| audit        | 🔲 Next | Append-only event log, admin list/filter/export     |
| notifications| 🔲 Todo | Email: password reset, user invites                 |

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
- Audit log: append-only at DB level — no UPDATE/DELETE on audit table

---

## Module Folder Structure (Example: `auth`)

```
src/modules/auth/
├── domain/
│   ├── entities/
│   ├── value-objects/
│   └── ports/           ← interfaces owned by the domain
├── application/
│   ├── use-cases/
│   └── services/
└── adapters/
    ├── in/
    │   └── http/        ← controllers, guards, DTOs
    └── out/
        ├── persistence/ ← Prisma repositories
        └── crypto/      ← password hasher, token generator
```

---

## Test Patterns

- **Domain tests**: pure unit, no I/O, no fakes needed
- **Use case tests**: unit with in-memory port fakes (not mocks)
- **Adapter tests**: Vitest + Testcontainers Postgres or Supertest
- **Fakes live in**: `test/fakes/`
- **Builders live in**: `test/builders/`
- Coverage target: ≥ 98% line/branch; 100% on critical paths (auth, authz, content lifecycle, public API gating)

---

## Git & PR Workflow

- Branch: `feat/slice<N>-<name>` or `feat/slice<N>-phase<P>-<name>`
- Commits: conventional commit format (`feat:`, `fix:`, `test:`, `chore:`)
- Codex/Claude Code does NOT commit or push — developer reviews and commits manually
- One PR per phase, squash merge to main via `gh pr merge --squash`
- CI must be green before merge

---

## Common Commands

```bash
# Run all tests
pnpm test

# Run tests for a specific module
pnpm --filter api vitest run src/modules/audit

# Type check
pnpm --filter api tsc --noEmit

# Lint
pnpm --filter api lint

# Prisma migrate (dev)
pnpm --filter api prisma migrate dev

# Check architecture constraints
pnpm --filter api depcruise
```

---

## Known Gotchas

- `YYYY-MM-DD` — Redis requires auth locally (`requirepass` in docker-compose) but CI uses no-auth `redis:7-alpine`. Tests that hit Redis locally will fail with `NOAUTH` — this is expected and pre-existing; CI is the source of truth.
- Neon free tier has cold starts — integration tests may be slow on first run.
- Prisma client must be regenerated after schema changes: `pnpm --filter api prisma generate`.
- `TEST_DATABASE_URL` must point to the `cms_test` Neon branch, not main.