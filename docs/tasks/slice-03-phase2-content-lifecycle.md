---
layer: L3
owner: content-bounded-context
applies_to: apps/api/src/modules/content/
last_reviewed: 2026-05-18
---

# Slice 3 Phase 2 — Content Lifecycle, Scheduling & Hard Delete

## Goal

Implement the full content lifecycle state machine (Draft → In Review → Published → Unpublished → Archived), scheduled publishing via BullMQ, and the 30-day hard delete background job. Invalid transitions return 409.

## Sequencing

Requires Phase 1 (content CRUD). BullMQ and Redis must be running.

## Context to Load

- `.claude/templates/CONTEXT.md`
- `docs/02-Software-Requirements-Specification.md` § 5.4 (FR-CONTENT-04, FR-CONTENT-06, FR-CONTENT-07, FR-CONTENT-12, FR-CONTENT-13)
- `docs/04-ARCH.md` § 4

---

## Locked Design Decisions

- Lifecycle: Draft → In Review → Published → Unpublished → Archived
- Invalid transitions: HTTP 409
- Publish requirements: non-empty Title, Body, Slug, SEO meta description (FR-CONTENT-06)
- Scheduled publish: `scheduled_at` future timestamp → BullMQ job transitions to Published at that time
- Unpublish removes from public API within 60s (cache TTL accounts for this)
- Hard delete: BullMQ cron job runs daily, hard-deletes items where `deletedAt` < now - 30 days

---

## Definition of Done

### Domain (`src/modules/content/domain/`)

- [x] `ContentLifecycleService` domain service — enforces all valid/invalid transitions
- [x] All transition combinations tested: valid transitions pass, invalid return domain error
- [x] `PublishRequirementsChecker` — validates title, body, slug, SEO description before publish
- [x] Unit tests 100% on lifecycle and publish requirements

### Application (`src/modules/content/application/`)

- [x] `SubmitForReviewUseCase` — Draft → In Review (Author or Editor)
- [x] `PublishContentUseCase` — In Review → Published (Editor/Admin only); validates publish requirements
- [x] `UnpublishContentUseCase` — Published → Unpublished (Editor/Admin only)
- [x] `ArchiveContentUseCase` — Unpublished → Archived
- [x] `SchedulePublishUseCase` — sets `scheduled_at`, enqueues BullMQ job
- [x] `HardDeleteJob` — BullMQ cron, hard-deletes soft-deleted items older than 30 days
- [x] Unit tests with fakes for all use cases

### HTTP (`src/modules/content/adapters/in/http/`)

- [x] `PATCH /api/admin/content/:id/submit` — submit for review
- [x] `PATCH /api/admin/content/:id/publish` — publish
- [x] `PATCH /api/admin/content/:id/unpublish` — unpublish
- [x] `PATCH /api/admin/content/:id/archive` — archive
- [x] `PATCH /api/admin/content/:id/schedule` — set scheduled_at
- [x] Invalid transition returns 409 with clear error
- [x] Integration tests

### Quality

- [x] `pnpm --filter @cms/api tsc --noEmit` exits 0
- [x] `pnpm --filter @cms/api lint` exits 0
- [x] `pnpm --filter @cms/api exec vitest run src/modules/content` exits 0

---

## Acceptance Commands

```bash
pnpm --filter @cms/api exec vitest run src/modules/content

# Full lifecycle flow
CONTENT_ID=$(curl -fsS -X POST http://localhost:3000/api/admin/content \
  -H "Authorization: Bearer $EDITOR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"type":"article","title":"Test","body":"<p>Hello</p>","slug":"test","seoDescription":"Test description"}' | jq -r .id)

curl -fsS -X PATCH http://localhost:3000/api/admin/content/$CONTENT_ID/submit \
  -H "Authorization: Bearer $EDITOR_JWT" | jq .status
# expect: "in_review"

curl -fsS -X PATCH http://localhost:3000/api/admin/content/$CONTENT_ID/publish \
  -H "Authorization: Bearer $EDITOR_JWT" | jq .status
# expect: "published"

# Invalid transition — publish again
# expect: 409
```

---

## Rollback

Revert branch. BullMQ jobs are additive — no schema migration for the job queue.

---

## Out of Scope

- SEO fields (Phase 3)
- Content versioning (Phase 3)
- Public API visibility (Slice 5)