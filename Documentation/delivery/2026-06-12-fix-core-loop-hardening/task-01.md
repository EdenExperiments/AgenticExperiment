# Task 01 — EffectiveLevel pure-function regression (R-004)

## Scope

Add table-driven unit tests for `skills.EffectiveLevel(currentLevel, gates)` in a new test file.
No handler or integration changes unless a test proves the function is wrong.

## Acceptance criteria

- [ ] New file `apps/api/internal/skills/effective_level_test.go` (package `skills`, **not** integration tag).
- [ ] Cases covered:
  - No gates → returns `currentLevel`
  - All gates cleared → returns `currentLevel`
  - Uncleared gate below `currentLevel` → returns lowest such `gate_level` (existing handler case: level 10, gate 9 → 9)
  - `currentLevel` below first uncleared gate → returns `currentLevel`
  - Multiple uncleared gates → returns lowest matching gate level
- [ ] Tests pass without `-tags integration`.

## Target paths

- `apps/api/internal/skills/effective_level_test.go` (create)
- `apps/api/internal/skills/skill_repository.go` (read only; implement only if regression found)

## Verification command

```bash
cd apps/api && go test ./internal/skills/... -run EffectiveLevel -count=1
```

## Out of scope

- Handler JSON shape changes
- Frontend effective level display
- F-009b gate completion

## TDD routing

1. `test-writer-go` — write failing tests
2. `implementer-go` — fix `EffectiveLevel` only if red
3. `verifier` — run verification command + `go test ./internal/skills/...`
