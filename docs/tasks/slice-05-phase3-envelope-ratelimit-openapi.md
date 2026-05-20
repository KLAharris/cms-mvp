---
layer: L3
owner: public-api-bounded-context
applies_to: apps/api/src/modules/public-api/
last_reviewed: 2026-05-18
---

# Slice 5 Phase 3 — Response Envelope Fix, Media Endpoint, Rate Limiting & OpenAPI

## Goal

Fix the list response envelope (pagination fields nested under `pagination` key per SRS §7.3), add `GET /api/v1/media/:id` endpoint, add per-API-key rate limiting (60 req/min), and publish Swagger UI at `/docs` with OAS 3.1 decorators on all 5 public endpoints.

## Sequencing

Requires Phase 1 and Phase 2. This phase closes out Slice 5.

## Context to Load

- `.claude/templates/CONTEXT.md`
- `docs/02-Software-Requirements-Specification.md` § 5.8 (FR-PUBAPI-05, FR-PUBAPI-06, FR-PUBAPI-07)
- `docs/02-Software-Requirements-Specification.md` § 9 (SEC-07)

---

## Locked Design Decisions

- Pagination response shape: `{ data: [...], pagination: { page, pageSize, total, totalPages } }` — pagination fields nested, not at root
- Rate limit: 60 req/min per API key via `ApiKeyThrottlerGuard` (SEC-07)
- Swagger UI at `/docs`, Redoc at `/redoc`
- OAS 3.1 decorators on all 5 public endpoints
- Media endpoint returns metadata + variant URLs (not binary)

---

## Definition of Done

### Envelope Fix

- [ ] All 4 existing public list endpoints return `{ data: [...], pagination: { page, pageSize, total, totalPages } }`
- [ ] No pagination fields at response root level
- [ ] Existing tests updated to match new shape

### Media Endpoint

- [ ] `GET /api/v1/media/:id` — returns metadata: filename, mimeType, size, altText, caption, variants (thumbnail, medium, original URLs)
- [ ] ApiKeyGuard applied
- [ ] 404 for non-existent media
- [ ] Integration test

### Rate Limiting

- [ ] `ApiKeyThrottlerGuard` — 60 req/min per API key
- [ ] 429 Too Many Requests when exceeded
- [ ] Rate limit applied to all 5 public endpoints
- [ ] Integration test for rate limit enforcement

### OpenAPI

- [ ] OAS 3.1 decorators on: GET /api/v1/articles, GET /api/v1/articles/:slug, GET /api/v1/pages, GET /api/v1/pages/:slug, GET /api/v1/media/:id
- [ ] Swagger UI accessible at `/docs`
- [ ] Redoc accessible at `/redoc`
- [ ] X-API-Key security scheme defined in spec

### Quality

- [ ] `pnpm --filter @cms/api tsc --noEmit` exits 0
- [ ] `pnpm --filter @cms/api lint` exits 0
- [ ] `pnpm --filter @cms/api exec vitest run src/modules/public-api` exits 0
- [ ] CI green (pre-existing Redis NOAUTH failures only)

---

## Acceptance Commands

```bash
pnpm --filter @cms/api exec vitest run src/modules/public-api

# Check envelope shape
curl -fsS -H "X-API-Key: $API_KEY" \
  "http://localhost:3000/api/v1/articles" | jq '{has_pagination: (.pagination != null)}'
# expect: { has_pagination: true }

# Media endpoint
curl -fsS -H "X-API-Key: $API_KEY" \
  "http://localhost:3000/api/v1/media/$MEDIA_ID" | jq .
# expect: { id, filename, altText, variants: { thumbnail, medium, original } }

# Rate limit — send 61 requests
for i in {1..61}; do
  STATUS=$(curl -o /dev/null -s -w "%{http_code}" -H "X-API-Key: $API_KEY" \
    http://localhost:3000/api/v1/articles)
  echo "$i: $STATUS"
done
# expect: 61st returns 429

# Swagger UI
open http://localhost:3000/docs
```

---

## Rollback

Revert branch. No schema changes. Redis rate limit keys expire naturally (60s TTL).

---

## Out of Scope

- Webhook subscriptions (post-MVP)
- GraphQL API (post-MVP)
- CDN configuration (infrastructure concern)