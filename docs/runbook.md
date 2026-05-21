# CMS MVP — Runbook

Operational guide for recurring failure patterns. Each entry maps to a rootcause file in `docs/rootcause/`. Read the matching JSON for full context.

---

## Index

| # | Symptom (what you see) | Rootcause file |
|---|------------------------|----------------|
| 1 | Test fails: Redis connection closed mid-assertion | [redis-teardown-race-condition.json](rootcause/redis-teardown-race-condition.json) |
| 2 | Rate-limit integration test times out | [rate-limit-test-timeout.json](rootcause/rate-limit-test-timeout.json) |
| 3 | `pnpm --filter @cms/web dev` → "Missing script: dev" | [web-missing-dev-script.json](rootcause/web-missing-dev-script.json) |
| 4 | API fails to start: "RESEND_API_KEY is required" | [resend-eager-init-crash.json](rootcause/resend-eager-init-crash.json) |
| 5 | `depcruise` reports a violation on NotificationService import | [notification-service-barrel-depcruise.json](rootcause/notification-service-barrel-depcruise.json) |
| 6 | Media upload accepts wrong file type / route returns 200 without auth | [media-security-missing-validation.json](rootcause/media-security-missing-validation.json) |
| 7 | `depcruise` reports violations (Prisma types in application layer) | [depcruise-16-architecture-violations.json](rootcause/depcruise-16-architecture-violations.json) |
| 8 | Integration tests fail with FK constraint errors | [integration-test-fk-cleanup-order.json](rootcause/integration-test-fk-cleanup-order.json) |
| 9 | `prisma-public-content.repository.spec.ts` times out before any test | [testcontainers-timeout-public-content.json](rootcause/testcontainers-timeout-public-content.json) |
| 10 | Users integration test times out on first CI run | [users-test-neon-cold-start.json](rootcause/users-test-neon-cold-start.json) |

---

## 1 — Redis connection closed mid-assertion

**When you see:**
```
Error: Connection is closed.
  at RedisClient.<anonymous> (node_modules/ioredis/...)
```
Test passes individually but fails when run with the full suite or in parallel.

**Diagnose:**
1. Find the `afterAll` / `afterEach` in the failing spec.
2. Check whether `closeRedis()` or `redis.quit()` is called before the last `await` in the test body.
3. Look for missing `await` before the teardown call.

**Fix:**
Add `await` before every assertion that touches Redis, then call teardown:
```ts
// Before (broken)
afterAll(() => closeRedis());

// After (correct)
afterAll(async () => {
  await lastAssertion;
  await closeRedis();
});
```

**Prevent:**
- Always `await` Redis operations in test bodies before any teardown.
- Add `hookTimeout: 15000` to the affected spec's `vitest.config.ts` override so teardown has time to finish.

---

## 2 — Rate-limit test timeout

**When you see:**
```
Error: Test timed out after 5000ms
  at PublicApiController integration > rate limit enforcement
```

**Diagnose:**
1. Count the requests the test sends — if it's exercising the 60 req/min guard, 61 serial HTTP calls take ~6-8 s.
2. Check the Vitest `testTimeout` in the failing spec (default is 5000 ms).

**Fix:**
Add a per-test timeout override above the threshold:
```ts
it('enforces 60 req/min', async () => { ... }, 15_000);
// or in describe block:
describe('rate limit', { timeout: 15_000 }, () => { ... });
```

**Prevent:**
Set a higher default `testTimeout` in `vitest.config.ts` for integration specs, or always add explicit timeouts on any test that makes > 10 serial HTTP requests.

---

## 3 — Missing `dev` script in web

**When you see:**
```
ERR_PNPM_NO_SCRIPT  Missing script: dev
 in /Users/.../apps/web
```

**Diagnose:**
```bash
cat apps/web/package.json | grep '"dev"'
# If empty — the script is missing
```

**Fix:**
Add to `apps/web/package.json`:
```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  ...
}
```

**Prevent:**
When bootstrapping a new frontend workspace, verify all four scripts exist before committing: `dev`, `build`, `preview`, `test`.

---

## 4 — API crashes on startup: RESEND_API_KEY missing

**When you see:**
```
Error: RESEND_API_KEY is required
  at ResendEmailSenderAdapter (src/modules/notification/...)
```
API fails to start even when email is not being used.

**Diagnose:**
1. Check `apps/api/.env` or `apps/api/.env.local` — is `RESEND_API_KEY` set?
2. Find where the Resend client is instantiated — is it in the constructor or on first use?

**Fix:**
Change any `ConfigService.getOrThrow('RESEND_API_KEY')` call that is in a constructor to a lazy getter:
```ts
// Before (fails at startup)
constructor(private config: ConfigService) {
  this.resend = new Resend(config.getOrThrow('RESEND_API_KEY'));
}

// After (lazy — only throws when email is actually sent)
private get resend(): Resend {
  return new Resend(this.config.getOrThrow('RESEND_API_KEY'));
}
```

**Prevent:**
External service clients (Resend, S3, etc.) should always be lazy-initialized. Add `RESEND_API_KEY=changeme` to `apps/api/.env.example` with a comment marking it optional for local dev.

---

## 5 — `depcruise` violation on cross-module import

**When you see:**
```
error  src/modules/auth/application/use-cases/login.ts
  → src/modules/notification/application/notification.service.ts
  Dependency is not allowed
```

**Diagnose:**
```bash
pnpm --filter @cms/api depcruise
# Look at the reported path — is the import going through a public barrel (index.ts)?
```

**Fix:**
Replace internal paths with the module's public barrel:
```ts
// Before (internal path — violates boundary)
import { NotificationService } from '../notification/application/notification.service';

// After (barrel — respects boundary)
import { NotificationService } from '../notification';
```

**Prevent:**
Every module must have an `index.ts` barrel that exports its public API. Cross-module imports must only import from that barrel. Run `pnpm --filter @cms/api depcruise` before every PR.

---

## 6 — Media upload accepts wrong file type / unguarded route

**When you see:**
- A file with a `.jpg` extension but PDF content is accepted and stored.
- A media endpoint returns 200 without an `Authorization` header.

**Diagnose:**
1. Check `FinalizeUploadUseCase` — does it call `MimeValidatorPort.validateMimeConsistency`?
2. Check the media HTTP controller — does every route have `@UseGuards(JwtAuthGuard)`?

**Fix:**
1. Ensure magic byte validation runs in the finalize step:
   ```ts
   await this.mimeValidator.validateMimeConsistency(storageKey, declaredMimeType);
   ```
2. Apply the guard to every route that is not intentionally public:
   ```ts
   @UseGuards(JwtAuthGuard)
   @Post(':id/finalize')
   async finalize(...) { ... }
   ```

**Prevent:**
- Architecture rule: all `adapters/in/http/` routes are guarded by default. Explicitly mark exceptions.
- Security test: add an integration test that POSTs a file with a mismatched MIME type and expects 422.

---

## 7 — `depcruise` reports Prisma types in application layer

**When you see:**
```
error  src/modules/content/application/use-cases/create-content.ts
  → node_modules/.prisma/client
  Domain/Application layer must not depend on Prisma
```
Multiple violations across several modules.

**Diagnose:**
```bash
pnpm --filter @cms/api depcruise 2>&1 | grep "error"
# Each line shows the offending import chain
```

**Fix pattern:**
1. Identify the file importing Prisma types.
2. Replace Prisma types with the module's own domain/application types.
3. Move mapping logic to the adapter (`adapters/out/persistence/`) where Prisma is allowed.
```ts
// Before (in application layer — wrong)
import { Prisma } from '@prisma/client';
function save(data: Prisma.ContentCreateInput) { ... }

// After (in adapter layer — correct)
import { Content } from '../../domain/entities/content.entity';
function save(content: Content) {
  const data = this.mapper.toPrisma(content); // mapping stays in adapter
  return this.prisma.content.create({ data });
}
```

**Prevent:**
Hexagonal rule: Prisma types (`@prisma/client`, `.prisma/client`) are only allowed in `adapters/out/`. Run depcruise in CI and locally before every commit. See CLAUDE.md "Hard Rules".

---

## 8 — Integration tests fail with FK constraint errors

**When you see:**
```
PrismaClientKnownRequestError: Foreign key constraint failed on field: `author_id`
```
Tests pass alone but fail when run together or in parallel.

**Diagnose:**
1. Find the `afterEach`/`afterAll` cleanup in the failing spec.
2. Check the deletion order — are child rows deleted before parent rows?
3. Check whether tests share database state (no per-test isolation).

**Fix:**
Delete in reverse FK order (children before parents):
```ts
afterEach(async () => {
  // Children first
  await prisma.contentVersion.deleteMany();
  await prisma.content.deleteMany();
  await prisma.auditEvent.deleteMany();
  // Parents last
  await prisma.user.deleteMany();
});
```

**Prevent:**
Define a single `cleanDatabase()` helper with the correct deletion order and reuse it across all integration specs. For new tables, always add them to `cleanDatabase()` in FK-safe order when writing the first test.

---

## 9 — Testcontainers spec times out before first test

**When you see:**
```
Error: Hook timed out after 5000ms
  at beforeAll (test/integration/.../spec.ts)
```
Happens on the first run when Docker must pull the Postgres image.

**Diagnose:**
1. Is this the first run on a fresh machine/CI runner? Docker may need to pull `postgres:15`.
2. Check `hookTimeout` in the spec or `vitest.config.ts` — is it still the default 5000 ms?

**Fix:**
Set a high `hookTimeout` in the spec's config:
```ts
// vitest.config.ts or at the top of the spec
export default {
  test: {
    hookTimeout: 60_000, // 60s — enough for Docker pull + Postgres startup
    testTimeout: 30_000,
  }
}
```

**Prevent:**
All integration specs that use Testcontainers must declare `hookTimeout: 60_000`. Add this to the project's `vitest.config.ts` as the default for the `test/integration/` glob.

---

## 10 — Users integration test times out (Neon cold start)

**When you see:**
```
Error: connect ETIMEDOUT (or similar)
  at NeonAdapter.connect (...)
```
Only happens on the first test run of the day or after a period of inactivity.

**Diagnose:**
1. Is the test using `TEST_DATABASE_URL` pointing at a Neon cloud branch?
2. Is this the first connection of the day (Neon free tier suspends after 5 min idle)?

**Fix:**
Migrate the affected integration test from Neon to a local Testcontainers Postgres instance:
```ts
// Before
const prisma = new PrismaClient({ datasourceUrl: process.env.TEST_DATABASE_URL });

// After (Testcontainers)
const container = await new PostgreSqlContainer().start();
const prisma = new PrismaClient({ datasourceUrl: container.getConnectionUri() });
```

**Prevent:**
Do not use the shared Neon branch for integration tests. Neon should only be used as the production database. CI and local integration tests must use Testcontainers so they are isolated and free of cold-start latency.

---

## Quick reference — check commands

```bash
# Architecture check
pnpm --filter @cms/api depcruise

# Full test suite
pnpm --filter @cms/api test
pnpm --filter @cms/web exec vitest run

# Typecheck both
pnpm run typecheck

# Lint both
pnpm run lint
```
