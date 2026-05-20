---
layer: L3
owner: auth-bounded-context
applies_to: apps/api/src/modules/auth/
last_reviewed: 2026-05-19
---

# Slice 8 — Password Reset Flow

## Goal

Complete the password reset flow that was stubbed in Slice 1 Phase 2. A user requests a reset via email, receives a one-time link valid for 60 minutes, clicks the link and sets a new password. The link is single-use and invalidated after first use or expiry. All existing refresh tokens for the user are invalidated on successful reset via a `passwordChangedAt` timestamp check.

## Sequencing

Requires Slice 7 (NotificationModule) to be merged — `NotificationService.sendPasswordResetEmail` is called directly, no noop. Requires Slice 1 Phase 1 (auth core) — `User` entity and `RefreshUseCase` are extended here.

## Context to Load

- `.claude/templates/CONTEXT.md`
- `docs/02-Software-Requirements-Specification.md` § 5.1 (FR-AUTH-07, FR-AUTH-08)
- `docs/02-Software-Requirements-Specification.md` § 9 (SEC-07, SEC-11)
- `docs/04-ARCH.md` § 4 (Hexagonal backend rules)
- `docs/06-TEST-STRATEGY.md` § 7.3 (Application layer testing with fakes)
- `apps/api/src/modules/auth/` — existing auth module for reference
- `apps/api/src/modules/notification/` — NotificationService already wired

---

## Locked Design Decisions (from grilling session 2026-05-19)

- **Q1** — Routes: `POST /api/admin/auth/forgot-password` and `POST /api/admin/auth/reset-password` — consistent with existing auth route prefix
- **Q2** — Storage: separate `PasswordResetToken` table with `tokenHash`, `userId`, `expiresAt`, `usedAt` — not fields on `User`
- **Q3** — Email: wire real `NotificationService.sendPasswordResetEmail` — no noop
- **Q4** — Session invalidation: add `passwordChangedAt` to `User` table; `RefreshUseCase` rejects any token with `iat` before `passwordChangedAt`
- **Q5** — Rate limiting: NestJS Throttler, 5 req/hr/IP on forgot-password endpoint (SEC-07)
- **Q6** — Unknown email: silent early return, always return 200 — token and email only created for real active users (SEC-11)

---

## Definition of Done

### Domain (`src/modules/auth/domain/`)

- [ ] `PasswordResetToken` entity with fields: `id`, `tokenHash`, `userId`, `expiresAt`, `usedAt` (nullable)
- [ ] Domain logic: `isExpired()` — returns true if `expiresAt` < now
- [ ] Domain logic: `isUsed()` — returns true if `usedAt` is not null
- [ ] Domain logic: `isValid()` — returns true if not expired and not used
- [ ] `PasswordResetTokenPort` interface: `save()`, `findByHash()`, `markUsed()`
- [ ] Unit tests 100% on domain entity logic

### Schema (`apps/api/prisma/schema.prisma`)

- [ ] `PasswordResetToken` model added with fields: `id`, `tokenHash` (unique), `userId` (FK → User), `expiresAt`, `usedAt` (nullable), `createdAt`
- [ ] `passwordChangedAt` (nullable DateTime) added to `User` model
- [ ] Migration created under `apps/api/prisma/migrations/`

### Application (`src/modules/auth/application/`)

- [ ] `RequestPasswordResetUseCase`:
  - Accepts `email`
  - Looks up user by email — if not found or deactivated, returns silently (no error, no email)
  - Generates a cryptographically random raw token, stores `sha256` hash
  - Sets `expiresAt` to now + 60 minutes
  - Persists `PasswordResetToken`
  - Calls `NotificationService.sendPasswordResetEmail(user.email, token)` — passes raw token
  - Always returns void (caller always gets 200)
- [ ] `ResetPasswordUseCase`:
  - Accepts `token` (raw) and `newPassword`
  - Hashes token, looks up `PasswordResetToken` by hash
  - Rejects if not found, expired, or already used — throws `InvalidResetTokenError`
  - Validates new password meets minimum requirements (FR-AUTH-02)
  - Hashes new password with Argon2id
  - Updates `User.passwordHash` and sets `User.passwordChangedAt` to now
  - Marks token as used (`usedAt` = now)
  - All above in a single transaction
- [ ] `RefreshUseCase` updated: after validating JWT, check `User.passwordChangedAt` — if token `iat` < `passwordChangedAt`, reject with 401
- [ ] Unit tests for all three use cases using fakes:
  - `RequestPasswordResetUseCase`: unknown email → silent return; known email → token saved + email sent
  - `ResetPasswordUseCase`: valid token → password updated + token marked used + `passwordChangedAt` set; expired token → rejected; used token → rejected
  - `RefreshUseCase`: token issued before `passwordChangedAt` → rejected

### Persistence (`src/modules/auth/adapters/out/persistence/`)

- [ ] `PrismaPasswordResetTokenRepository` implements `PasswordResetTokenPort`
  - `save(token)` — inserts new row
  - `findByHash(hash)` — returns token or null
  - `markUsed(id)` — sets `usedAt` to now
- [ ] Integration tests against Testcontainers Postgres

### HTTP (`src/modules/auth/adapters/in/http/`)

- [ ] `POST /api/admin/auth/forgot-password`:
  - Accepts `{ email: string }` — Zod validated
  - Always returns `200 { message: "If that email exists you will receive a reset link" }`
  - Rate limited: 5 req/hr/IP via NestJS Throttler
  - No auth guard required (public endpoint)
- [ ] `POST /api/admin/auth/reset-password`:
  - Accepts `{ token: string, password: string }` — Zod validated
  - Returns `200` on success
  - Returns `400` with `INVALID_RESET_TOKEN` error code on invalid/expired/used token
  - No auth guard required (public endpoint)
- [ ] Integration tests for both endpoints using Supertest

### Quality

- [ ] `pnpm --filter @cms/api tsc --noEmit` exits 0
- [ ] `pnpm --filter @cms/api lint` exits 0
- [ ] `pnpm --filter @cms/api run depcruise` exits 0
- [ ] `pnpm --filter @cms/api exec vitest run src/modules/auth` exits 0
- [ ] Coverage ≥ 98% on changed auth module files

---

## Acceptance Commands

```bash
# Type check
pnpm --filter @cms/api tsc --noEmit

# Lint
pnpm --filter @cms/api lint

# Depcruise
pnpm --filter @cms/api run depcruise

# Auth module tests
pnpm --filter @cms/api exec vitest run src/modules/auth

# Manual smoke — request reset (always 200)
curl -fsS -X POST http://localhost:3000/api/admin/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com"}' | jq .
# expect: 200 { message: "If that email exists you will receive a reset link" }

# Manual smoke — unknown email (always 200, no enumeration)
curl -fsS -X POST http://localhost:3000/api/admin/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"nobody@example.com"}' | jq .
# expect: 200 — identical response

# Manual smoke — reset with token (get raw token from logs or DB)
curl -fsS -X POST http://localhost:3000/api/admin/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"<raw-token>","password":"NewPassword123"}' | jq .
# expect: 200

# Second use of same token
# expect: 400 INVALID_RESET_TOKEN

# Verify old refresh token rejected after reset
# 1. Login and get refresh token cookie
# 2. Reset password
# 3. Try to refresh with old cookie
# expect: 401
```

---

## Rollback

Revert the branch. Drop `password_reset_tokens` table and remove `passwordChangedAt` from `users` table if needed:

```bash
pnpm --filter @cms/api prisma migrate reset
```

No other modules are touched.

---

## Out of Scope

- Frontend reset password UI (Slice 9 / post-MVP)
- E2E-07 full flow — deferred until frontend exists
- Password reset audit event (follow-up — not in FR-AUDIT-02)
- Account recovery without email access

---

## Notes

- Raw token is never stored — only `sha256` hash persisted (mirrors API key pattern from Slice 5)
- `NotificationService` assembles the full reset link using `FRONTEND_BASE_URL` — this use case only passes the raw token
- `passwordChangedAt` check in `RefreshUseCase` must handle the case where `passwordChangedAt` is null (user has never reset their password) — treat null as "no restriction"
- Transaction in `ResetPasswordUseCase` must cover password hash update + `passwordChangedAt` update + token `markUsed` atomically — partial failure must not leave a used token pointing to an unchanged password