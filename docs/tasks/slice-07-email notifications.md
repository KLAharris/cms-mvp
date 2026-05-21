---
layer: L3
owner: notification-bounded-context
applies_to: apps/api/src/modules/notification/
last_reviewed: 2026-05-19
---

# Slice 7 — Email Notifications (Password Reset + Invite)

## Goal

Build the `notification` module end-to-end following hexagonal architecture. The module exposes a `NotificationService` that `AuthModule` and `UserModule` inject to trigger emails. Emails are dispatched **asynchronously** via a BullMQ queue (`email.queue`) so the sending HTTP request never blocks on Resend's API. A worker processor picks up jobs and calls the `ResendEmailSenderAdapter`. Two email types are implemented: password reset and user invite.

## Sequencing

Depends on Slices 1–3 (Auth + Users) being merged — the use cases that call `NotificationService` (`ForgotPassword`, `InviteUser`) live there. Slice 9 (Admin SPA) will close E2E-07 (forgot-password full flow), but Slice 7 itself has no frontend dependency — the reset link base URL is read from `FRONTEND_BASE_URL` env var. Ship before Slice 8.

## Context to Load

- `.claude/templates/CONTEXT.md`
- `docs/02-Software-Requirements-Specification.md` § 5.1 (FR-AUTH-07, FR-AUTH-08)
- `docs/02-Software-Requirements-Specification.md` § 5.2 (FR-USER-02)
- `docs/04-ARCH.md` § 4 (Hexagonal backend rules)
- `docs/06-TEST-STRATEGY.md` § 7.3 (Application layer testing with fakes)
- `test/integration/resend-email-sender.adapter.spec.ts` (placeholder — implement here)

---

## Locked Design Decisions (from grilling session 2026-05-19)

- **Q1** — Email provider: **Resend** via official `resend` SDK
- **Q2** — Port style: specific methods — `sendPasswordResetEmail(to, resetLink)` and `sendInviteEmail(to, inviteLink, role)` — no generic `send(template, payload)` abstraction
- **Q3** — Frontend base URL: read from `FRONTEND_BASE_URL` env var; the full reset/invite link is assembled in `NotificationService` (application layer), not in the adapter
- **Q4** — Dispatch strategy: **asynchronous via BullMQ** — port methods enqueue a job, a worker sends; Resend API call is never on the HTTP critical path
- **Q5** — Queue structure: **one queue** (`email.queue`), jobs discriminated by `type` field (`'password-reset'` | `'invite'`); separate processor function per type inside one worker
- **Q6** — Retry policy: **exponential backoff**, 3 max attempts (1 original + 2 retries); delays ≈ 5 s → 10 s → 20 s
- **Q7** — Module ownership: new **`NotificationModule`** owns the service, queue producer, worker processor, and Resend adapter; `AuthModule` and `UserModule` import it and inject `NotificationService`
- **Q8** — Adapter testing: **mock the Resend SDK** (`resend.emails.send`); assert correct payload shape; test error path
- **Q9** — Worker error handling: **catch → log structured entry → rethrow**; never swallow; BullMQ handles retries naturally from the rethrow
- **Q10** — Acceptance criteria grounded in FR-AUTH-07, FR-AUTH-08, FR-USER-02; E2E-07 full flow deferred to Slice 9 (frontend required)

---

## Definition of Done

### Domain (`src/modules/notification/domain/`)

- [x] `IEmailSenderPort` interface with two methods:
  - `sendPasswordResetEmail(to: string, resetLink: string): Promise<void>`
  - `sendInviteEmail(to: string, inviteLink: string, role: string): Promise<void>`
- [x] `EmailJob` discriminated union:
  ```ts
  | { type: 'password-reset'; to: string; resetLink: string }
  | { type: 'invite'; to: string; inviteLink: string; role: string }
  ```
- [x] Unit tests 100% on any domain type guards or value objects introduced

### Application (`src/modules/notification/application/`)

- [x] `NotificationService` — constructs full links from `FRONTEND_BASE_URL` env var, delegates to `EmailQueueProducer`
  - `sendPasswordResetEmail(to, token)` — assembles `${FRONTEND_BASE_URL}/reset-password?token=${token}`, enqueues job `{ type: 'password-reset', to, resetLink }`
  - `sendInviteEmail(to, token, role)` — assembles `${FRONTEND_BASE_URL}/accept-invite?token=${token}`, enqueues job `{ type: 'invite', to, inviteLink, role }`
- [x] Unit tests for `NotificationService` using `FakeEmailQueueProducer` (in-memory, no I/O):
  - enqueues a `password-reset` job with correct `to` and a `resetLink` that starts with `FRONTEND_BASE_URL`
  - enqueues an `invite` job with correct `to`, `role`, and assembled `inviteLink`
  - propagates error if producer throws

### Infrastructure — Queue Producer (`src/modules/notification/adapters/out/queue/`)

- [x] `EmailQueueProducer` — wraps BullMQ `Queue`; `enqueue(job: EmailJob): Promise<void>`
- [x] BullMQ job options: `attempts: 3`, `backoff: { type: 'exponential', delay: 5000 }`
- [x] Queue name exported as constant: `EMAIL_QUEUE_NAME = 'email.queue'`

### Infrastructure — Worker (`src/modules/notification/adapters/out/worker/`)

- [x] `EmailWorkerProcessor` — BullMQ `Worker` on `email.queue`
  - Routes `'password-reset'` jobs → `ResendEmailSenderAdapter.sendPasswordResetEmail`
  - Routes `'invite'` jobs → `ResendEmailSenderAdapter.sendInviteEmail`
  - On any error: logs `{ jobId: job.id, type: job.data.type, to: job.data.to, error: err.message }` then rethrows
- [x] Unknown `type` values throw `UnhandledEmailJobTypeError` — prevents silent no-ops when a new type is added without updating the processor

### Infrastructure — Resend Adapter (`src/modules/notification/adapters/out/email/`)

- [x] `ResendEmailSenderAdapter` implements `IEmailSenderPort`
  - `sendPasswordResetEmail(to, resetLink)` — calls `resend.emails.send` with `to`, `from` (env `RESEND_FROM_ADDRESS`), `subject: 'Reset your password'`, and `html` body containing the link
  - `sendInviteEmail(to, inviteLink, role)` — calls `resend.emails.send` with `to`, `from`, `subject: "You've been invited"`, and `html` body containing the link and role
- [x] `RESEND_API_KEY` and `RESEND_FROM_ADDRESS` read via `ConfigService`; module fails fast on startup if either is absent
- [x] Integration tests filling the existing placeholder at `test/integration/resend-email-sender.adapter.spec.ts`:
  - Mock `resend.emails.send` with `vi.fn()`
  - `sendPasswordResetEmail` — asserts correct `to`, `subject`, and that `html` contains the reset link
  - `sendInviteEmail` — asserts correct `to`, `subject`, and that `html` contains the invite link and role
  - Error path — mock rejects; assert error propagates (no swallowing)

### Module Wiring (`src/modules/notification/notification.module.ts`)

- [x] `NotificationModule` declares and exports `NotificationService`
- [x] Registers BullMQ queue and worker via `BullModule.registerQueue` / `BullModule.registerWorker`
- [x] `AuthModule` and `UserModule` import `NotificationModule` and inject `NotificationService` into the relevant use cases (`ForgotPasswordUseCase`, `InviteUserUseCase`)

### Quality

- [x] `pnpm --filter @cms/api tsc --noEmit` exits 0
- [x] `pnpm --filter @cms/api lint` exits 0
- [x] `pnpm --filter @cms/api exec vitest run src/modules/notification` exits 0
- [x] `pnpm --filter @cms/api exec vitest run test/integration/resend-email-sender.adapter.spec.ts` exits 0
- [x] Coverage ≥ 98% on notification module
- [x] No `any` in new files (TypeScript strict)

---

## Acceptance Commands

```bash
# Type check
pnpm --filter @cms/api tsc --noEmit

# Lint
pnpm --filter @cms/api lint

# Notification module unit tests
pnpm --filter @cms/api exec vitest run src/modules/notification

# Resend adapter integration test
pnpm --filter @cms/api exec vitest run test/integration/resend-email-sender.adapter.spec.ts

# Manual smoke — trigger a password reset (requires running API + valid user in DB)
curl -fsS -X POST http://localhost:3000/api/admin/auth/password/forgot \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
# expect: 202 Accepted (job enqueued; no real email sent unless RESEND_API_KEY is live)

# Confirm job was enqueued via Redis CLI
redis-cli LLEN bull:email.queue:wait
# expect: 1 (increments per request)
```

---

## Rollback

Revert the branch. No new Prisma migrations in this slice — `notification` module is pure application + infrastructure on top of the existing Redis instance. No schema changes to undo.

If BullMQ jobs are lingering in Redis:

```bash
redis-cli DEL bull:email.queue:wait bull:email.queue:active bull:email.queue:failed
```

`AuthModule` and `UserModule` injection points for `NotificationService` must also be reverted if already wired.

---

## Out of Scope

- E2E-07 full flow (user clicks forgot password → receives email → resets → logs in) — deferred to Slice 9 (requires frontend)
- Welcome email or any third email type — follow-up slice
- HTML email templating engine (inline strings are fine for MVP)
- Unsubscribe / email preferences
- Delivery webhooks or bounce handling from Resend
- `RESEND_FROM_ADDRESS` domain verification in DNS (ops task, not code)

---

## Notes

- `IEmailSenderPort` lives in `domain/ports/` — owned by domain, not application layer (mirrors `AuditPort` pattern from Slice 6)
- `FakeEmailQueueProducer` lives in `test/doubles/` — reused when future email types are added
- Link assembly (`FRONTEND_BASE_URL + path + token`) belongs in `NotificationService`, not in the adapter — the adapter only knows how to send, not what the link means
- `UnhandledEmailJobTypeError` in the worker is an exhaustiveness guard — adding a new `EmailJob` type without updating the processor should be a loud failure, not a silent skip
- Redis must be running locally; use the existing `docker-compose.dev.yml` service