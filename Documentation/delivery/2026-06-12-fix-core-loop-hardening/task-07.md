# Task 07 — Skill detail gate-over-XP-bar (D-021)

## Scope

`skill-detail.test.tsx` covers name, tier, log button, and activity feed but does **not** assert
D-021: when an active gate exists, `BlockerGateSection` replaces `XPProgressBar` above the fold.

## Acceptance criteria

- [ ] Test: mock skill with `current_level=10`, gate at level 9 uncleared and `first_notified_at` set
  → `BlockerGateSection` content visible (gate title / "gate locked").
- [ ] Same mock → `XPProgressBar` progress element **not** in document (no `role="progressbar"` from
  XP bar, or query by gate-section vs xp progress card).
- [ ] Test: mock skill with no active gate (`gates: []` or all cleared) → `XPProgressBar` visible,
  no gate-locked copy.
- [ ] Uses existing mocks pattern in `skill-detail.test.tsx`; no E2E browser test.

## Target paths

- `apps/rpg-tracker/app/__tests__/skill-detail.test.tsx`
- `apps/rpg-tracker/app/(app)/skills/[id]/page.tsx` (implement only if regression)

## Verification command

```bash
pnpm --filter rpg-tracker test skill-detail
```

## Out of scope

- Gate submission flow (F-009b)
- `BlockerGateSection` unit tests (already covered in `packages/ui`)
- XP chart section below the fold

## TDD routing

1. `test-writer-ts`
2. `implementer-ts`
3. `verifier`
