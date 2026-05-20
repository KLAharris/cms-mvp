---
layer: L3
owner: auth-bounded-context
applies_to: apps/api/src/modules/auth/
last_reviewed: 2026-05-18
---

# Slice 1 Phase 1 — Authentication Core (Login, JWT, Refresh, Logout, Lockout)

## Goal

Implement the core authentication flow: email/password login, JWT access token issuance, refresh token rotation, logout, and account lockout after 5 failed attempts. Passwords hashed with Argon2id. Tokens follow the locked decisions below.

## Sequencing

Foundation slice — all other slices depend on JWT auth being in place.

## Context to Load

- `.claude/templates/CONTEXT.md`
- `docs/02-Software-Requirements-Specification.md` § 5.1 (FR-AUTH-01..10)
- `docs/02-Software-Requirements-Specification.md` § 9 (SEC-07, SEC-11, SEC-12)
- `docs/04-ARCH.md` § 4

---

## Locked Design Decisions

- Access token: 15 min TTL, Bearer header
- Refresh token: 7 days TTL, HTTP-only cookie, rotation on every use
- Password hashing: Argon2id
- Account lockout: 5 failed attempts in 10 min → locked 15 min
- Refresh token reuse detection: invalidate entire family on reuse

---

## Definition of Done

### Domain (`src/modules/auth/domain/`)

- [ ] `User` entity or value object with email, passwordHash, role, status, failedLoginCount, lockedUntil
- [ ] `RefreshToken` entity with token hash, userId, expiresAt, used flag
- [ ] `AuthPort` / `TokenPort` interfaces defined
- [ ] Unit tests 100% on domain logic (lockout, token expiry)

### Application (`src/modules/auth/application/`)

- [ ] `LoginUseCase` — validates credentials, checks lockout, issues access + refresh tokens, writes audit event
- [ ] `RefreshUseCase` — rotates refresh token, detects reuse, issues new access token
- [ ] `LogoutUseCase` — invalidates refresh token server-side, writes audit event
- [ ] Unit tests for all use cases with fakes

### Persistence (`src/modules/auth/adapters/out/persistence/`)

- [ ] `PrismaUserRepository` — findByEmail, update login attempts, lock/unlock
- [ ] `PrismaRefreshTokenRepository` — save, findByHash, invalidate, invalidateFamily
- [ ] Integration tests against Testcontainers Postgres

### HTTP (`src/modules/auth/adapters/in/http/`)

- [ ] `POST /api/auth/login` — returns access token + sets refresh cookie
- [ ] `POST /api/auth/refresh` — reads cookie, returns new access token
- [ ] `POST /api/auth/logout` — clears cookie, invalidates token
- [ ] `JwtAuthGuard` — validates Bearer token on protected routes
- [ ] Rate limiting on login: 10 req/min/IP (SEC-07)
- [ ] Integration tests with Supertest

### Quality

- [ ] `pnpm --filter @cms/api tsc --noEmit` exits 0
- [ ] `pnpm --filter @cms/api lint` exits 0
- [ ] `pnpm --filter @cms/api exec vitest run src/modules/auth` exits 0

---

## Acceptance Commands

```bash
pnpm --filter @cms/api exec vitest run src/modules/auth

# Manual smoke
curl -fsS -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}' | jq .
# expect: { accessToken: "..." } + Set-Cookie refresh token

# Test lockout — 5 failed attempts
for i in {1..6}; do
  curl -fsS -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@example.com","password":"wrong"}' | jq .code
done
# expect: 6th attempt returns generic error even with correct password
```

---

## Rollback

Revert the branch. No data migration. Drop `users` and `refresh_tokens` tables if needed via `prisma migrate reset`.

---

## Out of Scope

- Password reset email (Phase 2)
- API key management (Slice 5 Phase 1)
- SSO / OAuth (out of MVP scope)

---

## Notes

- Lockout state must NOT reveal to the client whether the account is locked (generic error message only — FR-AUTH-06)
- Refresh token stored as sha256 hash, raw value only in the HTTP-only cookie
- `noop-audit-logger.adapter.ts` used here as placeholder — replaced in Slice 6 Phase 2