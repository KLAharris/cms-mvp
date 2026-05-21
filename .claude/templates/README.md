# .claude/templates — Agent Workflow Templates

## How This Works

```
grill-me session (stress-test the design)
        ↓
docs/tasks/<slice>-plan.md  (locked decisions + goal)
        ↓
EVAL_TASK.md filled from template  (task + DoD + command checks)
        ↓
Claude Code agent reads PROGRESS.md + CONTEXT.md, then executes
        ↓
command checks verify DoD → developer reviews → manual commit
        ↓
PROGRESS.md updated (ticket moved to Recently Done)
```

---

## Files

| File          | Purpose                                                                 | Updated                        |
| ------------- | ----------------------------------------------------------------------- | ------------------------------ |
| `CONTEXT.md`  | Permanent project context — stack, arch rules, module status, gotchas   | When stack or decisions change |
| `EVAL_TASK.md`| Blank template — copy per slice/phase, never edit the template itself   | Never (it's a template)        |
| `README.md`   | This file — explains the workflow and template files                    | When workflow changes          |

---

## Key Project Files (outside this folder)

| File                    | Purpose                                                        |
| ----------------------- | -------------------------------------------------------------- |
| `CLAUDE.md`             | Auto-loaded by Claude Code — session rules, checkbox rule, DoD |
| `PROGRESS.md`           | Session state — in progress, blocked, recently done            |
| `docs/tasks/*.md`       | Slice task files with DoD checklists                           |
| `docs/tickets/*.json`   | Structured JSON tickets (CMS-001 → CMS-020)                    |
| `docs/coverage/*.covered` | Per-module coverage markers                                  |
| `docs/rootcause/*.json` | Bug rootcause cache (one file per bug, written before the fix) |
| `docs/prompts/grill-me.md` | Design interview skill — run before each new slice          |

---

## Per-Slice Workflow

1. Run a grill-me session: *"grill me on [slice name]"*
2. Copy `EVAL_TASK.md` → `docs/tasks/slice-0N-<name>.md`
3. Fill in: title, task paragraph, DoD checks, locked decisions
4. Create a JSON ticket in `docs/tickets/CMS-NNN.json`
5. In Claude Code: *"read PROGRESS.md and .claude/templates/CONTEXT.md and docs/tasks/slice-0N-<name>.md, then execute the task"*
6. Agent runs, ticking DoD checkboxes as each item passes
7. Run command checks manually to verify
8. If a bug was hit during the session, write `docs/rootcause/<slug>.json` before closing
9. Commit in conventional format, open PR, squash merge
10. Update `PROGRESS.md` — move ticket to Recently Done
