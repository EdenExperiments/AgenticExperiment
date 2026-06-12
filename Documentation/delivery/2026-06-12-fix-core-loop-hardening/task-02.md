# Task 02 — Handler starting_level validation + effective_level edge cases (D-018, R-004)

## Scope

Strengthen handler-layer tests in `skill_test.go` for HTTP validation and effective level response
edge cases not covered by task-01's pure function tests.

## Acceptance criteria

- [ ] `TestHandlePostSkill_RejectsStartingLevelAbove99` — POST with `starting_level=100` → HTTP 422,
  body mentions starting level range.
- [ ] `TestHandlePostSkill_RejectsStartingLevelZero` — POST with `starting_level=0` → HTTP 422.
- [ ] `TestHandleGetSkillDetail_EffectiveLevel_AllGatesCleared` — `current_level=15`, all gates
  `is_cleared=true` → `effective_level` equals 15.
- [ ] `TestHandleGetSkillDetail_EffectiveLevel_BelowGate` — `current_level=5`, uncleared gate at 9
  → `effective_level` equals 5.
- [ ] Stub store only; no integration DB required.

## Target paths

- `apps/api/internal/handlers/skill_test.go`

## Verification command

```bash
cd apps/api && go test ./internal/handlers/... -run 'Skill.*(StartingLevel|EffectiveLevel)' -count=1
```

## Out of scope

- Repository `CreateSkill` integration (task-03)
- Skill creation UI
- Changing validation messages unless test failure requires it

## TDD routing

1. `test-writer-go`
2. `implementer-go` (handler validation only if red)
3. `verifier`
