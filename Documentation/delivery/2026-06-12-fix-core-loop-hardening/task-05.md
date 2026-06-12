# Task 05 — QuickLogPanel 3-tap time-primary flow (D-019, D-034)

## Scope

`QuickLogPanel` is used on the dashboard for the primary quick-log path but has **no test file**.
Add behaviour tests mirroring `QuickLogSheet.test.tsx` coverage for the collapsible panel variant.

## Acceptance criteria

- [ ] New `packages/ui/src/QuickLogPanel.test.tsx`.
- [ ] Collapsed state: single "Log XP — {skillName}" button visible (tap 1).
- [ ] Expanded state: four time chips (15/30/45/60 min); 30 min selected by default (tap 2).
- [ ] Submit calls `onSubmit` with `{ xpDelta, logNote, timeSpentMinutes }` where XP is derived
  from minutes × tier rate (tier 1: 30 min → 90 XP; tier 2: verify rate multiplier).
- [ ] Log button disabled when `isLoading=true`.
- [ ] Panel collapses after successful submit.
- [ ] Total interaction path is ≤3 taps: expand → chip (optional if default) → log.

## Target paths

- `packages/ui/src/QuickLogPanel.test.tsx` (create)
- `packages/ui/src/QuickLogPanel.tsx` (implement only if regression)

## Verification command

```bash
pnpm --filter @rpgtracker/ui test QuickLogPanel
```

## Out of scope

- `QuickLogSheet` (already tested; skill detail sheet)
- Dashboard page integration (task-08)
- Custom minutes input edge cases beyond one smoke case

## TDD routing

1. `test-writer-ts`
2. `implementer-ts`
3. `verifier`
