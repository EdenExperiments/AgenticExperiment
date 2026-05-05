## Status: DONE

## Files Changed

- `packages/api-client/src/types.ts` — Added T12/T13 types: `PlanGoalRequest`, `PlanGoalResponse`, `GoalPlan`, `GoalPlanMilestone`, `GoalForecast`, `TrackState`, `DriftDirection`
- `packages/api-client/src/client.ts` — Added `planGoal()` and `getGoalForecast()` client methods
- `apps/rpg-tracker/app/(app)/goals/ai/new/page.tsx` — NEW: AI goal wizard (`/goals/ai/new`)
- `apps/rpg-tracker/app/(app)/goals/[id]/page.tsx` — Added `GoalForecastSection` component and weekly review panel (active goals only)
- `apps/rpg-tracker/app/(app)/goals/page.tsx` — Added "AI Plan" entry point button in header
- `apps/rpg-tracker/app/__tests__/ai-goal-wizard.test.tsx` — NEW: 20 behavior tests for AI wizard flow and degraded states
- `apps/rpg-tracker/app/__tests__/goal-forecast.test.tsx` — NEW: 13 behavior tests for forecast/weekly review section

## Notes

### Routes
- `/goals/ai/new` — AI Goal Coach wizard (2-step: Describe → Review plan)
- `/goals/[id]` — Enhanced with `GoalForecastSection` for active goals (weekly review panel)
- `/goals` — "AI Plan" button added to header alongside manual "New Goal"

### Wizard flow (T12)
- Step 1: Natural language goal statement + optional deadline/context
- Step 2: Preview plan (objective, milestones with inline editing, weekly cadence, risks, fallback)
- Milestones are editable inline and individually selectable before accepting
- Accept creates goal via `createGoal()` then `createMilestone()` for each enabled milestone in parallel
- Navigates to `goals/{id}` on success

### Degraded AI states
- `degraded_response: true` → DegradedBanner with "basic mode" alert in preview step
- 402 (no API key) → explains API key missing, links to Account settings, offers manual fallback
- 429 (rate limit) → rate limit reached message, no fallback link (retry message only)
- 502 (upstream unavailable) → AI service unavailable, link to manual creation
- 422 (empty statement) → inline validation message
- Generic error → "Failed to generate a plan" alert

### Forecast/Weekly Review (T13)
- Rendered only for active goals
- Shows: track state badge (On Track/At Risk/Behind/Complete/Unknown), drift label (X% ahead/behind), confidence %, days remaining, check-in count, milestone done ratio, expected vs actual progress bar
- Recommendations section renders when `recommend_checkin`, `recommend_review`, or `recommend_stretch` are true
- Error state: "Forecast unavailable — check back after logging more check-ins"
- Loading state: animated skeleton

### Theme compliance
- All styling uses CSS tokens (`var(--color-*)`, `var(--font-display)`)
- No hardcoded colors or pixel values

### Pre-existing test failures (not introduced by this track)
- `skill-detail`, `skills-list`, `skill-create`, `skill-detail-sessions`, `account`, `login`, `app-layout` tests were failing on the base branch before this work — confirmed by `git diff origin/cursor/goals-ui-foundation-c6a8-0504 --name-only` (none of those files touched)

## Test Results

- `ai-goal-wizard.test.tsx` — 20/20 passing
- `goal-forecast.test.tsx` — 13/13 passing
- `goals-list.test.tsx` — 14/14 passing (existing, no regression)
- `goal-create.test.tsx` — 9/9 passing (existing, no regression)
- `goal-detail.test.tsx` — 20/20 passing (existing, no regression)
- `goal-edit.test.tsx` — 9/9 passing (existing, no regression)
