---
layer: L3
owner: cms-web
applies_to: apps/web/src/
last_reviewed: 2026-05-19
---

# Slice 9 Phase 1 — Frontend Foundation + Auth Screens

## Goal

Bootstrap the Admin SPA with its full tech stack, routing structure, MUI v6 Material Design 3 theme, and global state. Implement the three auth screens: Login, Forgot Password, and Reset Password. All screens follow the design spec in `docs/03-DESIGN.md`.

## Sequencing

Requires Slices 1–8 merged and CI green. This is the first frontend phase — all subsequent phases build on top of the foundation laid here.

## Context to Load

- `.claude/templates/CONTEXT.md`
- `docs/03-DESIGN.md` § 3–9 (MD3 foundations, tokens, typography, color, motion)
- `docs/03-DESIGN.md` § 12.1 (Login screen spec)
- `docs/04-ARCH.md` § 5 (Frontend architecture — Reactive)
- `docs/06-TEST-STRATEGY.md` § 8 (Frontend test strategy)
- `apps/web/` — existing Vite + React scaffold

---

## Locked Design Decisions (from docs)

- **Stack**: React 18, TypeScript strict, Vite, MUI v6 (MD3-aligned), TanStack Query, Zustand, RxJS, TipTap
- **Design system**: Material Design 3 — color roles, type scale, shape scale, motion tokens from `docs/03-DESIGN.md`
- **Icons**: Material Symbols variable font, rounded style, weight 400, optical size 24
- **Fonts**: Roboto Flex (variable) primary, Roboto Mono for code
- **Routing**: React Router v6 with protected routes (redirect to login if unauthenticated)
- **Auth state**: Zustand slice — stores access token, user info (role, name, email), hydrated from `localStorage` on load
- **API client**: Axios instance with base URL from `VITE_API_URL` env var; interceptor attaches Bearer token; interceptor handles 401 by clearing auth state and redirecting to login
- **Responsive breakpoints**: Compact < 600 dp, Medium 600–840 dp, Expanded ≥ 840 dp (MD3 window size classes)

---

## Definition of Done

### Project Setup (`apps/web/`)

- [ ] `vite.config.ts` configured with path aliases (`@/` → `src/`)
- [ ] TypeScript strict mode enabled
- [ ] ESLint + Prettier configured consistent with backend
- [ ] MUI v6 installed and configured with MD3 theme:
  - Seed color from `docs/03-DESIGN.md` § 6
  - Roboto Flex font loaded
  - Material Symbols icon font loaded
  - Light and dark theme variants
- [ ] `ThemeProvider` wraps the app with system preference detection (`prefers-color-scheme`)
- [ ] React Router v6 set up with route structure:
  - `/login` — public
  - `/forgot-password` — public
  - `/reset-password` — public
  - `/` → redirect to `/dashboard` — protected
  - `*` → 404 screen
- [ ] Axios instance at `src/lib/api.ts` with base URL, auth interceptor, and 401 handler
- [ ] TanStack Query `QueryClient` configured with sensible defaults (stale time, retry)
- [ ] Zustand auth store: `useAuthStore` with `user`, `accessToken`, `login()`, `logout()`, `isAuthenticated`
- [ ] `ProtectedRoute` component redirects unauthenticated users to `/login`

### Login Screen (`/login`)

- [ ] Layout matches `docs/03-DESIGN.md` § 12.1: centered card, logo 64 dp top-centered, 24 dp gap
- [ ] Email field (outlined), password field (outlined, toggle visibility)
- [ ] Submit button calls `POST /api/admin/auth/login`; on success stores token in Zustand + redirects to `/dashboard`
- [ ] Error banner above form on invalid credentials (`"Email or password is incorrect."`)
- [ ] Lockout state: generic message shown, no count revealed (FR-AUTH-06)
- [ ] "Forgot password?" link → `/forgot-password`
- [ ] Loading state on submit button
- [ ] Keyboard: Enter submits form; focus management on error

### Forgot Password Screen (`/forgot-password`)

- [ ] Email field, submit button
- [ ] Calls `POST /api/admin/auth/forgot-password`
- [ ] Always shows success message regardless of whether email exists (no enumeration — SEC-11): `"If that email is registered you will receive a reset link shortly."`
- [ ] Back to login link

### Reset Password Screen (`/reset-password?token=...`)

- [ ] Reads `token` from query params
- [ ] New password + confirm password fields with visibility toggle
- [ ] Client-side validation: passwords match, minimum 12 chars, at least one letter and one digit (FR-AUTH-02)
- [ ] Calls `POST /api/admin/auth/reset-password` with token + password
- [ ] On success: shows confirmation message + redirects to `/login` after 3 s
- [ ] On invalid/expired token: shows error message `"This reset link is invalid or has expired."`

### Testing

- [ ] Unit tests for `useAuthStore` — login, logout, token persistence
- [ ] Unit tests for `ProtectedRoute` — redirects unauthenticated users
- [ ] Component tests for Login screen — happy path, error state, loading state
- [ ] Component tests for Forgot Password screen — always shows success
- [ ] Component tests for Reset Password screen — validation, success, expired token

### Quality

- [ ] `pnpm --filter @cms/web tsc --noEmit` exits 0
- [ ] `pnpm --filter @cms/web lint` exits 0
- [ ] `pnpm --filter @cms/web exec vitest run` exits 0

---

## Acceptance Commands

```bash
# Type check
pnpm --filter @cms/web tsc --noEmit

# Lint
pnpm --filter @cms/web lint

# Tests
pnpm --filter @cms/web exec vitest run

# Start dev server
pnpm --filter @cms/web dev
# open http://localhost:5173/login
# expect: Login screen with MD3 styling
```

---

## Rollback

Revert the branch. No backend changes. No database changes.

---

## Out of Scope

- Dashboard, Content, Media, Users, Audit screens (Phase 2+)
- E2E tests (Phase 4)
- Dark mode toggle in UI (foundation is built, toggle comes in Profile screen Phase 3)

---

## Notes

- MUI v6 MD3 theme setup is the most important part of this phase — get the tokens right here and all subsequent screens inherit them correctly. Reference `docs/03-DESIGN.md` § 4–6 carefully.
- Access token is stored in Zustand (in-memory) and persisted to `localStorage` for page refresh. Never store raw passwords.
- The `401` interceptor must handle token expiry gracefully — clear auth state and redirect to login without an infinite loop.
- Roboto Flex is a variable font — load it via Google Fonts or self-host; do not use static weight variants.