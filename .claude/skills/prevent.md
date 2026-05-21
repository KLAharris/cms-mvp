# /prevent — Run all prevention checks and report violations by category

Run these checks in order. Report each category as ✅ clean or ❌ with specific violations.

## Check 1 — Architecture boundaries (depcruise)

```bash
pnpm --filter @cms/api depcruise 2>&1
```

**Pass:** "no dependency violations found"
**Fail:** Any `error` line — report each violation. Each one is category §7 (Prisma leak) or §5 (barrel violation). Apply fix from `docs/runbook.md`.

Known violation patterns:
- `→ node_modules/.prisma/client` from `application/` or `domain/` → move Prisma types to adapter layer
- `→ .../notification/application/notification.service` (not via barrel) → import from `../notification` barrel instead

## Check 2 — TypeScript strict mode

```bash
pnpm run typecheck 2>&1
```

**Pass:** No output (exit 0)
**Fail:** Report each error with file + line. Fix before continuing.

## Check 3 — Lint (both workspaces)

```bash
pnpm run lint 2>&1
```

**Pass:** No output (exit 0)
**Fail:** Report each warning/error. `--max-warnings=0` means any warning is a failure.

## Check 4 — Barrel import compliance

Check that cross-module imports use public barrels (only in the API):

```bash
grep -rn "from '\.\..*\/application\/" apps/api/src --include="*.ts" | \
  grep -v "\/application\/" | head -20
```

This finds imports that cross into another module's `application/` folder directly. Any result is a §5 violation.

Also check for direct Prisma imports in wrong layers:

```bash
grep -rn "@prisma/client\|\.prisma/client" \
  apps/api/src/modules/*/application \
  apps/api/src/modules/*/domain \
  --include="*.ts" 2>/dev/null | grep -v ".spec."
```

**Pass:** No output
**Fail:** Each line is a §7 violation — move the import to the adapter layer.

## Check 5 — Test timeout configuration

Check that integration specs using Testcontainers have a high hookTimeout:

```bash
grep -rn "PostgreSqlContainer\|GenericContainer" \
  apps/api/test --include="*.ts" -l 2>/dev/null
```

For each file found, verify it has `hookTimeout: 60_000` or `testTimeout` set. Report any file missing it as a §9 risk.

## Check 6 — Console.log in production code

```bash
grep -rn "console\.log" \
  apps/api/src apps/web/src \
  --include="*.ts" --include="*.tsx" 2>/dev/null | \
  grep -v "\.spec\.\|\.test\."
```

**Pass:** No output
**Fail:** Remove each `console.log` from production code. Use the structured logger (`this.logger.log(...)`) in the API, remove entirely in the web.

## Check 7 — Auth guard coverage on HTTP routes

```bash
grep -rn "@Post\|@Get\|@Patch\|@Delete\|@Put" \
  apps/api/src/modules/media/adapters/in/http \
  apps/api/src/modules/content/adapters/in/http \
  --include="*.ts" -A 3 | grep -B 2 "async " | grep -v "UseGuards\|ApiKey"
```

This is a rough check — review the output manually. Any route handler that appears without `@UseGuards` nearby is a potential §6 risk.

## Summary output format

After running all checks, report:

```
## Prevention check results

| Check | Status | Issues |
|-------|--------|--------|
| Architecture (depcruise) | ✅ / ❌ | N violations |
| TypeScript | ✅ / ❌ | N errors |
| Lint | ✅ / ❌ | N warnings |
| Barrel imports | ✅ / ❌ | N violations |
| Test timeouts | ✅ / ❌ | N specs missing hookTimeout |
| Console.log | ✅ / ❌ | N occurrences |
| Auth guard coverage | ✅ / ❌ | Review required / Clean |
```

If any check is ❌, fix it before pushing. Use `/diagnose` with the specific error output if you need help matching a violation to its fix.
