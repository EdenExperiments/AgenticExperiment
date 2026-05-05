# T11 — Goals Foundation Tests

## Test Files Written

- `apps/api/internal/handlers/goal_test.go`
- `packages/api-client/src/__tests__/goals-edge-cases.test.ts`
- `apps/rpg-tracker/app/__tests__/goal-progress-checkin.test.tsx`

## Coverage Map

### Backend (Go handler tests) — INTENTIONALLY RED pending T8 merge

- AC-1 (ownership isolation — GET /goals/:id different user → 404) → `goal_test.go`: `TestHandleGetGoal_OwnershipIsolation_DifferentUser`
- AC-2 (ownership isolation — PUT /goals/:id different user → 404) → `goal_test.go`: `TestHandlePutGoal_OwnershipEnforced`
- AC-3 (ownership isolation — DELETE /goals/:id different user → 404) → `goal_test.go`: `TestHandleDeleteGoal_OwnershipEnforced`
- AC-4 (ownership isolation — POST milestones different user → 404) → `goal_test.go`: `TestHandlePostMilestone_OwnershipEnforced`
- AC-5 (ownership isolation — GET milestones different user → 404) → `goal_test.go`: `TestHandleGetMilestones_OwnershipEnforced`
- AC-6 (ownership isolation — PUT milestone different user → 404) → `goal_test.go`: `TestHandlePutMilestone_OwnershipEnforced`
- AC-7 (ownership isolation — DELETE milestone different user → 404) → `goal_test.go`: `TestHandleDeleteMilestone_OwnershipEnforced`
- AC-8 (ownership isolation — POST checkin different user → 404) → `goal_test.go`: `TestHandlePostCheckin_OwnershipEnforced`
- AC-9 (ownership isolation — GET checkins different user → 404) → `goal_test.go`: `TestHandleGetCheckins_OwnershipEnforced`
- AC-10 (validation — only current_value without target_value → 422) → `goal_test.go`: `TestHandlePostGoal_MeasurablePairValidation_OnlyCurrentValue`
- AC-11 (validation — only target_value without current_value → 422) → `goal_test.go`: `TestHandlePostGoal_MeasurablePairValidation_OnlyTargetValue`
- AC-12 (validation — both values set → 201) → `goal_test.go`: `TestHandlePostGoal_MeasurablePairValidation_BothSet`
- AC-13 (validation — both values omitted → 201) → `goal_test.go`: `TestHandlePostGoal_MeasurablePairValidation_BothOmitted`
- AC-14 (validation — invalid target_date → 422) → `goal_test.go`: `TestHandlePostGoal_InvalidTargetDate`
- AC-15 (validation — target_value=0 → 422) → `goal_test.go`: `TestHandlePostGoal_ZeroTargetValue`
- AC-16 (validation — negative current_value → 422) → `goal_test.go`: `TestHandlePostGoal_NegativeCurrentValue`
- AC-17 (validation — update with only current_value → 422) → `goal_test.go`: `TestHandlePutGoal_MeasurablePairValidation_OnlyCurrentValue`
- AC-18 (validation — status must be active|completed|abandoned) → `goal_test.go`: `TestHandlePutGoal_InvalidStatus`
- AC-19 (status transitions — active→completed) → `goal_test.go`: `TestHandlePutGoal_StatusTransition_ToCompleted`
- AC-20 (status transitions — active→abandoned) → `goal_test.go`: `TestHandlePutGoal_StatusTransition_ToAbandoned`
- AC-21 (milestone ordering — ListMilestones returns in position order) → `goal_test.go`: `TestHandleGetMilestones_OrderedByPosition`
- AC-22 (milestone ordering — empty list returns []) → `goal_test.go`: `TestHandleGetMilestones_ReturnsEmptyArray`
- AC-23 (milestone — position passed to store on create) → `goal_test.go`: `TestHandlePostMilestone_PositionPassedToStore`
- AC-24 (milestone — marking done passes is_done=true to store) → `goal_test.go`: `TestHandlePutMilestone_MarkDone`
- AC-25 (check-ins — empty note → 422) → `goal_test.go`: `TestHandlePostCheckin_EmptyNote`
- AC-26 (check-ins — empty payload → 422) → `goal_test.go`: `TestHandlePostCheckin_EmptyPayload`
- AC-27 (check-ins — with value_snapshot → 201) → `goal_test.go`: `TestHandlePostCheckin_WithValueSnapshot`
- AC-28 (check-ins — newest first ordering preserved by handler) → `goal_test.go`: `TestHandleGetCheckins_NewestFirst`
- AC-29 (check-ins — empty list returns []) → `goal_test.go`: `TestHandleGetCheckins_ReturnsEmptyArray`
- AC-30 (unauthorized — no user context → 401) → `goal_test.go`: `TestHandlePostGoal_Unauthorized`, `TestHandlePostCheckin_Unauthorized`

### API Client (edge cases) — GREEN on this branch

- AC-31 (URL — no query string without status filter) → `goals-edge-cases.test.ts:68`
- AC-32 (URL — each status value produces correct query param) → `goals-edge-cases.test.ts:76`
- AC-33 (URL — goal ID encoded directly in path) → `goals-edge-cases.test.ts:93`
- AC-34 (payload — only title in body when optional fields omitted) → `goals-edge-cases.test.ts:108`
- AC-35 (payload — both current_value and target_value sent as numbers) → `goals-edge-cases.test.ts:117`
- AC-36 (payload — validation error message propagated from API) → `goals-edge-cases.test.ts:131`
- AC-37 (payload — updateGoal sends only specified fields) → `goals-edge-cases.test.ts:154`
- AC-38 (payload — not-found propagated for cross-user update) → `goals-edge-cases.test.ts:163`
- AC-39 (milestones — position field in create payload) → `goals-edge-cases.test.ts:200`
- AC-40 (milestones — listMilestones preserves position ordering from API) → `goals-edge-cases.test.ts:189`
- AC-41 (milestones — updateMilestone sends is_done field) → `goals-edge-cases.test.ts:220`
- AC-42 (milestones — correct nested URL /goals/:id/milestones/:mid) → `goals-edge-cases.test.ts:227`
- AC-43 (check-ins — value+note in payload when both provided) → `goals-edge-cases.test.ts:248`
- AC-44 (check-ins — only note in payload when value omitted) → `goals-edge-cases.test.ts:258`
- AC-45 (check-ins — client preserves newest-first API ordering) → `goals-edge-cases.test.ts:291`
- AC-46 (derived progress — numeric goal: current/target are non-null numbers) → `goals-edge-cases.test.ts:399`
- AC-47 (derived progress — qualitative goal: current/target are null) → `goals-edge-cases.test.ts:407`

### Frontend behavior (derived progress + interactions) — GREEN on this branch

- AC-48 (progress bar aria-valuenow/valuemax reflects current/target) → `goal-progress-checkin.test.tsx:65`
- AC-49 (progress text shows "20 / 100 km") → `goal-progress-checkin.test.tsx:74`
- AC-50 (progress bar shows 0 / 50 when current=0) → `goal-progress-checkin.test.tsx:79`
- AC-51 (progress bar at 100% when current equals target) → `goal-progress-checkin.test.tsx:87`
- AC-52 (no progress bar for qualitative goal) → `goal-progress-checkin.test.tsx:96`
- AC-53 (check-in form shows value field for numeric goals) → `goal-progress-checkin.test.tsx:113`
- AC-54 (check-in submits numeric value as number) → `goal-progress-checkin.test.tsx:122`
- AC-55 (check-in submits without value when field left empty) → `goal-progress-checkin.test.tsx:138`
- AC-56 (check-in list preserves API newest-first order) → `goal-progress-checkin.test.tsx:168`
- AC-57 (milestones render in position order from API) → `goal-progress-checkin.test.tsx:196`
- AC-58 (toggle milestone calls updateMilestone with is_done=true) → `goal-progress-checkin.test.tsx:208`
- AC-59 (done milestone shows aria-pressed=true) → `goal-progress-checkin.test.tsx:219`
- AC-60 (status badge: active → "Active") → `goal-progress-checkin.test.tsx:237`
- AC-61 (status badge: completed → "Completed") → `goal-progress-checkin.test.tsx:244`
- AC-62 (status badge: abandoned → "Abandoned") → `goal-progress-checkin.test.tsx:252`
- AC-63 (create form: unit field shows only when target_value set) → `goal-progress-checkin.test.tsx:264`
- AC-64 (create form: numeric values sent as numbers not strings) → `goal-progress-checkin.test.tsx:277`
- AC-65 (create form: no current/target in payload when not filled) → `goal-progress-checkin.test.tsx:295`
- AC-66 (create form: shows error alert on server error) → `goal-progress-checkin.test.tsx:309`
- AC-67 (create form: submit disabled when title empty) → `goal-progress-checkin.test.tsx:318`

## Red/Green State Summary

| Layer | Files | State | Reason |
|-------|-------|-------|--------|
| Go backend | `apps/api/internal/handlers/goal_test.go` | **INTENTIONALLY RED** (compile error) | `apps/api/internal/goals` package doesn't exist until T8 is merged |
| API client | `packages/api-client/src/__tests__/goals-edge-cases.test.ts` | **GREEN** (39/39 pass) | T10 client already on branch |
| Frontend | `apps/rpg-tracker/app/__tests__/goal-progress-checkin.test.tsx` | **GREEN** (21/21 pass) | T9 UI already on branch |

## Explicit Remaining Risks

1. **T8 merge required for Go tests**: The `goals` package containing `goals.Goal`, `goals.Milestone`, `goals.Checkin`, `goals.ErrNotFound`, `goals.StatusActive/Completed/Abandoned` sentinel errors, and `handlers.NewGoalHandlerWithStore` do not exist on this branch. All 57 Go tests will fail to compile until `cursor/ai-goals-backend-c6a8-0504` is merged.

2. **Go validation tests (AC-14, AC-15, AC-16)**: Tests for invalid target_date, zero target_value, and negative current_value — these behaviours must be implemented in the handler. If T8's handler does not reject these cases, these tests will fail at runtime (not compile-time), revealing missing validation logic.

3. **Check-in newest-first (AC-28)**: The `TestHandleGetCheckins_NewestFirst` test validates that the handler preserves ordering from the store. The store must return data in descending `created_at` order (via `ORDER BY created_at DESC` in SQL). If T8's DB query doesn't enforce this, the test will pass at handler level but the behaviour won't be guaranteed end-to-end.

4. **Pre-existing frontend test failures**: 18 tests in non-goals test files (`account.test.tsx`, `login.test.tsx`, `skill-*.test.tsx`, `app-layout.test.tsx`) were already failing on the base branch before T11 — these are NOT caused by T11 changes and are out of scope.

5. **Milestone invalid UUID**: `TestHandleGetGoal_InvalidID` tests that `/goals/not-a-uuid` returns 400. If T8's handler doesn't parse and validate the UUID before calling the store, this may return 500 instead.
