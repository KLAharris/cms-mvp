---
layer: L3
owner: content-bounded-context
applies_to: apps/api/src/modules/content/
last_reviewed: 2026-05-18
---

# Slice 3 Phase 3 — SEO Fields, Content Versioning & Full-Text Search

## Goal

Add SEO metadata fields (seoTitle, seoDescription, socialImage) to content, implement content versioning (snapshot on every update, list versions, revert to version), and add title-based full-text search to the list endpoint.

## Sequencing

Requires Phase 1 (CRUD) and Phase 2 (lifecycle) to be merged. No new queue dependencies.

## Context to Load

- `.claude/templates/CONTEXT.md`
- `docs/02-Software-Requirements-Specification.md` § 5.4 (FR-CONTENT-08, FR-CONTENT-09, FR-CONTENT-10, FR-CONTENT-11)
- `docs/04-ARCH.md` § 4

---

## Locked Design Decisions

- SEO fields: `seoTitle` (max 70 chars), `seoDescription` (max 160 chars), `socialImageId` (FK → MediaItem, optional)
- Versioning: snapshot created on every successful update; stored in `ContentVersion` table
- Versioning retention: pruned to last 50 versions per content item by BullMQ cron (weekly)
- Revert: replaces current content fields with versioned snapshot, creates a new version record
- Search: case-insensitive partial match on `title` field via `ILIKE` (no full-text index needed for MVP scale)

---

## Definition of Done

### Domain (`src/modules/content/domain/`)

- [x] `SeoMetadata` value object with `seoTitle` (string, max 70) and `seoDescription` (string, max 160)
- [x] `ContentVersion` entity with id, contentId, snapshot (full content fields), createdAt, createdBy
- [x] Unit tests 100% on domain value objects

### Application (`src/modules/content/application/`)

- [x] `ListVersionsUseCase` — returns paginated version list for a content item (newest first)
- [x] `RevertContentUseCase` — replaces current content with a version snapshot; creates a new version record; enforces RBAC
- [x] `UpdateContentUseCase` extended — creates version snapshot before applying update
- [x] `ListContentUseCase` extended — accepts optional `title` query param, applies ILIKE filter
- [x] Unit tests with fakes

### Persistence (`src/modules/content/adapters/out/persistence/`)

- [x] `PrismaContentVersionRepository` — save, findByContentId (paginated), findById
- [x] Prisma schema: `ContentVersion` model added
- [x] Migration created under `apps/api/prisma/migrations/`
- [x] `PrismaContentRepository` extended: `findMany` accepts `search` string for ILIKE filter
- [x] Integration tests

### HTTP (`src/modules/content/adapters/in/http/`)

- [x] `GET /api/admin/content/:id/versions` — paginated version list
- [x] `POST /api/admin/content/:id/revert/:versionId` — revert to version
- [x] `GET /api/admin/content` extended — `?title=` query param for search
- [x] Integration tests

### Scheduler (`src/modules/content/adapters/in/scheduler/`)

- [x] `VersionPruningJob` — BullMQ cron (weekly), hard-deletes versions beyond the 50-version limit per content item

### Quality

- [x] `pnpm --filter @cms/api tsc --noEmit` exits 0
- [x] `pnpm --filter @cms/api lint` exits 0
- [x] `pnpm --filter @cms/api exec vitest run src/modules/content` exits 0

---

## Acceptance Commands

```bash
pnpm --filter @cms/api exec vitest run src/modules/content

# List versions
curl -fsS -H "Authorization: Bearer $EDITOR_JWT" \
  "http://localhost:3000/api/admin/content/$CONTENT_ID/versions" | jq .

# Revert
curl -fsS -X POST \
  "http://localhost:3000/api/admin/content/$CONTENT_ID/revert/$VERSION_ID" \
  -H "Authorization: Bearer $EDITOR_JWT" | jq .status

# Search
curl -fsS -H "Authorization: Bearer $EDITOR_JWT" \
  "http://localhost:3000/api/admin/content?title=hello" | jq .
```

---

## Rollback

Revert branch. Drop `content_versions` table. Remove `seoTitle`, `seoDescription`, `socialImageId` columns from `content` table via `prisma migrate reset`.

---

## Out of Scope

- Full-text index (Postgres `tsvector`) — deferred post-MVP; ILIKE sufficient at MVP scale
- SEO preview in admin SPA (Slice 9)
- Version diff view (post-MVP)
