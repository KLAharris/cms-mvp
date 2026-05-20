---
layer: L3
owner: audit-bounded-context
applies_to: apps/api/src/modules/content/, apps/api/src/modules/media/
last_reviewed: 2026-05-18
---

# Slice 6 Phase 3 — Retrofit Content & Media with Audit Writes

## Goal

Add missing audit writes to `content` and `media` use cases. These modules had no audit instrumentation in Slices 3 and 4. Actor IP is passed as a plain string in a command/context object — use cases never touch HTTP types. All new and existing tests must pass.

## Sequencing

Requires Phase 1 and Phase 2 to be merged. `PrismaAuditRepository` and `FakeAuditRepository` must exist.

## Context to Load

- `.claude/templates/CONTEXT.md`
- `docs/tasks/slice-06-phase1-audit-module.md`
- `docs/02-Software-Requirements-Specification.md` § 5.7 (FR-AUDIT-02, FR-CONTENT-16)

---

## Locked Design Decisions (from grilling session 2026-05-18)

- **Q1** — Direct injection: `AuditPort` injected into each use case
- **Q3** — Actor IP: plain `string` inside command object — controller extracts from `req.ip`, use case never sees HTTP types
- **Q5** — content and media had no audit writes — full retrofit required

---

## Definition of Done

### Content Module (`src/modules/content/`)

- [ ] `AuditPort` injected into all content use cases that mutate state
- [ ] Audit events written for: CONTENT_CREATED, CONTENT_UPDATED, CONTENT_STATUS_CHANGED, CONTENT_DELETED
- [ ] Actor IP passed as plain string from controller into command object
- [ ] Unit tests updated to inject `FakeAuditRepository`
- [ ] All existing content tests pass

### Media Module (`src/modules/media/`)

- [ ] `AuditPort` injected into all media use cases that mutate state
- [ ] Audit events written for: MEDIA_UPLOADED, MEDIA_DELETED
- [ ] Actor IP passed as plain string from controller into command object
- [ ] Unit tests updated to inject `FakeAuditRepository`
- [ ] All existing media tests pass

### Quality

- [ ] `pnpm --filter @cms/api tsc --noEmit` exits 0
- [ ] `pnpm --filter @cms/api lint` exits 0
- [ ] `pnpm --filter @cms/api exec vitest run src/modules/content` exits 0
- [ ] `pnpm --filter @cms/api exec vitest run src/modules/media` exits 0
- [ ] Full test suite: `pnpm --filter @cms/api test` — only pre-existing Redis NOAUTH failures allowed

---

## Acceptance Commands

```bash
# Content tests
pnpm --filter @cms/api exec vitest run src/modules/content

# Media tests
pnpm --filter @cms/api exec vitest run src/modules/media

# Full suite
pnpm --filter @cms/api test

# Manual smoke — create content and check audit log
curl -fsS -X POST http://localhost:3000/api/admin/content \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"type":"article","title":"Test Article"}' | jq .

curl -fsS -H "Authorization: Bearer $JWT" \
  "http://localhost:3000/api/admin/audit?action=CONTENT_CREATED" | jq .
# expect: at least one audit event with targetType content
```

---

## Rollback

Revert the branch. Phase 1 and Phase 2 remain unaffected. No schema changes in this phase.

---

## Out of Scope

- Audit log UI in admin SPA (Slice 9)
- API key create/revoke audit events (follow-up)
- Audit writes for scheduled publish worker (follow-up)

---

## Notes

- Do not pass `req` or any NestJS/HTTP object into use cases — only plain strings and primitives
- `FakeAuditRepository` from Phase 1 (`tests/doubles/fake-audit.repository.ts`) is the correct fake to use in unit tests
- After this phase, all 6 audit actions from FR-AUDIT-02 must be covered