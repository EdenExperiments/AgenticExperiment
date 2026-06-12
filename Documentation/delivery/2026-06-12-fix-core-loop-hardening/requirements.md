# Lane D — LifeQuest Core-Loop Hardening

**Type:** `/fix` regression hardening (delivery-fix flow)  
**Status:** Signed for TDD dispatch  
**Date:** 2026-06-12  
**Zones:** `apps/api/` (Go), `apps/rpg-tracker/`, `packages/ui/`

## Purpose

Protect the shipped LifeQuest core loop (quick log → atomic XP write → level/gate display) while
other delivery lanes proceed. This lane adds or strengthens regression tests for binding constraints
from the feature tracker; fixes are minimal and only when a test exposes a real regression.

## Regression goals

| ID | Constraint | What to lock in |
|----|------------|-----------------|
| D-019 / D-034 | 3-tap quick log, time-primary | Expand → select time chip → submit; XP derived from minutes × tier rate |
| D-018 | `starting_level ≤ 99` server-side | HTTP 422 at handler; repository rejects 100+ (already partially covered) |
| D-020 | Tier colour system | `tierConstants` contract: 11 tiers, CSS vars, `getTierForLevel` boundaries |
| D-021 | Gate replaces XP bar | Skill detail shows `BlockerGateSection` when active gate; hides `XPProgressBar` |
| D-022 | Tier transition modal | Modal opens when `logXP` returns `tier_crossed: true` after quick log |
| R-003 | Atomic XP writes | `xp_events` row + `skills.current_xp` + `skills.current_level` in one transaction |
| R-004 | EffectiveLevel in Go | Pure-function table tests + handler returns capped `effective_level` |
| D-033 | High starting level auto-clear | `starting_level=28` → gates 9,19 cleared; gate 29 next |

## Non-goals

- **F-009b blocker completion flow** — evidence submission UI, AI assessment ceremony, unlock UX
  (deferred; gate handler tests for submit paths are out of scope for this lane).
- New product features, UX redesign, or scope expansion beyond the constraints above.
- Paywall, goals, NutriLog, MindTrack, or agent automation changes.
- Visual-only polish without a binding constraint (D-036: style-guide review, not faux-TDD).
- Rewriting production code when existing behaviour passes new tests.

## Acceptance (lane exit)

- Every task in `task-list.md` has a regression test merged; verifier pass on named commands.
- No weakening of existing tests to greenwash failures.
- `Documentation/feature-tracker.md` unchanged unless a task discovers a status regression
  (unlikely for hardening-only work).

## Verification baseline

| Stack | Command |
|-------|---------|
| Go API | `cd apps/api && go test ./...` |
| Go integration | `cd apps/api && go test -tags integration ./internal/skills/...` |
| UI package | `pnpm --filter @rpgtracker/ui test` |
| RPG Tracker | `pnpm --filter rpg-tracker test` |
