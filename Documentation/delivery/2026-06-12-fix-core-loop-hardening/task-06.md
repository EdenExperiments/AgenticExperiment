# Task 06 — tierConstants D-020 contract tests

## Scope

`tierConstants.ts` is the single source of truth for D-014/D-016/D-020 but has no dedicated unit
tests. Lock the contract without visual snapshot testing.

## Acceptance criteria

- [ ] New `packages/ui/src/__tests__/tierConstants.test.ts`.
- [ ] `TIERS` has 11 entries; levels 1–200 covered without gaps; Legend has `gateLevel: null`.
- [ ] `GATE_LEVELS` equals `[9, 19, 29, 39, 49, 59, 69, 79, 89, 99]`.
- [ ] `getTierForLevel(1)` → Novice; `getTierForLevel(10)` → Apprentice; `getTierForLevel(100)` → Legend.
- [ ] Each tier has a unique `colorVar` matching `--color-tier-*` pattern.
- [ ] `TIER_COLOR_CSS` contains all 11 `--color-tier-*` definitions.
- [ ] `tierColor(tier)` returns `var(--color-tier-...)`.

## Target paths

- `packages/ui/src/__tests__/tierConstants.test.ts` (create)
- `packages/ui/src/tierConstants.ts` (implement only if regression)

## Verification command

```bash
pnpm --filter @rpgtracker/ui test tierConstants
```

## Out of scope

- `TierBadge` inline hex tests (already exist)
- Theme injection / `TierColorVars` DOM rendering
- Changing tier colour values (regression lock only)

## TDD routing

1. `test-writer-ts`
2. `implementer-ts`
3. `verifier`
