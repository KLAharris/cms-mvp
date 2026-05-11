# CMS MVP

CMS MVP is a monorepo for a headless content management system with an admin SPA, a NestJS application server, PostgreSQL, Redis, and S3-compatible media storage. Phase 0 establishes the buildable project skeleton, architecture boundaries, tests, CI, and Docker Compose topology without adding business logic.

## Prerequisites

- Node.js 20
- pnpm 10
- Docker Engine with Docker Compose v2

## Setup

```bash
git clone <repo-url> cms-mvp
cd cms-mvp
cp .env.example .env
pnpm install
docker compose up
```

## Common Commands

| Command | Purpose |
| --- | --- |
| `pnpm run lint` | Run ESLint across workspaces |
| `pnpm run typecheck` | Run TypeScript checks across workspaces |
| `pnpm run test` | Run Vitest suites across workspaces |
| `pnpm run build` | Build all workspaces |
| `pnpm run depcruise` | Enforce dependency boundaries |
| `docker compose up` | Start local Compose services |
| `docker compose down` | Stop local Compose services |

## Project Structure

```text
cms-mvp/
├── apps/
│   ├── api/          # NestJS backend, hexagonal module layout
│   └── web/          # React 18 + Vite admin SPA
├── packages/
│   └── shared/       # Shared package barrel and future contracts
├── docs/             # Project specification documents
├── docker-compose.yml
├── package.json
└── pnpm-workspace.yaml
```

## Architecture Notes

The backend follows hexagonal architecture: domain, application ports/use cases, and adapters are separated per module, with dependency-cruiser enforcing inward dependencies and no direct imports of another module's internals.

The frontend follows a reactive SPA structure using React, React Router, TanStack Query, Zustand, and MUI v6 with Material Design 3 color roles.

Deployment targets a single Linux VM using Docker Compose. The topology includes API, web, PostgreSQL 15, Redis 7, MinIO, named volumes, health checks, and separate `cms-edge`, `cms-internal`, and `cms-monitoring` networks.
