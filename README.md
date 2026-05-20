# CMS MVP

A production-ready headless Content Management System with a NestJS REST API and a React admin SPA. Content flows through a draft → in\_review → published lifecycle, media is handled via S3-compatible storage with async variant generation, and every mutation is recorded in an append-only audit log.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Admin SPA                              │
│   React 18 + React Router + TanStack Query + Zustand + MUI 6   │
│                    http://localhost:5173                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │ Bearer JWT / HTTP-only cookie
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                       NestJS API (port 3000)                    │
│                  Hexagonal Architecture                         │
│                                                                 │
│  adapters/in/http   ←  controllers, guards, DTOs                │
│  application/       ←  use cases, port interfaces              │
│  domain/            ←  entities, value objects (pure TS)       │
│  adapters/out/      ←  Prisma repos, Redis, S3                 │
└──────┬──────────────────────┬──────────────────────────────────┘
       │                      │                      │
       ▼                      ▼                      ▼
┌─────────────┐   ┌───────────────────┐   ┌─────────────────┐
│ PostgreSQL  │   │   Redis 7         │   │ MinIO / S3      │
│ (Prisma 6)  │   │ token blocklist   │   │ media storage   │
│             │   │ cache · BullMQ    │   │ variant queue   │
└─────────────┘   └───────────────────┘   └─────────────────┘
```

**Hexagonal architecture** enforces dependency direction: domain ← application ← adapters. No Prisma types or NestJS decorators leak into domain or application layers — validated by `dependency-cruiser` on every CI run.

---

## Tech Stack

| Layer          | Technology                      | Why                                                       |
| -------------- | ------------------------------- | --------------------------------------------------------- |
| Backend        | NestJS 10 + TypeScript strict   | Module system, DI, lifecycle hooks; strict mode prevents runtime surprises |
| ORM            | Prisma 6 + PostgreSQL           | Type-safe queries, migration tooling, Neon serverless support |
| Validation     | Zod                             | Runtime schema validation at boundaries; composable, not decorator-based |
| Queue          | BullMQ + Redis 7                | Reliable job processing for media variants and scheduled publishes |
| Storage        | MinIO (local) / S3-compatible   | Standard S3 API works across providers; presigned URLs for direct upload |
| Frontend       | React 18 + Vite                 | Fast iteration with RSC-free simplicity; Vite HMR is instant |
| State          | TanStack Query + Zustand        | Server state separated from UI state; both are minimal and cache-aware |
| UI             | MUI v6 (Material Design 3)      | Accessible component library with theming; MD3 tokens in theme |
| Testing BE     | Vitest + Supertest + Testcontainers | Unit through integration without Jest quirks |
| Testing FE     | Vitest + Testing Library + MSW  | Component tests with real DOM; MSW intercepts at network level |
| E2E            | Playwright                      | Browser automation with auto-waiting; Page Object Model |
| CI             | GitHub Actions                  | Native with GitHub; matrix builds, pnpm caching |
| Package mgr    | pnpm workspaces                 | Disk-efficient monorepo management; strict hoisting |

---

## Features

| Slice | Module       | Features                                                                            |
| ----- | ------------ | ----------------------------------------------------------------------------------- |
| 1     | auth         | Email/password login, JWT (15 min), HTTP-only refresh cookie (7 days, rotating), logout, password reset via email |
| 2     | users        | User CRUD, roles (admin / editor / author), invite flow, deactivation               |
| 3     | content      | Article + Page CRUD, draft → in\_review → published lifecycle, soft delete, versioning, scheduling, SEO fields, full-text search |
| 4     | media        | Upload pipeline, S3 presigned URLs, async variant generation via BullMQ, media library with search |
| 5     | public-api   | Read-only REST API secured with X-API-Key, Redis cache (TTL 300/600 s), per-key rate limiting (60 req/min), OpenAPI/Redoc docs |
| 6     | audit        | Append-only audit log for every mutation, admin list/filter/export                  |
| 7     | notifications| Email delivery (Resend / SMTP / SES / console), password-reset and invite emails    |
| 8–9   | web SPA      | Admin SPA with login, dashboard, content list + editor (Tiptap), media library, users, audit log, API keys, profile pages |

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+
- Docker Engine with Docker Compose v2

### Setup

```bash
# 1. Clone
git clone <repo-url> cms-mvp
cd cms-mvp

# 2. Install dependencies
pnpm install

# 3. Copy and fill in environment files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# Edit both .env files — see "Environment Variables" section below

# 4. Start infrastructure (Postgres, Redis, MinIO)
docker compose up -d postgres redis minio

# 5. Run database migrations
pnpm --filter @cms/api prisma migrate dev

# 6. Seed the database
pnpm --filter @cms/api prisma db seed

# 7. Start the backend
pnpm --filter @cms/api start:dev

# 8. Start the frontend (new terminal)
pnpm --filter @cms/web dev
```

The admin SPA is at `http://localhost:5173`, the API at `http://localhost:3000`.

**Seeded credentials:**

| User                    | Password      | Role   |
| ----------------------- | ------------- | ------ |
| `admin@example.com`     | `Admin1234!`  | Admin  |
| `editor@example.com`    | `Editor1234!` | Editor |
| `author@example.com`    | `Author1234!` | Author |

---

## Environment Variables

### Backend (`apps/api/.env`)

| Variable                             | Required | Default          | Description                                          |
| ------------------------------------ | -------- | ---------------- | ---------------------------------------------------- |
| `DATABASE_URL`                       | ✅        | —                | PostgreSQL connection string                         |
| `TEST_DATABASE_URL`                  | CI only  | —                | Separate DB for tests                                |
| `JWT_SECRET`                         | ✅        | —                | Secret for signing JWTs (min 64 chars)               |
| `REDIS_URL`                          | ✅        | —                | Redis connection URL (`redis://[:password@]host:port`) |
| `NODE_ENV`                           | —        | `development`    | `development` \| `production` \| `test`             |
| `PORT`                               | —        | `3000`           | API listen port                                      |
| `PUBLIC_URL`                         | ✅        | —                | Public-facing API base URL (used in email links)     |
| `EMAIL_PROVIDER`                     | —        | `console`        | `console` \| `smtp` \| `resend` \| `ses`            |
| `EMAIL_FROM`                         | —        | `no-reply@...`   | From address for outgoing emails                     |
| `EMAIL_FROM_NAME`                    | —        | `CMS`            | Display name for from address                        |
| `FRONTEND_BASE_URL`                  | —        | —                | Frontend URL — used in invite/reset email links      |
| `SMTP_HOST`                          | SMTP     | —                | SMTP server hostname                                 |
| `SMTP_PORT`                          | SMTP     | —                | SMTP server port                                     |
| `SMTP_USER`                          | SMTP     | —                | SMTP authentication username                         |
| `SMTP_PASSWORD`                      | SMTP     | —                | SMTP authentication password                         |
| `SMTP_SECURE`                        | —        | `false`          | Use TLS for SMTP (`true`/`false`)                   |
| `RESEND_API_KEY`                     | Resend   | —                | Resend API key                                       |
| `RESEND_FROM_ADDRESS`                | Resend   | —                | Resend verified from address                         |
| `OBJECT_STORAGE_ENDPOINT`            | ✅        | —                | S3-compatible endpoint URL                           |
| `OBJECT_STORAGE_REGION`             | ✅        | —                | S3 region                                            |
| `OBJECT_STORAGE_BUCKET`             | ✅        | —                | S3 bucket name                                       |
| `OBJECT_STORAGE_ACCESS_KEY`         | ✅        | —                | S3 access key ID                                     |
| `OBJECT_STORAGE_SECRET_KEY`         | ✅        | —                | S3 secret access key                                 |
| `OBJECT_STORAGE_PUBLIC_URL`         | ✅        | —                | Public URL prefix for served media                   |
| `MAX_UPLOAD_BYTES`                   | —        | `20971520` (20 MB) | Maximum upload file size                           |
| `PRESIGN_TTL_SECONDS`               | —        | `300`            | Presigned URL time-to-live                           |
| `WORKER_SCHEDULED_PUBLISH_INTERVAL_SEC` | —   | `30`             | Scheduled-publish worker poll interval               |

### Frontend (`apps/web/.env`)

| Variable       | Required | Description                                  |
| -------------- | -------- | -------------------------------------------- |
| `VITE_API_URL` | ✅        | Backend admin API base URL (e.g. `http://localhost:3000/api/admin`) |

---

## Running Tests

```bash
# Full test suite (API unit + integration + web unit)
pnpm run test

# API tests only
pnpm --filter @cms/api test

# Web unit tests only
pnpm --filter @cms/web test

# Playwright E2E tests (requires full stack running + seeded DB)
pnpm --filter @cms/web exec playwright test

# Type checks
pnpm --filter @cms/api tsc --noEmit
pnpm --filter @cms/web tsc --noEmit

# Lint
pnpm --filter @cms/api lint
pnpm --filter @cms/web lint

# Architecture constraint check
pnpm --filter @cms/api run depcruise
```

---

## CI/CD Pipeline

GitHub Actions (`.github/workflows/`) runs on every push and pull request:

| Step              | Command                              | Failure blocks merge |
| ----------------- | ------------------------------------ | -------------------- |
| Install           | `pnpm install --frozen-lockfile`     | Yes                  |
| Type check (API)  | `pnpm --filter @cms/api tsc --noEmit` | Yes                 |
| Type check (Web)  | `pnpm --filter @cms/web tsc --noEmit` | Yes                 |
| Lint (API)        | `pnpm --filter @cms/api lint`        | Yes                  |
| Lint (Web)        | `pnpm --filter @cms/web lint`        | Yes                  |
| Test (API)        | `pnpm --filter @cms/api test`        | Yes                  |
| Test (Web)        | `pnpm --filter @cms/web test`        | Yes                  |
| Depcruise         | `pnpm --filter @cms/api run depcruise` | Yes                |
| Build             | `pnpm run build`                     | Yes                  |

Tests run against a Neon `cms_test` branch (API) and jsdom (Web). Redis in CI is a no-auth `redis:7-alpine` container.

---

## Project Structure

```
cms-mvp/
├── apps/
│   ├── api/                          # NestJS backend
│   │   ├── src/
│   │   │   ├── app.module.ts         # Root module
│   │   │   ├── config/               # Zod env validation
│   │   │   ├── health/               # GET /health
│   │   │   ├── shared/               # Cross-cutting: Prisma, guards, adapters, ports
│   │   │   └── modules/
│   │   │       ├── auth/             # Login, JWT, refresh, password reset, API keys
│   │   │       ├── users/            # User CRUD, roles, invite
│   │   │       ├── content/          # Articles, pages, lifecycle, versioning, scheduling
│   │   │       ├── media/            # Upload pipeline, variants, S3
│   │   │       ├── audit/            # Append-only audit log
│   │   │       ├── notification/     # Email delivery
│   │   │       ├── api-keys/         # API key management
│   │   │       └── public-api/       # Read-only public REST API
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # Database schema
│   │   │   ├── migrations/           # Prisma migration history
│   │   │   └── seed.ts               # Database seeder
│   │   └── test/                     # Fakes, builders, integration tests
│   └── web/                          # React admin SPA
│       ├── src/
│       │   ├── app/                  # Router, providers, route guards
│       │   ├── features/             # Feature slices (auth, content, media, ...)
│       │   ├── pages/                # Standalone pages (404, 403)
│       │   └── shared/               # Shared API client, components, utils
│       ├── e2e/                      # Playwright E2E tests + page objects
│       └── tests/                    # Vitest unit tests
├── docs/                             # Specification documents (01–09)
├── docker-compose.yml                # Local infrastructure (Postgres, Redis, MinIO)
├── package.json                      # Root workspace scripts
└── pnpm-workspace.yaml
```

---

## Key Design Decisions

### 1. Hexagonal Architecture for the Backend

All business logic lives in `domain/` and `application/` layers with zero framework or ORM dependencies. NestJS only exists at the adapter boundary. This makes domain logic trivially testable with pure in-memory fakes, and swappable (e.g. Prisma → DrizzleORM) without touching use cases.

### 2. Short-lived Tokens + HTTP-only Cookie Refresh

Access tokens expire in 15 minutes — short enough to limit damage if stolen, long enough not to interrupt UX. Refresh tokens (7 days) live in HTTP-only `Secure; SameSite=Strict` cookies so JavaScript can never read them. Rotation on each use and a Redis token blocklist prevent replay attacks.

### 3. Append-Only Audit Log

The audit table has no `UPDATE` or `DELETE` operations exposed anywhere in the stack — enforced at the application port level (`AuditPort` exposes only `save()` and `findMany()`). This makes the log tamper-evident and suitable for compliance requirements.

### 4. S3 Presigned URLs for Direct Upload

File uploads go directly from the browser to S3 using a presigned URL — the API never touches the bytes. This removes upload bottleneck from the API, keeps the API stateless, and avoids multipart streaming complexity.

### 5. Public API Caching and Rate Limiting

The public read API caches list responses for 300 s and detail responses for 600 s in Redis, invalidated on publish/unpublish. Per-key rate limiting (60 req/min via ThrottlerModule) prevents abuse without requiring authentication, keeping the public API consumer-friendly.

---

## API Documentation

- **Swagger UI**: [http://localhost:3000/docs](http://localhost:3000/docs) — interactive, try-it-out
- **Redoc**: [http://localhost:3000/redoc](http://localhost:3000/redoc) — read-optimized reference
