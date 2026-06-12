# Task 04 — R-003 atomic XP write regression

## Scope

Extend integration tests for `LogXP` to assert the three-way atomic write contract beyond the
existing `current_xp` / `current_level` check.

## Acceptance criteria

- [ ] `TestLogXP_InsertsXPEventRow` — after `LogXP`, query `xp_events` for the skill; exactly one
  new row with matching `xp_delta` and `log_note`.
- [ ] `TestLogXP_TierCrossedOnBoundary` — log XP that crosses level 9→10; result has
  `tier_crossed=true`, `tier_number=2`, `tier_name` consistent with tier table.
- [ ] Existing tests (`TestLogXP_UpdatesSkillAtomically`, gate hit, reject negative/zero) remain green.
- [ ] No test deletion or weakening.

## Target paths

- `apps/api/internal/skills/xp_test.go`
- `apps/api/internal/skills/xp_repository.go` (implement only if regression)

## Verification command

```bash
cd apps/api && go test -tags integration ./internal/skills/... -run LogXP -count=1
```

## Out of scope

- Handler `HandlePostXP` stub tests (minimal coverage exists)
- Double-submission dedup (R-003 frontend guard — separate lane if needed)
- Transaction failure injection (nice-to-have; skip unless easy with test DB)

## TDD routing

1. `test-writer-go`
2. `implementer-go`
3. `verifier`
