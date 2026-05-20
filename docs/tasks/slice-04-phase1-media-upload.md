---
layer: L3
owner: media-bounded-context
applies_to: apps/api/src/modules/media/
last_reviewed: 2026-05-18
---

# Slice 4 Phase 1 — Media Upload Pipeline & Variant Generation

## Goal

Implement the media upload pipeline: generate presigned S3/MinIO URLs for direct client upload, validate MIME type + extension + magic bytes consistency, enqueue variant generation (thumbnail ≤320px, medium ≤1024px) via BullMQ, and persist metadata after upload completes.

## Sequencing

Requires Slice 1 (auth). MinIO must be running locally. BullMQ and Redis required for variant generation worker.

## Context to Load

- `.claude/templates/CONTEXT.md`
- `docs/02-Software-Requirements-Specification.md` § 5.5 (FR-MEDIA-01..05)
- `docs/02-Software-Requirements-Specification.md` § 9 (SEC-05, SEC-06)
- `docs/04-ARCH.md` § 4

---

## Locked Design Decisions

- Max file size: 20 MB per file (configurable)
- Allowed types: PNG, JPEG, WEBP, GIF, SVG, PDF
- Validation: MIME type + declared extension + magic bytes must all match
- SVG: sanitized (strip scripts + external references) before storage (SEC-05)
- Upload: presigned URL — server does NOT proxy binary payload (FR-MEDIA-04)
- Variants: thumbnail ≤320px, medium ≤1024px — generated via BullMQ worker
- Storage: private bucket — no public listing (SEC-06)

---

## Definition of Done

### Domain (`src/modules/media/domain/`)

- [ ] `MediaItem` entity: id, filename, mimeType, size, storageKey, altText, caption, uploadedBy, uploadedAt, variants (thumbnail, medium, original URLs)
- [ ] `MediaStoragePort` interface: generatePresignedUploadUrl, generatePresignedDownloadUrl, deleteObject
- [ ] `MimeValidatorPort` interface: validateMimeConsistency
- [ ] Unit tests 100% on domain

### Application (`src/modules/media/application/`)

- [ ] `RequestUploadUseCase` — generates presigned URL, returns to client
- [ ] `FinalizeUploadUseCase` — called after client upload, validates magic bytes, persists metadata, enqueues variant job
- [ ] `GenerateVariantsJob` — BullMQ worker, generates thumbnail + medium, updates media item with variant keys
- [ ] Unit tests with fakes

### Persistence + Storage (`src/modules/media/adapters/out/`)

- [ ] `PrismaMediaRepository` — save, findById, update variants
- [ ] `MinioStorageAdapter` implements `MediaStoragePort`
- [ ] `SharpMimeValidator` implements `MimeValidatorPort` (magic byte check)
- [ ] Integration tests

### HTTP (`src/modules/media/adapters/in/http/`)

- [ ] `POST /api/admin/media/upload-url` — returns presigned URL + mediaId
- [ ] `POST /api/admin/media/:id/finalize` — called after client upload
- [ ] Integration tests

### Quality

- [ ] `pnpm --filter @cms/api tsc --noEmit` exits 0
- [ ] `pnpm --filter @cms/api lint` exits 0
- [ ] `pnpm --filter @cms/api exec vitest run src/modules/media` exits 0

---

## Acceptance Commands

```bash
pnpm --filter @cms/api exec vitest run src/modules/media

# Get presigned URL
curl -fsS -X POST http://localhost:3000/api/admin/media/upload-url \
  -H "Authorization: Bearer $EDITOR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"filename":"photo.jpg","mimeType":"image/jpeg","size":102400}' | jq .
# expect: { uploadUrl: "...", mediaId: "..." }

# MIME mismatch
# send file with wrong extension vs actual content
# expect: 422 validation error
```

---

## Rollback

Revert branch. Drop `media_items` table. Empty the MinIO bucket manually.

---

## Out of Scope

- Media library list/search/delete (Phase 2)
- Media picker in content editor (Slice 9 frontend)