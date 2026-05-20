---
layer: L3
owner: auth-bounded-context
applies_to: apps/api/src/modules/auth/
last_reviewed: 2026-05-18
---

# Slice 1 Phase 2 — Password Reset

## Goal

Implement the password reset flow: user requests reset via email, receives a one-time link valid for 60 minutes, clicks link and sets a new password. Link is single-use and invalidated after first use or expiry.

## Sequencing

Requires Phase 1 (auth core) to be merged. Email adapter can be a noop/stub for MVP — real email wired in Slice 8 (Notifications).

## Context to Load

- `.claude/templates/CONTEXT.md`
- `docs/02-Software-Requirements-Specification.md` § 5.1 (FR-AUTH-07, FR-AUTH-08)
- `docs/02-Software-Requirements-Specification.md` § 9 (SEC-07)

---

## Locked Design Decisions

- Reset link TTL: 60 minutes
- Reset token: single-use, invalidated on first use or expiry
- Rate limiting on reset request: 5 req/hr/IP (SEC-07)
- Email sending: stubbed with noop adapter — real email in Slice 8

---

## Definition of Done

### Domain (`src/modules/auth/domain/`)

- [ ] `PasswordResetToken` entity with token hash, userId, expiresAt, usedAt
- [ ] Unit tests on token expiry and single-use logic

### Application (`src/modules/auth/application/`)

- [ ] `RequestPasswordResetUseCase` — generates token, sends email (via noop adapter), writes audit event
- [ ] `ResetPasswordUseCase` — validates token, updates password hash, invalidates token, invalidates all refresh tokens for user
- [ ] Unit tests with fakes

### Persistence (`src/modules/auth/adapters/out/persistence/`)

- [ ] `PrismaPasswordResetTokenRepository` — save, findByHash, markUsed
- [ ] Integration tests

### HTTP (`src/modules/auth/adapters/in/http/`)

- [ ] `POST /api/auth/forgot-password` — accepts email, always returns 200 (no enumeration)
- [ ] `POST /api/auth/reset-password` — accepts token + new password
- [ ] Rate limiting: 5 req/hr/IP on forgot-password
- [ ] Integration tests

### Quality

- [ ] `pnpm --filter @cms/api tsc --noEmit` exits 0
- [ ] `pnpm --filter @cms/api lint` exits 0
- [ ] `pnpm --filter @cms/api exec vitest run src/modules/auth` exits 0

---

## Acceptance Commands

```bash
pnpm --filter @cms/api exec vitest run src/modules/auth

# Manual smoke
curl -fsS -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com"}' | jq .
# expect: 200 always (no enumeration)

# Use token from logs/noop adapter to reset
curl -fsS -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"<token>","password":"NewPassword123"}' | jq .
# expect: 200

# Second use of same token
# expect: 400/422 invalid token
```

---

## Rollback

Revert the branch. Drop `password_reset_tokens` table if needed.

---

## Out of Scope

- Real email sending (Slice 8)
- Token delivery UI (Slice 9)