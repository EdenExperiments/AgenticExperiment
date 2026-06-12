# Task 08 — Tier transition modal on quick log (D-022)

## Scope

Dashboard wires `TierTransitionModal` when `logXP` returns `tier_crossed: true`, but
`dashboard.test.tsx` only checks the quick-log button exists — not the modal ceremony.

## Acceptance criteria

- [ ] Mock `logXP` to resolve with `{ tier_crossed: true, tier_name: 'Apprentice', tier_number: 2, ... }`.
- [ ] Expand `QuickLogPanel`, submit default 30 min log.
- [ ] Assert `TierTransitionModal` appears with "Apprentice" heading.
- [ ] Click Continue → modal dismisses.
- [ ] When `tier_crossed: false`, modal does not appear after log.
- [ ] Uses existing dashboard test harness (`mockListSkills`, `QueryClientProvider`, etc.).

## Target paths

- `apps/rpg-tracker/app/__tests__/dashboard.test.tsx`
- `apps/rpg-tracker/app/(app)/dashboard/page.tsx` (implement only if regression)

## Verification command

```bash
pnpm --filter rpg-tracker test dashboard
```

## Depends on

- Task 05 for `QuickLogPanel` interaction patterns (logical; files do not overlap).

## Out of scope

- Skill detail / skills list tier modal (same pattern; add only if time permits in same PR)
- Tier modal visual styling (D-036)
- API tier_crossed computation (task-04)

## TDD routing

1. `test-writer-ts`
2. `implementer-ts`
3. `verifier`
