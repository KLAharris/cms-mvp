---
layer: L3
owner: cms-web
applies_to: apps/web/src/
last_reviewed: 2026-05-19
---

# Slice 9 Phase 2 — Dashboard + Content List + Content Editor

## Goal

Implement the Navigation Rail/Drawer shell, Dashboard screen, Content List (Articles + Pages), and the full Content Editor with TipTap rich text, autosave, two-pane layout, SEO fields, and lifecycle actions. All screens follow `docs/03-DESIGN.md`.

## Sequencing

Requires Phase 1 (foundation + auth). The Content Editor depends on the Media Library picker — use a placeholder "Select image" button for featured/social image for now; wired in Phase 3 when Media Library is built.

## Context to Load

- `.claude/templates/CONTEXT.md`
- `docs/03-DESIGN.md` § 11 (Navigation structure)
- `docs/03-DESIGN.md` § 12.2 (Dashboard)
- `docs/03-DESIGN.md` § 12.3 (Content List)
- `docs/03-DESIGN.md` § 12.4 (Content Editor)
- `docs/03-DESIGN.md` § 19 (Rich text editor UX)
- `docs/04-ARCH.md` § 5 (Reactive frontend architecture)
- `docs/06-TEST-STRATEGY.md` § 8.4 (Hook testing with MSW)

---

## Locked Design Decisions (from docs)

- **Navigation**: persistent Navigation Rail on left at Expanded breakpoint; modal Navigation Drawer at Compact/Medium (docs/03-DESIGN.md § 11)
- **Nav items**: Dashboard, Articles, Pages, Media Library, Users (Admin only), Audit Log (Admin only), API Keys (Admin only)
- **Autosave**: every 30 s while typing; `"Saved 3 sec ago"` indicator below title (docs/03-DESIGN.md § 12.4)
- **Autosave implementation**: RxJS `debounceTime(30_000)` on content change stream; `switchMap` to save API call (docs/04-ARCH.md § 5)
- **Unsaved changes prompt**: browser `beforeunload` + React Router `useBlocker` on navigation (docs/03-DESIGN.md § 12.4)
- **Rich text**: TipTap with extensions: Heading (H2–H4), Bold, Italic, BulletList, OrderedList, Blockquote, CodeBlock, Link, HorizontalRule (FR-CONTENT-15)
- **Content status chip colors**: from docs/03-DESIGN.md § 6 — Draft=surface-variant, In Review=tertiary-container, Published=secondary-container

---

## Definition of Done

### App Shell

- [ ] `AppShell` layout component wrapping all protected routes
- [ ] Navigation Rail (Expanded) with icons + labels for all nav items
- [ ] Navigation Drawer (Compact/Medium) — modal, toggle via menu icon in Top App Bar
- [ ] Top App Bar: page title (updates per route), avatar/menu for current user
- [ ] Role-based nav: Users, Audit Log, API Keys nav items hidden for non-Admin roles
- [ ] Breadcrumb component used on Editor and nested screens (docs/03-DESIGN.md § 11)
- [ ] 404 screen: friendly message + link back to Dashboard

### Dashboard (`/dashboard`)

- [ ] Layout matches docs/03-DESIGN.md § 12.2: 4 stat cards + recent activity + quick actions
- [ ] Stat cards: Total Articles, Published, In Review, Drafts — fetched from content list endpoint counts
- [ ] Recent activity: last 10 audit events from `GET /api/admin/audit` — icon, primary line, timestamp
- [ ] "View audit log →" link
- [ ] Quick actions: `[+ New Article]`, `[+ New Page]`, `[Upload Media]` — navigate to respective routes
- [ ] Skeleton loading states while data fetches
- [ ] Responsive: 4-column at Expanded, 2×2 at Medium, stacked at Compact

### Content List — Articles (`/articles`) and Pages (`/pages`)

- [ ] Layout matches docs/03-DESIGN.md § 12.3
- [ ] Search field: debounced 300 ms, calls `GET /api/admin/content?type=article&title=...`
- [ ] Filter chips: All, Draft, In Review, Published, Mine, Last 30 days
- [ ] Sortable table: Title, Status (chip), Author, Updated
- [ ] Row click → `/articles/:id/edit`
- [ ] Row action menu (⋮): Edit, Submit for Review, Publish, Unpublish (status-dependent), Delete (with confirmation dialog)
- [ ] `[+ New]` Extended FAB → creates draft and navigates to editor
- [ ] Pagination: page indicator + Prev/Next buttons
- [ ] Empty state: illustration + `"No articles yet. Create your first one."` + action button
- [ ] RBAC: Authors only see own content (enforced by API, reflected in UI)

### Content Editor (`/articles/:id/edit`, `/pages/:id/edit`)

- [ ] Two-pane layout at Large breakpoint; single column at Expanded and below (docs/03-DESIGN.md § 12.4)
- [ ] Title input: borderless, `headline-large` style
- [ ] Slug field: auto-generated from title on first save; editable; live uniqueness validation (debounced 500 ms)
- [ ] TipTap rich text editor with toolbar: Bold, Italic, Underline, H2, H3, BulletList, OrderedList, Blockquote, CodeBlock, Link, HorizontalRule
- [ ] Toolbar sticky at top of editor pane on scroll
- [ ] Side panel (sticky on scroll):
  - Status chip + lifecycle action buttons: Save Draft, Submit for Review, Publish (Editor/Admin only), Unpublish
  - Schedule dialog: date + time picker, calls `PATCH /api/admin/content/:id/schedule`
  - SEO section: Meta Title (70 char limit + counter), Meta Description (160 char limit + counter), Social Image (placeholder for Phase 3)
  - Featured Image (placeholder for Phase 3)
  - Tags: chip input, add/remove
  - Category: dropdown
- [ ] Autosave: RxJS debounce 30 s on content changes; `"Saved N sec ago"` indicator; `"Saving..."` during request
- [ ] Unsaved changes prompt on navigation away
- [ ] Version history: `"View history"` button in side panel → navigates to `/articles/:id/versions`
- [ ] Version list screen: table of versions with timestamp, editor, revert button; revert calls `POST /api/admin/content/:id/revert/:versionId`

### Testing

- [ ] Unit tests for autosave RxJS stream (marble tests — docs/06-TEST-STRATEGY.md § 8.3)
- [ ] Unit tests for content list filters/selectors
- [ ] Hook tests for `useContentList`, `useContentEditor` using MSW
- [ ] Component tests for Content List: filter chips, search, status chips, pagination
- [ ] Component tests for Content Editor: autosave indicator, lifecycle buttons visibility by role, char counters

### Quality

- [ ] `pnpm --filter @cms/web tsc --noEmit` exits 0
- [ ] `pnpm --filter @cms/web lint` exits 0
- [ ] `pnpm --filter @cms/web exec vitest run` exits 0

---

## Acceptance Commands

```bash
pnpm --filter @cms/web tsc --noEmit
pnpm --filter @cms/web lint
pnpm --filter @cms/web exec vitest run

# Dev server
pnpm --filter @cms/web dev
# Login → Dashboard: stat cards load, recent activity loads
# Articles: list, search, filter chips work
# New article → Editor: type title, slug auto-generates, TipTap toolbar works, autosave fires
```

---

## Rollback

Revert the branch. No backend changes.

---

## Out of Scope

- Media image picker in editor (wired in Phase 3)
- Users, Audit Log, API Keys screens (Phase 3)
- E2E tests (Phase 4)

---

## Notes

- Autosave must use RxJS `switchMap` — if a save is in flight when the next debounce fires, cancel the previous request (docs/04-ARCH.md § 5)
- TipTap extensions must match FR-CONTENT-15 exactly: H2–H4 (not H1), bold, italic, lists, links, blockquotes, code blocks, inline images, horizontal rule
- Status-dependent action buttons: only show actions valid for the current status and current user role — an Author should never see the Publish button
- Featured image and social image pickers can be simple `[Select image]` disabled buttons in Phase 2 — wire them in Phase 3