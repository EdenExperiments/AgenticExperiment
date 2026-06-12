# Task 03 — D-033 gate auto-clear at high starting_level

## Scope

Integration regression test for gate auto-clear when a skill is created above tier boundaries.

## Acceptance criteria

- [ ] New test `TestCreateSkill_AutoClearsGatesAtOrBelowStartingLevel` in `skill_repository_test.go`.
- [ ] Create skill with `starting_level=28`.
- [ ] Assert gates at levels 9 and 19 have `is_cleared=true`.
- [ ] Assert gate at level 29 has `is_cleared=false` (next challenge).
- [ ] Assert `effective_level` via `skills.EffectiveLevel(skill.CurrentLevel, gates)` equals 28
  (D-033 revised: display matches starting level when gates below are cleared).
- [ ] Optional: assert a `gate_submissions` row exists for auto-cleared gates with
  `verdict='self_reported'` (strengthen if straightforward).

## Target paths

- `apps/api/internal/skills/skill_repository_test.go`
- `apps/api/internal/skills/skill_repository.go` (implement only if regression)

## Verification command

```bash
cd apps/api && go test -tags integration ./internal/skills/... -run AutoClear -count=1
```

## Prerequisites

- `DATABASE_URL` pointing at local Supabase; seed user `00000000-0000-0000-0000-000000000001`.

## Out of scope

- Handler HTTP create-skill path (covered in task-02)
- F-009b manual gate submission UI

## TDD routing

1. `test-writer-go` (integration)
2. `implementer-go`
3. `verifier`
