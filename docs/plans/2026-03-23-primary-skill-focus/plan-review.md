# Plan Review — Primary Skill Focus + Quick Session (Phase 4)

**Reviewer:** reviewer agent (Phase 5.5 plan review)
**Date:** 2026-03-23
**Plan:** `docs/plans/2026-03-23-primary-skill-focus/plan.md`

---

## Plan Review Findings

### AC Coverage

All 6 Logic ACs and all 12 Visual ACs are covered by named tasks.

| AC | Covered By | Status |
|----|------------|--------|
| L1 | T1a (test), T2d (handler) | COVERED |
| L2 | T1a (test), T2c (toggle logic) | COVERED |
| L3 | T1a (test), T2c (ownership check) | COVERED |
| L4 | T1a (test), T2b (struct + SELECT extension) | COVERED |
| L5 | T1a (test), T2a (ON DELETE SET NULL migration) | COVERED |
| L6 | T1b (test), T3c (computeFocusSkill implementation) | COVERED |
| V1 | T3c (Focus card above stats row) | COVERED |
| V2 | T3b (PrimarySkillCard content) | COVERED |
| V3 | T3b (Start Session Link, min-h-[48px]) | COVERED |
| V4 | T3b (pin/unpin icon, 44×44px tap area) | COVERED |
| V5 | T3b ("Suggested" label + outlined icon) | COVERED |
| V6 | T3b (design tokens only) | COVERED |
| V7 | T3b (responsive layout) | COVERED |
| V8 | T3c (hide card when 0 skills) | COVERED |
| V9 | T3c (skeleton placeholder) | COVERED |
| V10 | T3c ("Log XP" retargeted to focus skill) | COVERED |
| V11 | T3b (aria-label reflecting state) | COVERED |
| V12 | T3b (disabled while mutation in-flight) | COVERED |

### Gateway Must-Appear Items

Both items from `gateway.md` are present in the plan:

1. **users.User struct / GetOrCreateUser extension** — T2b explicitly lists all three required changes: add `PrimarySkillID *uuid.UUID \`json:"primary_skill_id"\`` to the struct, extend the `GetOrCreateUser` SELECT, and update the Scan call. PRESENT.

2. **SkillDetail.current_streak optional-to-required type change + consumer updates** — T3a lists the type change and includes a grep step for consumers that guard against `undefined` with known locations named. PRESENT.

### Parallelisation Map

The plan's Execution Order matches the arch-review Parallelisation Map exactly:

- Phase 1 (T1a + T1b + T3a in parallel) — correct. All can start immediately against the agreed contract.
- Phase 2 (T2 after T1a) — correct. TDD-first: tests before implementation.
- Phase 3 (T3b after T3a) — correct. Card component needs types from T3a.
- Phase 4 (T3c after T3b and T1b) — correct. Dashboard needs card; algorithm implementation satisfies T1b tests.
- Phase 5 (T4 after T2 and T3c) — correct. All code complete before review gate.

### TDD-First Ordering

T1a and T1b are Phase 1. T2 (backend implementation) is Phase 2. T3c (algorithm implementation) is Phase 4 after T1b tests exist. TDD-first discipline is preserved.

### Work Type

Plan header correctly states "mixed (TDD gate for logic ACs, visual reviewer gate for UI ACs)". T4 references both gates. Correct.

---

### Issues Found

**MINOR-1: No explicit Done condition per task.**

Tasks describe what to do but do not state the observable signal for completion. Per the plan-review mandate, every task requires an explicit Done condition. Suggested additions:

- T1a Done: `go test ./internal/handlers/... -run TestPrimarySkill` reports N failing tests, 0 errors.
- T1b Done: `pnpm --filter @rpgtracker/ui test focusAlgorithm` reports N failing tests, 0 errors.
- T2 Done: `go test ./internal/handlers/... -run TestPrimarySkill` turns green; `go build ./...` passes.
- T3a Done: TypeScript compiles (`pnpm turbo run build --filter=@rpgtracker/api-client`) without errors referencing `current_streak`.
- T3b Done: Component renders in isolation; all T3b ACs (V2–V7, V11, V12) visible in component output.
- T3c Done: T1b algorithm tests pass; `pnpm turbo run build` passes with no type errors.
- T4 Done: `review.md` written with GO verdict.

**MINOR-2: T2e uses a hardcoded line number.**

T2e states "Add route after line 84." Line numbers are fragile — if any earlier route was added since the plan was written, this reference will be wrong. Replace with a structural location: "Add `r.Patch(\"/account/primary-skill\", userHandler.HandlePatchPrimarySkill)` in the `/api/v1` route group, adjacent to the existing `PATCH /account` route."

**MINOR-3: No `pnpm turbo run build` step in T3c or T4.**

Project conventions (documented in agent memory) require running `pnpm turbo run build` after any refactor to catch cascading type errors that Next.js hides on first compile. T3a makes a breaking type change (`current_streak` non-optional). T3c and T4 must both include an explicit build step. This is not currently mentioned in either task.

**MINOR-4: T1b's import dependency on T3c is implicit.**

T1b writes tests for `computeFocusSkill` imported from `packages/ui/src/computeFocusSkill.ts`, but that file is created in T3c (Phase 4). The tests will fail to compile (not just fail assertions) until T3c delivers the implementation. This is correct TDD-first behaviour, but the plan should note it explicitly so the tester agent does not interpret a compile error as a test setup failure. Suggested addition to T1b: "Note: the import target `packages/ui/src/computeFocusSkill.ts` does not exist yet. Tests will fail to compile until T3c. This is expected — write the tests against the agreed signature and leave them failing."

---

## Verdict

APPROVED — proceed to parallel-session.

The four MINOR issues above do not block execution. They are improvements to clarity and operational discipline. The plan correctly covers all ACs, includes both gateway must-appear items, respects the Parallelisation Map, and maintains TDD-first ordering.

The backend agent should treat MINOR-2 as a correction (use structural location, not line number). The tester agent should be aware of MINOR-4 (expected compile failure for T1b). MINOR-1 done conditions and MINOR-3 build steps should be applied during execution if not added to the plan before session start.
