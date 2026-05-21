# PROGRESS.md

Read this at the start of every session. Update it before ending a session.

---

## In Progress

_Nothing — all slices shipped. See Next Up for post-MVP work._

---

## Next Up

All documented slices (CMS-001 → CMS-020) are complete. No tasks defined in `docs/tasks/` beyond this point. Define a new task file before starting any new work.

---

## Blocked

_Nothing blocked._

---

## Recently Done

### 2026-05-20 — CMS-020 · E2E tests, seed script, docs, accessibility
- Playwright E2E suite added covering login → create → publish → public API flow
- Seed script added (`apps/api/prisma/seed.ts`) for local dev and CI
- README updated with full setup guide and env var table
- Accessibility audit pass — Lighthouse scores ≥ 90 on all screens
- Fixed: Redis teardown race condition in public-api integration test (commit `52e7daf`) — `closeRedis()` was being called before the last assertion completed; added explicit `await` before teardown
- Fixed: rate limiting integration test timeout increased to 15s (commit `30dc7c2`) — test was hitting the 60 req/min guard and the default 5s Vitest timeout was too short

### 2026-05-20 — CMS-019 · Media library + admin screens (#13)
- Media library screen: grid view, drag-and-drop upload, variant URLs, delete with confirmation
- User management screen: list with role badges, invite form (email + role)
- Profile screen added
- Media picker wired into content editor

### 2026-05-19 — CMS-018 · App shell, dashboard, content list, content editor (#11)
- App shell with sidebar navigation and protected route wrapper
- Dashboard: summary counts (published, draft, in_review, media)
- Content list: paginated table with type filter and search
- Content editor: rich text body, slug, SEO fields, lifecycle action buttons (Submit / Publish / Unpublish / Schedule)
- Fixed: missing `dev` script in `apps/web/package.json` (commit `c1fc875`)

### 2026-05-19 — CMS-017 · Frontend foundation + auth screens (#10)
- `apps/web` bootstrapped: Vite + React 18 + TypeScript strict + React Router v6
- MUI v6 Material Design 3 theme from `docs/03-DESIGN.md`
- Login, Forgot Password, Reset Password screens
- JWT stored in memory; refresh cookie handled automatically by axios interceptor

### 2026-05-19 — CMS-016 · Password reset full flow (`71b3c42`)
- `POST /api/admin/auth/password/forgot` — enqueues Resend email, always returns 202 (no user enumeration)
- `POST /api/admin/auth/password/reset` — validates token, hashes new password, single-use (second use → 410 Gone)
- Successful reset invalidates all existing refresh tokens via `passwordChangedAt` timestamp check
- Fixed: users integration test migrated to Testcontainers Postgres (commit `81c57d3`) — was hitting Neon cold-start timeouts in CI

### 2026-05-19 — CMS-015 · Email notifications via Resend + BullMQ (`9b86ca0`)
- `NotificationModule` with `IEmailSenderPort`, `NotificationService`, `EmailQueueProducer`, `EmailWorkerProcessor`, `ResendEmailSenderAdapter`
- Queue: `email.queue`, job types: `password-reset` | `invite`, retries: 3 × exponential backoff (5s → 10s → 20s)
- `AuthModule` and `UserModule` wired to inject `NotificationService`
- Fixed: Resend client lazy-initialized to prevent startup crash when `RESEND_API_KEY` absent locally (commit `9837f12`)
- Fixed: `NotificationService` imported via public barrel (`index.ts`) to satisfy depcruise (commit `a657afb`)

### 2026-05-19 — Security + architecture fixes
- Fixed: unguarded public route removed from media module; magic byte validation added on finalize (commit `48eb1b6`) — any file type could previously be uploaded by spoofing Content-Type
- Fixed: 16 depcruise architecture violations resolved (commit `2772293`) — Prisma types were leaking into application layer across multiple modules; imports restructured to respect hexagonal boundaries

### 2026-05-18 — CMS-012–014 · Audit module + retrofit (#10)
- Append-only audit log: `AuditPort` with `save()` and `findMany()` only
- `GET /api/admin/audit` with filters; `GET /api/admin/audit/export` returns CSV
- Retrofitted into auth, users, content, and media — all mutations emit audit events
- Fixed: FK cleanup order in integration tests; test isolation for parallel runs (commit `2416414`)

### 2026-05-18 — CMS-009–011 · Public API — caching, rate limiting, OpenAPI (#7, #8, #9)
- `GET /api/public/content` and `/api/public/content/:slug` with Redis cache (list 300s, detail 600s)
- Cache invalidated on publish/unpublish
- `ApiKeyThrottlerGuard`: 60 req/min per API key, 429 with `Retry-After` header
- Response envelope `{ data, meta }` on all public endpoints
- Swagger at `/docs`, Redoc at `/redoc`
- Fixed: Testcontainers Postgres timeout on prisma-public-content repository spec (commit `b084a57`)

### 2026-05-16 — CMS-002 · API keys (public-api guard)
- `ApiKey` entity, value objects, domain errors
- `sha256` hash stored, raw key returned once on creation
- `ApiKeyGuard` validates `X-API-Key` header
- Multiple test and FK-cleanup fixes across the integration suite (commits `7aaf3ec`, `f389d94`, `4b506c9`, `d0fcb66`, `93ddbc9`)

### 2026-05-15 — CMS-007–008 · Media upload + library (#1–#6)
- Upload pipeline: multipart → MinIO/S3 → BullMQ variant job → status transitions `processing` → `ready`
- Library: paginated list, variant URLs, soft-delete, 30-day BullMQ cron hard-delete
- Magic byte validation added (see security fix above, applied retroactively)

### Earlier — CMS-001, CMS-003–006, CMS-013–014
- Auth core (login, JWT, refresh rotation, logout, lockout)
- User management (CRUD, roles, invite flow)
- Content CRUD, lifecycle, scheduling, versioning, SEO, full-text search
- Audit retrofit into content + media

---

## Module Coverage

| Module        | Status   | Coverage file                     |
| ------------- | -------- | --------------------------------- |
| auth          | ✅ Done  | docs/coverage/auth.covered        |
| users         | ✅ Done  | docs/coverage/users.covered       |
| content       | ✅ Done  | docs/coverage/content.covered     |
| media         | ✅ Done  | docs/coverage/media.covered       |
| public-api    | ✅ Done  | docs/coverage/public-api.covered  |
| audit         | ✅ Done  | docs/coverage/audit.covered       |
| notifications | ✅ Done  | docs/coverage/notifications.covered |
| web (SPA)     | ✅ Done  | docs/coverage/web.covered         |
