# <NNN: short imperative title>

## Context to Load

The agent should read, in order, before starting:

- `.claude/templates/CONTEXT.md`
- `docs/tasks/<this-slice-plan>.md`
- `docs/02-Software-Requirements-Specification.md` § <relevant section>
- `docs/04-ARCH.md` § <relevant section>

---

## Task

<One paragraph. What does the agent need to accomplish? Name the module and bounded context. Name the files it is expected to create or touch. Be explicit about what counts as "done" at the business level — the mechanical DoD is in the next section.>

---

## Definition of Done

Objective, automatable checks only. No "looks reasonable" items.

- [ ] <Check 1 — concrete and binary, e.g. "GET /api/admin/audit returns 200 with paginated results">
- [ ] <Check 2>
- [ ] <Check 3>
- [ ] All new code follows hexagonal boundaries (no Prisma in domain, no NestJS in application)
- [ ] Unit tests for all use cases using in-memory fakes
- [ ] Integration tests for all HTTP endpoints using Supertest
- [ ] No pre-existing tests broken
- [ ] `pnpm --filter api tsc --noEmit` exits 0
- [ ] `pnpm --filter api lint` exits 0

---

## Command Checks

Every command must exit 0 at the end of the task:

```bash
pnpm --filter api vitest run src/modules/<module>
pnpm --filter api tsc --noEmit
pnpm --filter api lint
```

---

## Locked Design Decisions

_(Filled in after grill-me session)_

- Q1 — <question>: <decision>
- Q2 — <question>: <decision>

---

## Out of Scope

- <anything explicitly not part of this task>