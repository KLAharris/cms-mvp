---
layer: L3
owner: content-bounded-context
applies_to: apps/api/src/modules/content/
last_reviewed: 2026-05-18
---

# Slice 3 Phase 1 — Content CRUD & Domain (Article + Page)

## Goal

Implement the `content` module domain and basic CRUD for Article and Page content types. Slug auto-generation from title, slug uniqueness per type, rich text body storage, RBAC enforcement (Authors see only own content). Saveable as Draft with only Title populated.

## Sequencing

Requires Slice 1 and Slice 2. No lifecycle transitions yet (Phase 2). No SEO fields or versioning yet (Phase 3).

## Context to Load

- `.claude/templates/CONTEXT.md`
- `docs/02-Software-Requirements-Specification.md` § 5.4 (FR-CONTENT-01..05, FR-CONTENT-10, FR-CONTENT-13, FR-CONTENT-14)
- `docs/02-Software-Requirements-Specification.md` § 5.3 (FR-AUTHZ-02, FR-AUTHZ-03)
- `docs/04-ARCH.md` § 4

---

## Locked Design Decisions

- Two content types: Article and Page
- Slug: auto-generated from title on first save, editable, unique per type
- Body: stored as sanitized HTML or ProseMirror JSON (allow-list sanitized server-side — SEC-04)
- Draft saveable with Title only — all other fields optional
- Soft delete: mark deleted, retain 30 days (hard delete in Phase 2)
- Authors see only own content (FR-AUTHZ-02)
- Editors see all content (FR-AUTHZ-03)

---

## Definition of Done

### Domain (`src/modules/content/domain/`)

- [ ] `Content` entity with: id, type (article/page), title, slug, body, status (draft only for now), authorId, featuredImageId, tags, category, parentId, deletedAt, createdAt, updatedAt
- [ ] `ContentType` and `ContentStatus` enums
- [ ] Slug generation logic (URL-safe, title-derived)
- [ ] Unit tests 100% on domain

### Application (`src/modules/content/application/`)

- [ ] `CreateContentUseCase` — creates draft, auto-generates slug, enforces role
- [ ] `UpdateContentUseCase` — updates fields, Author restricted to own content
- [ ] `GetContentUseCase` — single item, RBAC applied
- [ ] `ListContentUseCase` — filters: type, status, author, tag, date range; paginated 25/page max 100; title search
- [ ] `DeleteContentUseCase` — soft delete (sets deletedAt)
- [ ] Unit tests with fakes

### Persistence (`src/modules/content/adapters/out/persistence/`)

- [ ] `PrismaContentRepository` — save, findById, findMany (with filters), softDelete
- [ ] Slug uniqueness enforced at DB level (unique index on type + slug)
- [ ] Integration tests

### HTTP (`src/modules/content/adapters/in/http/`)

- [ ] `POST /api/admin/content` — Editor/Author/Admin
- [ ] `GET /api/admin/content` — all roles, RBAC applied
- [ ] `GET /api/admin/content/:id` — all roles, RBAC applied
- [ ] `PATCH /api/admin/content/:id` — Editor/Author/Admin
- [ ] `DELETE /api/admin/content/:id` — Editor/Admin
- [ ] Slug collision returns 409
- [ ] Integration tests

### Quality

- [ ] `pnpm --filter @cms/api tsc --noEmit` exits 0
- [ ] `pnpm --filter @cms/api lint` exits 0
- [ ] `pnpm --filter @cms/api exec vitest run src/modules/content` exits 0

---

## Acceptance Commands

```bash
pnpm --filter @cms/api exec vitest run src/modules/content

# Create article
curl -fsS -X POST http://localhost:3000/api/admin/content \
  -H "Authorization: Bearer $EDITOR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"type":"article","title":"My First Article"}' | jq .
# expect: 201 with slug auto-generated

# Slug collision
# expect: 409
```

---

## Rollback

Revert branch. Drop `content` table via `prisma migrate reset`.

---

## Out of Scope

- Lifecycle transitions (Phase 2)
- Scheduled publishing (Phase 2)
- SEO fields (Phase 3)
- Content versioning (Phase 3)
- Rich text editor (frontend — Slice 9)