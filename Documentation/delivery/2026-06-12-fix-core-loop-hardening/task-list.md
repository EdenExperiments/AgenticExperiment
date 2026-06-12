# Task list — Core-Loop Hardening

Ordered for TDD dispatch. Tasks with the same **Parallel group** may run concurrently if Lanes B/C
do not touch the listed target paths.

| ID | Summary | Stack | Target paths | Depends | Parallel group | Verification command |
|----|---------|-------|--------------|---------|----------------|----------------------|
| 01 | `EffectiveLevel` pure-function regression (R-004) | Go | `apps/api/internal/skills/effective_level_test.go` | — | `go-skills` | `cd apps/api && go test ./internal/skills/... -run EffectiveLevel` |
| 02 | Handler `starting_level` HTTP 422 (D-018) + effective_level edge cases | Go | `apps/api/internal/handlers/skill_test.go` | — | `go-handlers` | `cd apps/api && go test ./internal/handlers/... -run 'Skill.*(StartingLevel\|EffectiveLevel)'` |
| 03 | D-033 gate auto-clear at high `starting_level` | Go | `apps/api/internal/skills/skill_repository_test.go` | — | `go-integration` | `cd apps/api && go test -tags integration ./internal/skills/... -run AutoClear` |
| 04 | R-003 atomic XP write regression (`xp_events` + level/tier) | Go | `apps/api/internal/skills/xp_test.go` | — | `go-integration` | `cd apps/api && go test -tags integration ./internal/skills/... -run LogXP` |
| 05 | `QuickLogPanel` 3-tap time-primary flow (D-019/D-034) | TS | `packages/ui/src/QuickLogPanel.test.tsx` | — | `ui-quicklog` | `pnpm --filter @rpgtracker/ui test QuickLogPanel` |
| 06 | `tierConstants` D-020 contract tests | TS | `packages/ui/src/__tests__/tierConstants.test.ts` | — | `ui-tiers` | `pnpm --filter @rpgtracker/ui test tierConstants` |
| 07 | Skill detail gate-over-XP-bar (D-021) | TS | `apps/rpg-tracker/app/__tests__/skill-detail.test.tsx` | — | `rpg-detail` | `pnpm --filter rpg-tracker test skill-detail` |
| 08 | Tier transition modal on quick log (D-022) | TS | `apps/rpg-tracker/app/__tests__/dashboard.test.tsx` | 05 | `rpg-dashboard` | `pnpm --filter rpg-tracker test dashboard` |

## Routing

| Task | test-writer | implementer |
|------|-------------|---------------|
| 01–04 | `test-writer-go` | `implementer-go` |
| 05–08 | `test-writer-ts` | `implementer-ts` |

## Parallelism with Lanes B/C

Safe to run in parallel with other lanes **when those lanes avoid the target paths above**.

| Parallel group | File independence | Typical Lane B/C conflict |
|----------------|-------------------|---------------------------|
| `go-skills` | New test file only | Lane touching `skill_repository.go` logic |
| `go-handlers` | `skill_test.go` only | Lane adding skill handler endpoints |
| `go-integration` | Integration test files only | Lane changing `CreateSkill` / `LogXP` |
| `ui-quicklog` | New `QuickLogPanel.test.tsx` | Lane editing `QuickLogPanel.tsx` |
| `ui-tiers` | New `tierConstants.test.ts` | Lane editing `tierConstants.ts` |
| `rpg-detail` | `skill-detail.test.tsx` | Lane editing skill detail page |
| `rpg-dashboard` | `dashboard.test.tsx` | Lane editing dashboard quick log |

**Cross-stack:** All Go tasks (01–04) are independent of all TS tasks (05–08) — full parallel OK.

**Serial within lane:** Task 08 depends on 05 only for shared `QuickLogPanel` behaviour understanding;
files do not overlap, so 05 and 08 may still run in parallel if test-writer agents coordinate mocks.
