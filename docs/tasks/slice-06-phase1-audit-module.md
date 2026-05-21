---
layer: L3
owner: audit-bounded-context
applies_to: apps/api/src/modules/audit/
last_reviewed: 2026-05-18
---

# Slice 6 Phase 1 — Audit Module (Domain + Application + Persistence + HTTP)

## Goal

Build the `audit` module end-to-end following hexagonal architecture. The module exposes an `AuditPort` that other modules will inject to write events. Implement a Prisma-backed repository that persists to the `AuditEvent` table with INSERT + SELECT only — no UPDATE or DELETE at any layer. Expose two Admin-only HTTP endpoints: a paginated filtered list and a CSV export stream.

## Sequencing

Must ship before Phase 2 and Phase 3. The real Prisma adapter built here replaces the noop adapter in auth/users (Phase 2) and is injected into content/media (Phase 3).

## Context to Load

- `.claude/templates/CONTEXT.md`
- `docs/02-Software-Requirements-Specification.md` § 5.7 (FR-AUDIT-01..06)
- `docs/02-Software-Requirements-Specification.md` § 9 (SEC-13)
- `docs/04-ARCH.md` § 4 (Hexagonal backend rules)

---

## Locked Design Decisions (from grilling session 2026-05-18)

- **Q1** — Audit writes: inject `AuditPort` directly into each use case — no event bus
- **Q2** — Append-only: port exposes only `save()` and `findMany()` — no update/delete at application OR database level
- **Q3** — Actor IP: plain `string` inside command object — controller extracts from `req.ip`
- **Q4** — Two endpoints: `GET /api/admin/audit` (JSON + pagination) and `GET /api/admin/audit/export` (CSV stream)

---

## Definition of Done

### Domain (`src/modules/audit/domain/`)

- [x] `AuditEvent` entity with fields: id, timestamp (UTC), actorId, actorIp, action (enum), targetType, targetId, summary
- [x] `AuditAction` enum covers: USER_LOGIN, USER_LOGIN_FAILED, USER_LOGOUT, USER_CREATED, USER_UPDATED, USER_DEACTIVATED, CONTENT_CREATED, CONTENT_UPDATED, CONTENT_STATUS_CHANGED, CONTENT_DELETED, MEDIA_UPLOADED, MEDIA_DELETED
- [x] `AuditPort` interface exposes only `save()` and `findMany()` — no update, no delete methods exist anywhere
- [x] Unit tests 100% on domain entity

### Application (`src/modules/audit/application/`)

- [x] `WriteAuditEventUseCase` — creates and persists an audit event
- [x] `ListAuditEventsUseCase` — filters by actorId, action, targetType, dateFrom, dateTo; paginated
- [x] `ExportAuditCsvUseCase` — returns all matching events as CSV string
- [x] Unit tests for all use cases using `FakeAuditRepository` (in-memory, no I/O)

### Persistence (`src/modules/audit/adapters/out/persistence/`)

- [x] `PrismaAuditRepository` implements `AuditPort`
- [x] No `update()` or `delete()` methods exist — not even private
- [x] Prisma schema: `AuditEvent` model added
- [x] Migration created under `apps/api/prisma/migrations/`
- [x] Integration tests against Testcontainers Postgres

### HTTP (`src/modules/audit/adapters/in/http/`)

- [x] `GET /api/admin/audit` — Admin only, filters: actorId, action, targetType, dateFrom, dateTo; pagination; returns `{ data: [...], pagination: { page, pageSize, total, totalPages } }`
- [x] `GET /api/admin/audit/export` — Admin only, same filters, returns `text/csv` with `Content-Disposition: attachment; filename="audit.csv"`
- [x] 401 for unauthenticated, 403 for non-Admin
- [x] Zod validation on all query params
- [x] Integration tests for both endpoints using Supertest

### Quality

- [x] `pnpm --filter @cms/api tsc --noEmit` exits 0
- [x] `pnpm --filter @cms/api lint` exits 0
- [x] `pnpm --filter @cms/api exec vitest run src/modules/audit` exits 0
- [x] Coverage ≥ 98% on audit module

---

## Acceptance Commands

```bash
# Type check
pnpm --filter @cms/api tsc --noEmit

# Lint
pnpm --filter @cms/api lint

# Audit module tests only
pnpm --filter @cms/api exec vitest run src/modules/audit

# Manual smoke — requires running API and admin JWT
curl -fsS -H "Authorization: Bearer $JWT" \
  "http://localhost:3000/api/admin/audit?page=1&pageSize=10" | jq .
# expect: { data: [...], pagination: { page: 1, pageSize: 10, total: N, totalPages: N } }

curl -fsS -H "Authorization: Bearer $JWT" \
  "http://localhost:3000/api/admin/audit/export" \
  -o audit.csv && head audit.csv
# expect: CSV file with header row
```

---

## Rollback

Revert the branch. The `AuditEvent` table is new — drop it manually if needed:

```bash
pnpm --filter @cms/api prisma migrate reset
```

No existing modules are touched in this phase.

---

## Out of Scope

- Replacing noop adapter in auth/users (Phase 2)
- Audit writes in content/media (Phase 3)
- Audit log UI in admin SPA (Slice 9)
- Tamper-evident checksum / external log shipping (SEC-13 — recommended, not blocking)
- API key create/revoke audit events (follow-up)

---

## Notes

- `AuditPort` must live in `domain/ports/` — owned by the domain, not the application layer
- `FakeAuditRepository` lives in `tests/doubles/` — reused across Phase 2 and Phase 3
- Prisma client must be regenerated after schema changes: `pnpm --filter @cms/api prisma generate`