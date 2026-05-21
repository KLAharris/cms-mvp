---
layer: L3
owner: cms-web
applies_to: apps/web/src/
last_reviewed: 2026-05-19
---

# Slice 9 Phase 3 — Media Library + Admin Screens + Profile

## Goal

Implement the Media Library with drag-and-drop upload and image picker integration into the Content Editor. Build the remaining Admin-only screens: Users, Audit Log, API Keys. Build the Profile/Settings screen with password change and theme toggle. Wire the featured/social image pickers in the Content Editor.

## Sequencing

Requires Phase 2 (Dashboard + Content). The image picker in the Content Editor depends on the Media Library being built here.

## Context to Load

- `.claude/templates/CONTEXT.md`
- `docs/03-DESIGN.md` § 12.5 (Media Library)
- `docs/03-DESIGN.md` § 12.6 (Users)
- `docs/03-DESIGN.md` § 12.7 (Audit Log)
- `docs/03-DESIGN.md` § 12.8 (API Keys)
- `docs/03-DESIGN.md` § 12.9 (Profile)
- `docs/03-DESIGN.md` § 20 (Media Library UX specification)
- `docs/06-TEST-STRATEGY.md` § 8 (Frontend test strategy)

---

## Locked Design Decisions (from docs)

- **Media grid tile**: 160 dp square, card variant Outlined, corner.medium (docs/03-DESIGN.md § 12.5)
- **Upload**: presigned URL flow — call `POST /api/admin/media/presign`, upload binary directly to MinIO/S3, call `POST /api/admin/media` to finalize (FR-MEDIA-04)
- **Drag-and-drop**: drag-enter reveals drop zone overlay; file picker also available via `[↑ Upload]` button
- **Multi-select**: checkbox on tile hover; bulk delete with confirmation dialog
- **Image picker**: reusable `MediaPickerDialog` component used in Content Editor for featured image and social image
- **Theme toggle**: Light / Dark / System stored in Zustand + `localStorage`, applied via MUI theme switch (docs/03-DESIGN.md § 12.9)

---

## Definition of Done

### Media Library (`/media`)

- [x] Layout matches docs/03-DESIGN.md § 12.5: grid view default, list view toggle
- [x] Search field: debounced 300 ms, `GET /api/admin/media?search=...`
- [x] Type filter dropdown: All types, Image, PDF
- [x] Grid/List view toggle buttons
- [x] Grid tile: 160 dp square, image preview, filename below (`label-medium`, truncated with tooltip)
- [x] Hover state: state layer + overlay action icons (preview, copy URL, delete)
- [x] Click tile: opens side drawer with full metadata (alt text, caption, size, uploader, dimensions, `"Used in N pieces of content"`)
- [x] Side drawer: editable alt text + caption fields; save button; delete button (blocked if referenced)
- [x] Upload:
  - `[↑ Upload]` button opens file picker
  - Drag-and-drop zone appears on `dragenter` over the page
  - Supports PNG, JPEG, WEBP, GIF, SVG, PDF (FR-MEDIA-01)
  - Max 20 MB per file (FR-MEDIA-02)
  - Client-side MIME validation before upload
  - Progress indicator per file during upload
  - Calls presign → uploads to S3 → calls finalize
- [x] Multi-select: checkbox appears on hover; bulk delete with confirmation
- [x] Pagination
- [x] Empty state

### Media Picker Dialog (`MediaPickerDialog` component)

- [x] Reusable dialog that embeds the media grid with search + filter
- [x] Single-select mode: click a tile to select, confirm button returns the selected media item
- [x] Used in Content Editor for: Featured Image, Social Image
- [x] Wire into Content Editor Phase 2 placeholder buttons

### Users Screen (`/users`) — Admin only

- [x] Layout matches docs/03-DESIGN.md § 12.6: data table
- [x] Columns: Avatar + Name, Email, Role (chip), Status (chip), Last login, ⋮ menu
- [x] ⋮ menu actions: Edit role (dialog), Deactivate (confirmation), Resend invite
- [x] `[+ Invite user]` FAB → dialog with email + role select
- [x] Invite dialog: email field, role dropdown (Editor / Author), submit calls `POST /api/admin/users/invite`
- [x] Edit role dialog: role dropdown, submit calls `PATCH /api/admin/users/:id`
- [x] Deactivate: confirmation dialog, calls `DELETE /api/admin/users/:id`
- [x] Status chips: Active (primary), Invited (secondary), Deactivated (error)
- [x] Guarded: redirect non-Admin users away

### Audit Log Screen (`/audit`) — Admin only

- [x] Layout matches docs/03-DESIGN.md § 12.7: read-only data table
- [x] Columns: Timestamp (local TZ), Actor, Action (chip), Target type, Summary (truncated, click to expand)
- [x] Filters: Actor (search), Action (dropdown), Target type (dropdown), Date range (date picker)
- [x] Default sort: timestamp descending
- [x] Export CSV button: calls `GET /api/admin/audit/export`
- [x] Pagination
- [x] Guarded: Admin only

### API Keys Screen (`/api-keys`) — Admin only

- [x] Layout matches docs/03-DESIGN.md § 12.8
- [x] Columns: Name, Prefix (first 8 chars), Last used, Status (Active/Revoked), ⋮ menu (Revoke)
- [x] `[+ New Key]` button → dialog with name field
- [x] On creation: full key shown once in dialog with copy-to-clipboard + warning message (docs/03-DESIGN.md § 12.8)
- [x] Revoke: confirmation dialog, calls `DELETE /api/admin/api-keys/:id`
- [x] Guarded: Admin only

### Profile / Settings Screen (`/profile`)

- [x] Layout matches docs/03-DESIGN.md § 12.9
- [x] View own account info (name, email, role — read-only)
- [x] Change password form: current password, new password, confirm — calls `POST /api/admin/auth/reset-password` flow or dedicated change-password endpoint
- [x] Theme selector: Light / Dark / System (3 radio buttons or segmented button); persisted to `localStorage`
- [x] Accessible from avatar menu in Top App Bar

### Toast Notifications

- [x] Global `SnackbarProvider` (MUI Snackbar) for success and error feedback
- [x] Used across all mutation actions: save draft, publish, invite user, delete, upload, etc. (SRS UI requirement)
- [x] Auto-dismiss after 4 s; manual close button

### Testing

- [x] Hook tests for `useMedia`, `useUpload` using MSW
- [x] Component tests for Media Library: grid renders, upload flow, multi-select
- [x] Component tests for `MediaPickerDialog`: search, select, confirm
- [x] Component tests for Users: invite dialog, deactivate confirmation
- [x] Component tests for Audit Log: filters, CSV export button
- [x] Component tests for API Keys: create dialog shows key once, revoke confirmation

### Quality

- [x] `pnpm --filter @cms/web tsc --noEmit` exits 0
- [x] `pnpm --filter @cms/web lint` exits 0
- [x] `pnpm --filter @cms/web exec vitest run` exits 0

---

## Acceptance Commands

```bash
pnpm --filter @cms/web tsc --noEmit
pnpm --filter @cms/web lint
pnpm --filter @cms/web exec vitest run

# Manual smoke
# Media Library: drag a file onto the page — drop zone appears, upload completes, thumbnail appears
# Content Editor: click "Select image" for Featured Image — MediaPickerDialog opens, select image, image appears
# Users: invite a new user — email + role dialog, 201 response
# API Keys: create key — key shown once in dialog
# Profile: toggle dark mode — theme switches immediately
```

---

## Rollback

Revert the branch. No backend changes.

---

## Out of Scope

- E2E tests (Phase 4)
- Inline image insertion in TipTap editor body (complex — deferred)
- User profile photo upload

---

## Notes

- The presigned upload flow is critical to get right: presign → binary PUT → finalize. Do not POST the binary to your API server (FR-MEDIA-04)
- `MediaPickerDialog` should be decoupled from both the Media Library page and the Content Editor — it is a shared component in `src/shared/components/`
- Theme switching must apply immediately without page reload — MUI ThemeProvider re-render handles this
- The full key on API key creation must be shown only once — no "show key again" option