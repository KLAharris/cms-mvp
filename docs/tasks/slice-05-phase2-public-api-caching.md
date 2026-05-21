---
layer: L3
owner: public-api-bounded-context
applies_to: apps/api/src/modules/public-api/
last_reviewed: 2026-05-18
---

# Slice 5 Phase 2 — Public Content API & Caching

## Goal

Expose read-only public endpoints for published articles and pages. Only content with status=Published and published_at ≤ now is returned. Responses cached in Redis with Cache-Control, ETag, and Last-Modified headers.

## Sequencing

Requires Phase 1 (ApiKeyGuard). Requires Slice 3 Phase 2 (content lifecycle — published status must exist).

## Context to Load

- `.claude/templates/CONTEXT.md`
- `docs/02-Software-Requirements-Specification.md` § 5.8 (FR-PUBAPI-01..05)
- `docs/04-ARCH.md` § 4

---

## Locked Design Decisions

- Only Published content with published_at ≤ now returned (FR-PUBAPI-03)
- Cache TTL: list 300s, detail 600s
- Cache invalidated on publish/unpublish
- Cache headers: Cache-Control, ETag, Last-Modified (FR-PUBAPI-04)
- Pagination: page + page_size, default 25, max 100 (FR-PUBAPI-05)
- Auth: X-API-Key header via ApiKeyGuard

---

## Definition of Done

### Application (`src/modules/public-api/application/`)

- [x] `ListPublishedArticlesUseCase` — returns published articles only, paginated
- [x] `GetPublishedArticleUseCase` — by slug, published only
- [x] `ListPublishedPagesUseCase` — returns published pages only, paginated
- [x] `GetPublishedPageUseCase` — by slug, published only
- [x] Draft/in_review/unpublished content NEVER returned — enforced at repository layer
- [x] Unit tests with fakes — including test that Draft is never returned

### Cache (`src/modules/public-api/adapters/out/cache/`)

- [x] `RedisCacheAdapter` — get, set, invalidate by pattern
- [x] Cache miss → DB query → store in Redis
- [x] Integration tests

### HTTP (`src/modules/public-api/adapters/in/http/`)

- [x] `GET /api/v1/articles` — paginated, ApiKeyGuard
- [x] `GET /api/v1/articles/:slug` — single article, ApiKeyGuard
- [x] `GET /api/v1/pages` — paginated, ApiKeyGuard
- [x] `GET /api/v1/pages/:slug` — single page, ApiKeyGuard
- [x] Cache-Control, ETag, Last-Modified headers on all responses
- [x] 404 for unpublished/nonexistent content
- [x] Integration tests

### Quality

- [x] `pnpm --filter @cms/api tsc --noEmit` exits 0
- [x] `pnpm --filter @cms/api lint` exits 0
- [x] `pnpm --filter @cms/api exec vitest run src/modules/public-api` exits 0

---

## Acceptance Commands

```bash
pnpm --filter @cms/api exec vitest run src/modules/public-api

# List published articles
curl -fsS -H "X-API-Key: $API_KEY" \
  "http://localhost:3000/api/v1/articles" | jq .
# expect: { data: [...], pagination: {...} } — only published items

# Draft must not appear
# create a draft article, then:
curl -fsS -H "X-API-Key: $API_KEY" \
  "http://localhost:3000/api/v1/articles/$DRAFT_SLUG"
# expect: 404

# Check cache headers
curl -fsS -I -H "X-API-Key: $API_KEY" \
  "http://localhost:3000/api/v1/articles"
# expect: Cache-Control, ETag, Last-Modified headers present
```

---

## Rollback

Revert branch. Redis cache keys will expire naturally.

---

## Out of Scope

- Media endpoint (Phase 3)
- Rate limiting (Phase 3)
- OpenAPI/Swagger docs (Phase 3)
- Pagination envelope fix (Phase 3)