# Architecture Review -- Skill Interaction Polish + Animations

## Schema Impact

None. No new tables or columns needed.

## Service Boundaries

Minor extension: `GET /api/v1/activity` gains an optional `skill_id` query parameter to filter activity to a single skill. This is a backward-compatible addition to the existing handler from Feature 1.

## ADR

None required. The `useMotionPreference` hook reads a CSS custom property at runtime, which is the standard approach for theme-gated behavior. No architectural decisions needed.

## Shared Package Changes

- `packages/ui/src/useMotionPreference.ts` -- new hook
- `packages/ui/src/useMotionPreference.test.ts` -- tests for hook
- `packages/ui/src/SkillCard.tsx` -- add hover/press micro-interaction CSS classes (data-attribute gated)
- `packages/ui/src/index.ts` -- export new hook

Note: `XPGainAnimation` uses Framer Motion which is only in `apps/rpg-tracker`, so it lives there (not in `packages/ui/src/`).

## Parallelisation Map

Tasks that MUST be sequenced:
1. **T1 (tester)** writes failing tests BEFORE T2/T3 -- TDD gate
2. **useMotionPreference hook** (shared package) must be ready before SkillCard micro-interactions and XPGainAnimation
3. **Backend skill_id filter** (T2a) must be ready before skill detail page history can work

Tasks that CAN run in parallel:
- T2a (backend -- skill_id filter) can run parallel with T3a (useMotionPreference hook)
- T3b (XPGainAnimation), T3c (sorting/filtering), T3d (richer detail), T3e (empty states), T3f (SkillCard micro) can run parallel after T3a completes
- T3b-T3f are all independent of each other

Recommended task order:
```
T1: tester -- write all failing tests
T2a: backend -- add skill_id filter to activity endpoint (parallel with T3a)
T3a: frontend -- useMotionPreference hook in packages/ui (parallel with T2a)
T3b: frontend -- XPGainAnimation component (after T3a)
T3c: frontend -- skills list sorting/filtering (after T1, independent)
T3d: frontend -- richer skill detail page (after T2a, T3a)
T3e: frontend -- better empty states (after T1, independent)
T3f: frontend -- SkillCard micro-interactions (after T3a)
T4: reviewer -- code gate review
```

## Approval

APPROVED
