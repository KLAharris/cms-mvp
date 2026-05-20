---
layer: L3
owner: cms-web
applies_to: apps/web/src/, /
last_reviewed: 2026-05-19
---

# Slice 9 Phase 4 — E2E Tests + Accessibility + Polish + README

## Goal

Close out the CMS MVP. Implement Playwright E2E tests for all critical user flows, run accessibility audits across all screens, fix any visual or UX polish issues, write the project README, add the `.env.example`, and create the seed script. After this phase the project is demo-ready.

## Sequencing

Requires Phases 1–3 complete. All screens must be built before E2E tests are written.

## Context to Load

- `.claude/templates/CONTEXT.md`
- `docs/06-TEST-STRATEGY.md` § 9 (E2E strategy)
- `docs/06-TEST-STRATEGY.md` § 9.2.2 (E2E flows E2E-01 through E2E-10)
- `docs/06-TEST-STRATEGY.md` § 10.3 (Accessibility testing)
- `docs/06-TEST-STRATEGY.md` § 13.2 (Page Object Model)
- `docs/03-DESIGN.md` § 17 (Accessibility spec)
- `docs/09-ONBOARDING.md` — reference for README structure

---

## Locked Design Decisions (from docs)

- **E2E tool**: Playwright with Page Object Model (docs/06-TEST-STRATEGY.md § 13.2)
- **Page objects**: each screen has its own page object in `test/e2e/pages/`
- **Test data**: created via API factory endpoints, never via UI for setup (docs/06-TEST-STRATEGY.md § 9.2.3)
- **Selectors**: `data-testid`, ARIA roles, accessible names — no CSS selectors (docs/06-TEST-STRATEGY.md § 9.2.3)
- **Accessibility standard**: WCAG 2.1 AA (docs/03-DESIGN.md § 17)
- **Accessibility tool**: `axe-core` automated + manual keyboard navigation verification

---

## Definition of Done

### Playwright E2E Tests

Implement the flows from docs/06-TEST-STRATEGY.md § 9.2.2:

- [ ] **E2E-01**: Admin invites user → user accepts → user logs in
- [ ] **E2E-02**: Editor logs in → creates draft → submits → publishes → appears in public API
- [ ] **E2E-03**: Author submits for review → editor rejects with note → author edits → editor approves
- [ ] **E2E-04**: Editor unpublishes article → disappears from public API within 60 s
- [ ] **E2E-05**: Author uploads image → embeds in article → publishes → image visible publicly
- [ ] **E2E-06**: User wrong password 5 times → locked → generic error shown
- [ ] **E2E-07**: User clicks forgot password → receives email → resets → logs in
- [ ] **E2E-08**: Admin creates API key → fetches public articles with it → revokes → fetch fails
- [ ] **E2E-09**: Editor schedules article for future → time passes → auto-publishes
- [ ] **E2E-10**: Admin deactivates user → user is logged out → cannot log back in

Page objects to create (in `test/e2e/pages/`):

- [ ] `LoginPage`
- [ ] `ForgotPasswordPage`
- [ ] `ResetPasswordPage`
- [ ] `DashboardPage`
- [ ] `ContentListPage`
- [ ] `ContentEditorPage`
- [ ] `MediaLibraryPage`
- [ ] `UsersPage`
- [ ] `AuditLogPage`
- [ ] `ApiKeysPage`

### Accessibility

- [ ] `axe-core` scan passes (zero violations) on: Login, Dashboard, Content List, Content Editor, Media Library, Users, Audit Log
- [ ] All interactive elements reachable by keyboard (Tab key navigation)
- [ ] Skip-to-content link at top of page (visible on focus) — docs/03-DESIGN.md § 17
- [ ] All images have alt text
- [ ] All form fields have visible labels
- [ ] Color contrast meets WCAG 2.1 AA on both light and dark themes
- [ ] Lighthouse a11y score ≥ 95 in CI

### Loading + Empty + Error States

Per docs/03-DESIGN.md § 14:

- [ ] Skeleton screens on initial load for: Dashboard, Content List, Media Library
- [ ] Empty states with illustration + action button for: Content List, Media Library, Users, API Keys
- [ ] Error states: inline error messages for form validation; error banner for API failures
- [ ] 404 screen: friendly message + link back to Dashboard
- [ ] 403 screen: `"You don't have permission to view this."` + link back
- [ ] Loading state on all action buttons (spinner while request in flight)

### README (`README.md` at repo root)

- [ ] Project summary — what the CMS is, who it is for
- [ ] Architecture overview with diagram (hexagonal backend + reactive frontend)
- [ ] Full tech stack table with one-line rationale per technology
- [ ] Complete feature list (Slices 1–9)
- [ ] Getting started — clone, install, env vars, migrate, seed, run backend + frontend
- [ ] Environment variables reference table (all vars, required/optional, example values)
- [ ] Running tests — unit, integration, E2E, full suite
- [ ] CI/CD pipeline description
- [ ] Project structure — annotated directory tree
- [ ] Key design decisions (3–5 decisions with rationale)
- [ ] Links to `/docs` (Swagger UI) and `/redoc`
- [ ] README renders correctly on GitHub

### Environment Variables

- [ ] `apps/api/.env.example` — all backend env vars with placeholder values
- [ ] `apps/web/.env.example` — all frontend env vars (`VITE_API_URL`, etc.)
- [ ] Every `ConfigService.getOrThrow` call in backend covered
- [ ] Every `import.meta.env.VITE_*` reference in frontend covered
- [ ] `.env` files confirmed in `.gitignore`

### Seed Script (`apps/api/prisma/seed.ts`)

- [ ] Creates Admin user: `admin@example.com` / `Admin1234!`
- [ ] Creates Editor user: `editor@example.com` / `Editor1234!`
- [ ] Creates Author user: `author@example.com` / `Author1234!`
- [ ] Creates one published Article with full SEO fields
- [ ] Creates one published Page
- [ ] Creates one API key for testing the public API (prints raw key to console on seed)
- [ ] Idempotent: safe to run multiple times without duplicating data
- [ ] Command: `pnpm --filter @cms/api prisma db seed`

### Final Quality Pass

- [ ] No `TODO` or `FIXME` comments in production code
- [ ] No `console.log` statements in production code (structured logger backend; removed frontend)
- [ ] `pnpm run test` (full suite) exits 0
- [ ] `pnpm --filter @cms/api tsc --noEmit` exits 0
- [ ] `pnpm --filter @cms/web tsc --noEmit` exits 0
- [ ] `pnpm --filter @cms/api lint` exits 0
- [ ] `pnpm --filter @cms/web lint` exits 0
- [ ] `pnpm --filter @cms/api run depcruise` exits 0
- [ ] All GitHub Actions CI steps green

---

## Acceptance Commands

```bash
# Full test suite
pnpm run test

# E2E tests
pnpm --filter @cms/web exec playwright test

# Seed
pnpm --filter @cms/api prisma db seed

# Smoke — login with seeded admin
curl -fsS -X POST http://localhost:3000/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin1234!"}' | jq .accessToken
# expect: JWT string

# Swagger UI
open http://localhost:3000/docs
```

---

## Rollback

Revert the branch. No schema changes in this phase.

To clear seed data:

```bash
pnpm --filter @cms/api prisma migrate reset
```

---

## Out of Scope

- Deployment configuration (Railway/Render/Cloudflare) — separate ops task after project is complete
- Performance testing (k6) — referenced in docs/06-TEST-STRATEGY.md but deferred post-MVP
- Visual regression testing (Chromatic) — deferred post-MVP
- Penetration testing — external engagement post-launch

---

## Notes

- E2E tests run against the full stack — backend + frontend must both be running. Configure Playwright `baseURL` to point at the frontend dev server, and the backend must be up with a seeded DB.
- E2E-07 (forgot password flow) requires a real Resend email to be received. In CI, use a test email address and check that the API call was made rather than the actual email delivery.
- E2E-09 (scheduled publish) requires time manipulation or a very short schedule window — use a `scheduled_at` of now + 10 s in the test.
- The seed script must print the raw API key to the console — it is not stored anywhere and cannot be retrieved later.
- README is the first impression. Spend time on it — clear setup instructions and a good architecture diagram make the difference between a reviewer spending 5 minutes or 30 minutes on your project.