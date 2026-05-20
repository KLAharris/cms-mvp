---
name: grill-me
description: Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use when the user wants to stress-test a slice plan, get grilled on their design, or mentions "grill me".
---

Interview me relentlessly about every aspect of this plan until we reach a shared understanding.
Walk down each branch of the design tree, resolving dependencies between decisions one by one.

If a question can be answered by exploring the codebase, explore the codebase instead.

For each question, provide your recommended answer based on the existing patterns in the codebase:
- Hexagonal architecture (ports and adapters) — domain, application, adapters/in, adapters/out
- NestJS + TypeScript strict
- Prisma + PostgreSQL (Neon)
- Redis + BullMQ for queues and scheduling
- Zod for validation
- Vitest for testing
- Conventional commit format
- One PR per phase, squash merge to main

When all branches are resolved, output a concise summary of every decision made so it can be used as context for generating a Codex prompt.