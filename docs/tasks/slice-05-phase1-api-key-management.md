---
layer: L3
owner: public-api-bounded-context
applies_to: apps/api/src/modules/auth/, apps/api/src/modules/public-api/
last_reviewed: 2026-05-18
---

# Slice 5 Phase 1 — API Key Management

## Goal

Implement API key issuance, listing, and revocation for Admins. Keys authenticate requests to the public API via `X-API-Key` header. Raw key returned once on creation, sha256 hash stored. `ApiKeyGuard` validates incoming keys.

## Sequencing

Requires Slice 1 (auth + JWT). Foundation for Slice 5 Phase 2 (public endpoints).

## Context to Load

- `.claude/templates/CONTEXT.md`
- `docs/02-Software-Requirements-Specification.md` § 5.8 (FR-PUBAPI-02)
- `docs/04-ARCH.md` § 4

---

## Locked Design Decisions

- Raw key returned once on creation — never stored, never retrievable again
- Storage: sha256 hash of raw key
- Auth header: `X-API-Key`
- Only Admins can create, list, revoke API keys
- `ApiKeyGuard` hashes incoming key and compares to stored hash

---

## Definition of Done

### Domain (`src/modules/auth/domain/`)

- [ ] `ApiKey` entity: id, name, keyHash, createdBy, createdAt, lastUsedAt, revokedAt
- [ ] Unit tests on key hash comparison logic

### Application (`src/modules/auth/application/`)

- [ ] `CreateApiKeyUseCase` — generates raw key, stores hash, returns raw key once
- [ ] `ListApiKeysUseCase` — returns all keys (no raw values, hashes never exposed)
- [ ] `RevokeApiKeyUseCase` — sets revokedAt
- [ ] Unit tests with fakes

### Persistence

- [ ] `PrismaApiKeyRepository` — save, findAll, findByHash, revoke
- [ ] Integration tests

### HTTP + Guard

- [ ] `POST /api/admin/auth/api-keys` — Admin only, returns `{ id, name, key: "<raw>" }`
- [ ] `GET /api/admin/auth/api-keys` — Admin only
- [ ] `DELETE /api/admin/auth/api-keys/:id` — Admin only (revoke)
- [ ] `ApiKeyGuard` — hashes `X-API-Key` header, looks up in DB, rejects if not found or revoked
- [ ] Integration tests

### Quality

- [ ] `pnpm --filter @cms/api tsc --noEmit` exits 0
- [ ] `pnpm --filter @cms/api lint` exits 0
- [ ] `pnpm --filter @cms/api exec vitest run src/modules/auth` exits 0

---

## Acceptance Commands

```bash
pnpm --filter @cms/api exec vitest run src/modules/auth

# Create API key
curl -fsS -X POST http://localhost:3000/api/admin/auth/api-keys \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"name":"frontend-key"}' | jq .
# expect: { id, name, key: "cms_..." } — save this key, it won't show again

# List keys — raw key must NOT appear
curl -fsS -H "Authorization: Bearer $ADMIN_JWT" \
  http://localhost:3000/api/admin/auth/api-keys | jq .

# Use key on a protected endpoint
curl -fsS -H "X-API-Key: $API_KEY" \
  http://localhost:3000/api/v1/articles | jq .
```

---

## Rollback

Revert branch. Drop `api_keys` table if needed.

---

## Out of Scope

- Public content endpoints (Phase 2)
- Rate limiting per key (Phase 3)