---
layer: L3
owner: users-bounded-context
applies_to: apps/api/src/modules/users/
last_reviewed: 2026-05-18
---

# Slice 2 — User Management

## Goal

Implement full user management for Admins: invite users by email (one-time link, 7-day TTL), list users, update role, deactivate users. Enforce RBAC: only Admins can manage users. All mutations written to audit log.

## Sequencing

Requires Slice 1 Phase 1 (JWT + guards). Email invite uses noop adapter — real email in Slice 8.

## Context to Load

- `.claude/templates/CONTEXT.md`
- `docs/02-Software-Requirements-Specification.md` § 5.2 (FR-USER-01..08)
- `docs/02-Software-Requirements-Specification.md` § 5.3 (FR-AUTHZ-01..04)
- `docs/04-ARCH.md` § 4

---

## Locked Design Decisions

- Only Admins can create, update, deactivate users (FR-USER-01)
- Invite flow: one-time link, 7-day TTL (FR-USER-02)
- Last Admin cannot be deactivated (FR-USER-04)
- Deactivated users denied login immediately; content remains intact (FR-USER-05)
- All mutations written to audit log (FR-USER-08)

---

## Definition of Done

### Domain (`src/modules/users/domain/`)

- [ ] `User` entity with id, email, name, role (ADMIN/EDITOR/AUTHOR), status (active/deactivated/invited), lastLoginAt
- [ ] `InviteToken` entity with token hash, email, role, expiresAt
- [ ] Domain rule: cannot deactivate last Admin
- [ ] Unit tests 100% on domain invariants

### Application (`src/modules/users/application/`)

- [ ] `InviteUserUseCase` — generates invite token, sends email (noop), writes audit
- [ ] `ListUsersUseCase` — paginated list with name, email, role, status, lastLoginAt
- [ ] `UpdateUserUseCase` — update name and/or role, writes audit
- [ ] `DeactivateUserUseCase` — deactivates user, blocks login, writes audit; rejects if last Admin
- [ ] Unit tests with fakes for all use cases

### Persistence (`src/modules/users/adapters/out/persistence/`)

- [ ] `PrismaUserRepository` — findAll, findById, save, deactivate
- [ ] `PrismaInviteTokenRepository` — save, findByHash, markUsed
- [ ] Integration tests

### HTTP (`src/modules/users/adapters/in/http/`)

- [ ] `POST /api/admin/users/invite` — Admin only
- [ ] `GET /api/admin/users` — Admin only, paginated
- [ ] `PATCH /api/admin/users/:id` — Admin only
- [ ] `DELETE /api/admin/users/:id` — Admin only (soft deactivate)
- [ ] 401/403 on unauthorized access
- [ ] Integration tests with Supertest

### Quality

- [ ] `pnpm --filter @cms/api tsc --noEmit` exits 0
- [ ] `pnpm --filter @cms/api lint` exits 0
- [ ] `pnpm --filter @cms/api exec vitest run src/modules/users` exits 0

---

## Acceptance Commands

```bash
pnpm --filter @cms/api exec vitest run src/modules/users

# List users
curl -fsS -H "Authorization: Bearer $ADMIN_JWT" \
  http://localhost:3000/api/admin/users | jq .

# Invite user
curl -fsS -X POST http://localhost:3000/api/admin/users/invite \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"email":"editor@example.com","role":"EDITOR"}' | jq .
# expect: 201

# Deactivate last admin
# expect: 400/422 with error message
```

---

## Rollback

Revert the branch. No new tables — `users` table extended from Slice 1.

---

## Out of Scope

- Real invite email (Slice 8)
- User profile / change own password (separate admin endpoint)
- SSO / OAuth (out of MVP scope)