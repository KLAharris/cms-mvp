---
layer: L3
owner: media-bounded-context
applies_to: apps/api/src/modules/media/
last_reviewed: 2026-05-18
---

# Slice 4 Phase 2 — Media Library (List, Search, Delete, Metadata)

## Goal

Implement the media library: list with pagination and filters, filename search, metadata editing (alt text, caption), and deletion with reference guard (cannot delete media referenced by non-deleted content). Admins can force-delete.

## Sequencing

Requires Phase 1 (upload pipeline). Content module must be available for reference checks.

## Context to Load

- `.claude/templates/CONTEXT.md`
- `docs/02-Software-Requirements-Specification.md` § 5.5 (FR-MEDIA-06, FR-MEDIA-07, FR-MEDIA-08)
- `docs/04-ARCH.md` § 4

---

## Locked Design Decisions

- Delete blocked if media is referenced by any non-deleted content item (FR-MEDIA-07)
- Force-delete available to Admins only — removes reference and deletes
- List filters: uploader, date range, filename search (case-insensitive partial match)
- Metadata editable: altText, caption (filename is read-only)

---

## Definition of Done

### Application (`src/modules/media/application/`)

- [ ] `ListMediaUseCase` — paginated, filters: uploadedBy, dateFrom, dateTo, search (filename)
- [ ] `GetMediaUseCase` — single item with all metadata and variant URLs
- [ ] `UpdateMediaMetadataUseCase` — update altText and/or caption
- [ ] `DeleteMediaUseCase` — checks references, blocks delete if referenced; force flag for Admins
- [ ] Unit tests with fakes

### Persistence (`src/modules/media/adapters/out/persistence/`)

- [ ] `PrismaMediaRepository` extended: findMany (with filters), update metadata, delete
- [ ] Reference check query: find any non-deleted content item referencing this mediaId
- [ ] Integration tests

### HTTP (`src/modules/media/adapters/in/http/`)

- [ ] `GET /api/admin/media` — all roles, paginated + filters
- [ ] `GET /api/admin/media/:id` — single item
- [ ] `PATCH /api/admin/media/:id` — update altText/caption
- [ ] `DELETE /api/admin/media/:id` — blocked if referenced; ?force=true Admin only
- [ ] 409 when delete blocked by reference
- [ ] Integration tests

### Quality

- [ ] `pnpm --filter @cms/api tsc --noEmit` exits 0
- [ ] `pnpm --filter @cms/api lint` exits 0
- [ ] `pnpm --filter @cms/api exec vitest run src/modules/media` exits 0

---

## Acceptance Commands

```bash
pnpm --filter @cms/api exec vitest run src/modules/media

# List media
curl -fsS -H "Authorization: Bearer $EDITOR_JWT" \
  "http://localhost:3000/api/admin/media?page=1&pageSize=10" | jq .

# Search by filename
curl -fsS -H "Authorization: Bearer $EDITOR_JWT" \
  "http://localhost:3000/api/admin/media?search=photo" | jq .

# Delete referenced media
# expect: 409 with explanatory error

# Force delete (Admin only)
curl -fsS -X DELETE \
  "http://localhost:3000/api/admin/media/$MEDIA_ID?force=true" \
  -H "Authorization: Bearer $ADMIN_JWT" | jq .
# expect: 200
```

---

## Rollback

Revert branch. No new tables in this phase.

---

## Out of Scope

- Media picker dialog (Slice 9 frontend)
- CDN URL generation (infrastructure concern)