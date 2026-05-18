# .claude/templates — Agent Workflow Templates

## How This Works

```
grill-me session (stress-test the design)
        ↓
docs/tasks/<slice>-plan.md  (locked decisions + goal)
        ↓
EVAL_TASK.md filled from template  (task + DoD + command checks)
        ↓
Claude Code agent executes
        ↓
command checks verify DoD → developer reviews → manual commit
```

---

## Files

| File          | Purpose                                      | Updated         |
| ------------- | -------------------------------------------- | --------------- |
| `CONTEXT.md`  | Permanent project context — stack, arch rules, module status, gotchas | When stack/decisions change |
| `EVAL_TASK.md`| Blank template — copy per slice/phase        | Never (it's a template) |

---

## Per-Slice Workflow

1. Run a grill-me session: *"grill me on [slice name]"*
2. Copy `EVAL_TASK.md` → `docs/tasks/slice-0N-<name>.md`
3. Fill in: title, task paragraph, DoD checks, locked decisions
4. In Claude Code: *"read .claude/templates/CONTEXT.md and docs/tasks/slice-0N-<name>.md, then execute the task"*
5. Agent runs; you review output before committing
6. Run command checks manually to verify
7. Commit in conventional format, open PR, squash merge

---

## Skills

- `docs/prompts/grill-me.md` — runs a relentless design interview before each slice