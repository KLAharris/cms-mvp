---
layer: L3
owner: audit-bounded-context
applies_to: apps/api/src/modules/auth/, apps/api/src/modules/users/
last_reviewed: 2026-05-18
---

# Slice 6 Phase 2 — Retrofit Auth & Users with Real Audit Adapter

## Goal

Replace the existing `noop-audit-logger.adapter.ts` in the `auth` module with the real `PrismaAuditRepository` built in Phase 1. Wire both `auth` and `users` modules to persist audit events to the database. All existing audit-related tests must continue to pass.

## Sequencing

Requires Phase 1 to be merged. `PrismaAuditRepository` and `FakeAuditRepository` must exist before this phase runs.

## Context to Load

- `.claude/templates/CONTEXT.md`
- `docs/tasks/slice-06-phase1-audit-module.md`
- `docs/02-Software-Requirements-Specification.md` § 5.7 (FR-AUDIT-02)

---

## Locked Design Decisions (from grilling session 2026-05-18)

- **Q1** — Direct injection: `AuditPort` injected into use cases — no event bus
- **Q6** — Build order: Phase 1 (real adapter) before Phase 2 (retrofit) — audit events must actually persist

---

## Definition of Done

### Auth Module (`src/modules/auth/`)

- [x] `noop-audit-logger.adapter.ts` deleted
- [x] `auth.module.ts` wired to `PrismaAuditRepository` from the audit module
- [x] `login`, `logout`, `refresh` use cases confirmed writing real audit events
- [x] All existing auth audit tests pass with `FakeAuditRepository`
- [x] No test imports `noop-audit-logger`

### Users Module (`src/modules/users/`)

- [x] `users.module.ts` wired to `PrismaAuditRepository` from the audit module
- [x] `invite-user`, `deactivate-user`, `update-user` use cases confirmed writing real audit events
- [x] All existing users audit tests pass with `FakeAuditRepository`

### Quality

- [x] `pnpm --filter @cms/api tsc --noEmit` exits 0
- [x] `pnpm --filter @cms/api lint` exits 0
- [x] `pnpm --filter @cms/api exec vitest run src/modules/auth` exits 0
- [x] `pnpm --filter @cms/api exec vitest run src/modules/users` exits 0
- [x] No pre-existing tests broken

---

## Acceptance Commands

```bash
# Auth tests
pnpm --filter @cms/api exec vitest run src/modules/auth

# Users tests
pnpm --filter @cms/api exec vitest run src/modules/users

# Confirm noop is gone
find apps/api/src -name "noop-audit*" | wc -l
# expect: 0

# Manual smoke — login and check audit table has a record
curl -fsS -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}' | jq .

curl -fsS -H "Authorization: Bearer $JWT" \
  "http://localhost:3000/api/admin/audit?action=USER_LOGIN" | jq .
# expect: at least one audit event
```

---

## Rollback

Revert the branch. Restore `noop-audit-logger.adapter.ts` and revert module wiring. Phase 1 remains unaffected.

---

## Out of Scope

- Audit writes in content/media (Phase 3)
- Any new audit actions beyond what auth/users already had
