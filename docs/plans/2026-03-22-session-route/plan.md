# Implementation Plan: Session Route

**Spec:** docs/specs/2026-03-22-session-route/spec.md
**Type:** mixed (logic + visual)
**Date:** 2026-03-22

---

## Task Overview

| Task | Owner | Depends On | ACs Covered |
|------|-------|------------|-------------|
| T1 | tester | -- | AC-L1, AC-L2, AC-L3, AC-L4, AC-L5, AC-L6, AC-L7 |
| T2 | backend | T1 | AC-L2 |
| T3a | frontend | T1 | AC-L1, AC-L3, AC-L4, AC-L5, AC-L7 |
| T3b | frontend | T3a | AC-L6, AC-V1, AC-V5, AC-V4 |
| T3c | frontend | T3b | AC-V2, AC-V3 |
| T3d | frontend | T3c | AC-V1 (route wiring) |
| T4-logic | reviewer (code gate) | T2, T3a | AC-L1 through AC-L7 |
| T4-visual | reviewer (visual review) | T3b, T3c, T3d | AC-V1 through AC-V5 |

T2 and T3a can run in parallel after T1.

---

## T1: Write failing tests from spec ACs (tester)

### T1.1: usePomodoro hook tests
**File:** `/home/meden/GolandProjects/RpgTracker/packages/ui/src/__tests__/usePomodoro.test.ts`
**ACs:** AC-L1, AC-L7
**Tests:**
- [ ] Initial state is `idle` with default config (work=1500s, break=300s, rounds=4)
- [ ] Calling `start()` transitions state from `idle` to `work`
- [ ] After work duration elapses, state transitions from `work` to `break`
- [ ] After break duration elapses, state transitions from `break` to `work`
- [ ] After last work interval (round N of N), state transitions to `complete` (no final break)
- [ ] `pause()` during work sets state to `paused`, `resume()` returns to `work`
- [ ] `pause()` during break sets state to `paused`, `resume()` returns to `break`
- [ ] `endEarly()` from any active state transitions to `end-early`
- [ ] `claim()` from `end-early` transitions to `complete`
- [ ] `abandon()` from `end-early` transitions to `abandoned`
- [ ] `currentRound` increments after each work+break cycle
- [ ] `elapsedWorkSeconds` accumulates only during work phases (not break)
- [ ] `remainingSeconds` counts down from phase duration
- [ ] Custom config (work=900s, break=600s, rounds=2) is respected
- [ ] Timer uses Date.now() delta internally (verify via time mocking -- advance Date.now, not fake timers)
- [ ] Maximum session duration: after 14400s (4h) of work time, `isOverCap` flag is true
- [ ] Session with 0 elapsed work time: `elapsedWorkSeconds` is 0

**Done when:** All tests exist and fail (hook not yet implemented).

### T1.2: useBrowserNotification hook tests
**File:** `/home/meden/GolandProjects/RpgTracker/packages/ui/src/__tests__/useBrowserNotification.test.ts`
**ACs:** AC-L4
**Tests:**
- [ ] `requestPermission()` calls `Notification.requestPermission()`
- [ ] `notify({ title, body })` creates a new Notification when permission is `granted`
- [ ] `notify()` does nothing when permission is `denied` (no throw)
- [ ] `notify()` does nothing when permission is `default` (no throw)
- [ ] `isSupported` is false when `window.Notification` is undefined
- [ ] `permission` reflects current Notification.permission value

**Done when:** All tests exist and fail.

### T1.3: useSessionNavigation hook tests
**File:** `/home/meden/GolandProjects/RpgTracker/packages/ui/src/__tests__/useSessionNavigation.test.ts`
**ACs:** AC-L5
**Tests:**
- [ ] Returns `/skills/{id}` when `?from=skill` or no `from` param
- [ ] Returns `/dashboard` when `?from=dashboard`
- [ ] Returns `/skills/{id}` when `from` param is missing (default)
- [ ] `skillId` is extracted from the route path

**Done when:** All tests exist and fail.

### T1.4: Session API handler tests (Go)
**File:** `/home/meden/GolandProjects/RpgTracker/apps/api/internal/handlers/session_test.go`
**ACs:** AC-L2
**Tests:**
- [ ] POST with Pomodoro fields stores them in training_sessions and returns them in response
- [ ] POST without Pomodoro fields uses defaults (backward compatible)
- [ ] GET sessions response includes Pomodoro fields
- [ ] Pomodoro fields accept valid values (work_sec=900, break_sec=600, intervals_completed=3, intervals_planned=4)
- [ ] Pomodoro intervals_completed cannot exceed intervals_planned (validation)

**Done when:** All tests exist and fail.

### T1.5: XP calculation test
**File:** `/home/meden/GolandProjects/RpgTracker/packages/ui/src/__tests__/sessionXP.test.ts`
**ACs:** AC-L3
**Tests:**
- [ ] Tier 1 (tierNum=1): 25 min work = 75 XP (25 * 3 * 1.0)
- [ ] Tier 1: 15 min work = 45 XP
- [ ] Tier 5 (tierNum=5): 25 min work = 195 XP (25 * 3 * 2.6)
- [ ] Break time excluded: 25 min work + 5 min break = 75 XP (not 90)
- [ ] Partial session: 12.5 min work = 37 XP (truncated, tier 1)

**Done when:** All tests exist and fail.

### T1.6: Session completion flow test
**File:** `/home/meden/GolandProjects/RpgTracker/packages/ui/src/__tests__/SessionPage.test.tsx`
**ACs:** AC-L6
**Tests:**
- [ ] On session complete, `createSession` is called with correct fields (session_type, status, xp_delta, planned/actual duration, pomodoro fields)
- [ ] Post-session summary displays XP earned, bonus, streak, duration, intervals
- [ ] "Log Session" button calls createSession and navigates to return URL
- [ ] "Dismiss" button navigates to return URL without logging

**Done when:** All tests exist and fail.

---

## T2: Backend -- migration + handler update (backend)

### T2.1: Write migration files
**Files:**
- `/home/meden/GolandProjects/RpgTracker/apps/api/db/migrations/000008_session_pomodoro.up.sql`
- `/home/meden/GolandProjects/RpgTracker/apps/api/db/migrations/000008_session_pomodoro.down.sql`
**ACs:** AC-L2
**Steps:**
- [ ] Create up migration: ALTER TABLE training_sessions ADD COLUMN for all 4 Pomodoro fields with NOT NULL defaults
- [ ] Create down migration: DROP COLUMN for all 4 fields
**Verify:** `cat` both files; SQL syntax is valid
**Done when:** Migration files exist with correct SQL.

### T2.2: Update Go types
**File:** `/home/meden/GolandProjects/RpgTracker/apps/api/internal/skills/training_types.go`
**ACs:** AC-L2
**Steps:**
- [ ] Add `PomodoroWorkSec`, `PomodoroBreakSec`, `PomodoroIntervalsCompleted`, `PomodoroIntervalsPlanned` to `TrainingSession` struct with JSON tags
- [ ] Add same 4 fields to `CreateSessionRequest` struct
**Verify:** `go build ./...` succeeds
**Done when:** Types compile with new fields.

### T2.3: Update session handler
**File:** `/home/meden/GolandProjects/RpgTracker/apps/api/internal/handlers/session.go`
**ACs:** AC-L2
**Steps:**
- [ ] `HandlePostSession`: parse 4 new form values (`pomodoro_work_sec`, `pomodoro_break_sec`, `pomodoro_intervals_completed`, `pomodoro_intervals_planned`)
- [ ] Pass new fields to `CreateSessionRequest`
- [ ] Add validation: `pomodoro_intervals_completed <= pomodoro_intervals_planned`
- [ ] `dbSessionStore.CreateSession`: include 4 new columns in INSERT and RETURNING
- [ ] `dbSessionStore.ListSessions`: include 4 new columns in SELECT and Scan
**Verify:** `go test ./internal/handlers/ -run TestSession` passes (T1.4 tests)
**Done when:** All T1.4 tests pass.

### T2.4: Update API client types
**File:** `/home/meden/GolandProjects/RpgTracker/packages/api-client/src/types.ts`
**ACs:** AC-L2
**Steps:**
- [ ] Add `pomodoro_work_sec`, `pomodoro_break_sec`, `pomodoro_intervals_completed`, `pomodoro_intervals_planned` to `TrainingSession` interface (all `number`)
**Verify:** `pnpm tsc --noEmit -p packages/api-client` succeeds
**Done when:** Types compile.

### T2.5: Update API client createSession
**File:** `/home/meden/GolandProjects/RpgTracker/packages/api-client/src/client.ts`
**ACs:** AC-L2
**Steps:**
- [ ] Add optional Pomodoro fields to `createSession` body type
- [ ] Encode new fields in form data when present
**Verify:** `pnpm tsc --noEmit -p packages/api-client` succeeds
**Done when:** Client compiles and sends new fields.

---

## T3a: Frontend hooks (frontend) -- can run in parallel with T2

### T3a.1: Implement usePomodoro hook
**File:** `/home/meden/GolandProjects/RpgTracker/packages/ui/src/usePomodoro.ts`
**ACs:** AC-L1, AC-L7
**Steps:**
- [ ] Implement state machine: `idle` | `work` | `break` | `paused` | `end-early` | `complete` | `abandoned`
- [ ] Track: `currentRound`, `totalRounds`, `elapsedWorkSeconds`, `remainingSeconds`, `isOverCap`
- [ ] Expose: `start()`, `pause()`, `resume()`, `endEarly()`, `claim()`, `abandon()`, `reset()`
- [ ] Accept config: `{ workSec, breakSec, rounds }`
- [ ] Use `Date.now()` delta for elapsed time (not setInterval counting)
- [ ] Set `isOverCap = true` when cumulative work time exceeds 14400s
**Verify:** `pnpm vitest run packages/ui/src/__tests__/usePomodoro.test.ts` -- all T1.1 tests pass
**Done when:** All T1.1 tests pass.

### T3a.2: Implement useBrowserNotification hook
**File:** `/home/meden/GolandProjects/RpgTracker/packages/ui/src/useBrowserNotification.ts`
**ACs:** AC-L4
**Steps:**
- [ ] `requestPermission()`: calls Notification.requestPermission(), updates internal state
- [ ] `notify({ title, body })`: creates Notification if granted, no-op otherwise
- [ ] `isSupported`: checks typeof window !== 'undefined' && 'Notification' in window
- [ ] `permission`: reflects Notification.permission
**Verify:** `pnpm vitest run packages/ui/src/__tests__/useBrowserNotification.test.ts` -- all T1.2 tests pass
**Done when:** All T1.2 tests pass.

### T3a.3: Implement useSessionNavigation hook
**File:** `/home/meden/GolandProjects/RpgTracker/packages/ui/src/useSessionNavigation.ts`
**ACs:** AC-L5
**Steps:**
- [ ] Read `from` query parameter from URL search params
- [ ] Read `skillId` from route path (Next.js `useParams`)
- [ ] Compute `returnUrl`: `/dashboard` if from=dashboard, else `/skills/${skillId}`
- [ ] Expose: `returnUrl`, `skillId`, `entryPoint` ('dashboard' | 'skill')
**Verify:** `pnpm vitest run packages/ui/src/__tests__/useSessionNavigation.test.ts` -- all T1.3 tests pass
**Done when:** All T1.3 tests pass.

### T3a.4: Implement sessionXP utility
**File:** `/home/meden/GolandProjects/RpgTracker/packages/ui/src/sessionXP.ts`
**ACs:** AC-L3
**Steps:**
- [ ] Export `computeSessionXP(workMinutes: number, tierNumber: number): number`
- [ ] Formula: `Math.floor(workMinutes * 3 * (1 + 0.4 * (tierNumber - 1)))`
- [ ] Export `workMinutesFromSeconds(elapsedWorkSeconds: number): number` -- `elapsedWorkSeconds / 60`
**Verify:** `pnpm vitest run packages/ui/src/__tests__/sessionXP.test.ts` -- all T1.5 tests pass
**Done when:** All T1.5 tests pass.

---

## T3b: Frontend components -- config + summary (frontend)

### T3b.1: Implement SessionConfig component
**File:** `/home/meden/GolandProjects/RpgTracker/packages/ui/src/SessionConfig.tsx`
**ACs:** AC-V5
**Steps:**
- [ ] Props: `{ skillName, tierColor, onBegin(config), onCancel }`
- [ ] Session type toggle: Simple / Pomodoro
- [ ] Pomodoro config with preset chips: Work [15m, 25m, 45m, Custom], Break [5m, 10m, Custom], Rounds [2, 4, 6, Custom]
- [ ] Custom inputs: number input with min/max bounds
- [ ] "Begin Session" button styled with tierColor
- [ ] All colours via design tokens
- [ ] Full-screen centered card layout (same pattern as existing GrindOverlay config phase)
**Verify:** Component renders without errors; visual inspection for token usage
**Done when:** Component renders config screen matching AC-V5 description.

### T3b.2: Implement SessionSummary component
**File:** `/home/meden/GolandProjects/RpgTracker/packages/ui/src/SessionSummary.tsx`
**ACs:** AC-V4, AC-L6
**Steps:**
- [ ] Props: `{ earnedXP, bonusPercentage, streakStatus, durationSeconds, intervalsCompleted, intervalsPlanned, returnUrl, onSubmit(reflections), onDismiss }`
- [ ] Display: XP earned (large accent), bonus %, streak, duration, intervals (if Pomodoro)
- [ ] Reflection inputs: what, how, feeling (reuse pattern from PostSessionScreen)
- [ ] "Log Session" button calls onSubmit
- [ ] "Return" button navigates to returnUrl
- [ ] Overlay positioning: full viewport, `var(--color-bg)` background
- [ ] All colours via design tokens
**Verify:** `pnpm vitest run packages/ui/src/__tests__/SessionPage.test.tsx` -- T1.6 summary display tests pass
**Done when:** Summary displays correctly with all required fields.

### T3b.3: Implement SessionEndEarly component
**File:** `/home/meden/GolandProjects/RpgTracker/packages/ui/src/SessionEndEarly.tsx`
**ACs:** AC-L1 (end-early flow)
**Steps:**
- [ ] Props: `{ elapsedSeconds, tierColor, onKeepGoing, onClaim, onAbandon }`
- [ ] Three buttons: Keep Going, Claim Session (tier-coloured), Abandon (error-coloured)
- [ ] Elapsed time display
- [ ] Design tokens for all colours
- [ ] Reuse pattern from existing GrindOverlay end-early phase
**Verify:** Component renders without errors
**Done when:** End-early confirmation renders with three action buttons.

---

## T3c: Frontend components -- per-theme timer variants (frontend)

### T3c.1: Implement SessionTimer base component
**File:** `/home/meden/GolandProjects/RpgTracker/packages/ui/src/SessionTimer.tsx`
**ACs:** AC-V2, AC-V3
**Steps:**
- [ ] Props: `{ phase, remainingSeconds, currentRound, totalRounds, skillName, tierColor, elapsedWorkSeconds, onEndEarly, onPause, onResume, isPaused }`
- [ ] Delegates rendering to theme-specific variant based on `data-theme` attribute
- [ ] Uses `dynamic()` import for code splitting (Layer 3)
- [ ] Fallback: renders base timer while variant loads
- [ ] Round counter: "Round N of M" visible for Pomodoro
- [ ] Work/break phase label
**Verify:** Component renders and delegates to correct variant
**Done when:** Base timer renders and loads theme variants.

### T3c.2: Implement SessionTimerMinimal variant
**File:** `/home/meden/GolandProjects/RpgTracker/packages/ui/src/SessionTimerMinimal.tsx`
**ACs:** AC-V2 (Minimal), AC-V3
**Steps:**
- [ ] Large Inter Bold countdown numbers, centered
- [ ] Breathing animation: pulsing circle with `animation-duration: calc(4s * var(--motion-scale))`
- [ ] Clean outlined pause/resume buttons
- [ ] Work phase: normal intensity
- [ ] Break phase: reduced opacity, calmer pulse
- [ ] All colours from `var(--color-*)` tokens
**Verify:** Visual inspection with `data-theme="minimal"`
**Done when:** Minimal timer matches AC-V2 Minimal description.

### T3c.3: Implement SessionTimerRetro variant
**File:** `/home/meden/GolandProjects/RpgTracker/packages/ui/src/SessionTimerRetro.tsx`
**ACs:** AC-V2 (Retro), AC-V3
**Steps:**
- [ ] Press Start 2P font for timer (`var(--font-display)`)
- [ ] Pixel-art styled progress indicator
- [ ] XP counter ticking up in real-time (computed from elapsedWorkSeconds)
- [ ] Gold/amber accents (`var(--color-accent)`)
- [ ] Work phase: full battle screen intensity
- [ ] Break phase: reduced visual activity, "rest" framing
- [ ] All colours from design tokens
**Verify:** Visual inspection with `data-theme="retro"`
**Done when:** Retro timer matches AC-V2 Retro description.

### T3c.4: Implement SessionTimerModern variant
**File:** `/home/meden/GolandProjects/RpgTracker/packages/ui/src/SessionTimerModern.tsx`
**ACs:** AC-V2 (Modern), AC-V3
**Steps:**
- [ ] Rajdhani numbers (`var(--font-display)`)
- [ ] SVG progress ring filling as session progresses
- [ ] Pulsing ambient glow with `animation-duration: calc(3s * var(--motion-scale))`
- [ ] Cyan/magenta accents (`var(--color-accent)`)
- [ ] Work phase: "OPERATION ACTIVE" HUD intensity
- [ ] Break phase: dimmed glow, calmer ring animation
- [ ] All colours from design tokens
**Verify:** Visual inspection with `data-theme="modern"`
**Done when:** Modern timer matches AC-V2 Modern description.

---

## T3d: Route wiring + integration (frontend)

### T3d.1: Implement SessionPage orchestrator
**File:** `/home/meden/GolandProjects/RpgTracker/packages/ui/src/SessionPage.tsx`
**ACs:** AC-L1, AC-L5, AC-L6, AC-L7
**Steps:**
- [ ] Wires together: usePomodoro, useBrowserNotification, useSessionNavigation, sessionXP
- [ ] State flow: config -> timer -> end-early/complete -> summary
- [ ] On session start: request notification permission
- [ ] On phase transition: fire browser notification
- [ ] On complete: compute XP, show SessionSummary
- [ ] On "Log Session": call createSession API with all fields, navigate to returnUrl
- [ ] On "Dismiss": navigate to returnUrl without API call
- [ ] `beforeunload` listener active during work/break phases
- [ ] Receives skill data as props (fetched by route page)
**Verify:** `pnpm vitest run packages/ui/src/__tests__/SessionPage.test.tsx` -- all T1.6 tests pass
**Done when:** All T1.6 tests pass; full flow works end-to-end.

### T3d.2: Create session route layout
**File:** `/home/meden/GolandProjects/RpgTracker/apps/rpg-tracker/app/(app)/skills/[id]/session/layout.tsx`
**ACs:** AC-V1
**Steps:**
- [ ] Full-screen layout: no sidebar import, no bottom tabs import, no header
- [ ] `<div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>{children}</div>`
- [ ] No `max-w-*` container constraint (full viewport)
**Verify:** Route layout renders without nav elements
**Done when:** Navigating to `/skills/[id]/session` shows full-screen content with no nav.

### T3d.3: Create session route page
**File:** `/home/meden/GolandProjects/RpgTracker/apps/rpg-tracker/app/(app)/skills/[id]/session/page.tsx`
**ACs:** AC-V1, AC-L5
**Steps:**
- [ ] Fetch skill detail via `getSkill(id)` (server component or client with TanStack Query)
- [ ] Pass skill data to `<SessionPage>`: skillId, skillName, tierColor, tierNumber, requiresActiveUse, animationTheme
- [ ] Read `from` query param and pass to SessionPage
**Verify:** Route loads and renders SessionConfig for a valid skill ID
**Done when:** `/skills/[id]/session` renders the session flow.

### T3d.4: Update barrel exports
**File:** `/home/meden/GolandProjects/RpgTracker/packages/ui/src/index.ts`
**Steps:**
- [ ] Export: SessionPage, SessionConfig, SessionTimer, SessionTimerMinimal, SessionTimerRetro, SessionTimerModern, SessionSummary, SessionEndEarly
- [ ] Export: usePomodoro, useBrowserNotification, useSessionNavigation, computeSessionXP
- [ ] Add `@deprecated` JSDoc comment to GrindOverlay and PostSessionScreen exports
**Verify:** `pnpm tsc --noEmit -p packages/ui` succeeds
**Done when:** All new exports compile.

### T3d.5: Add "Start Session" link on skill detail page
**File:** `/home/meden/GolandProjects/RpgTracker/apps/rpg-tracker/app/(app)/skills/[id]/page.tsx`
**ACs:** AC-L5 (entry point)
**Steps:**
- [ ] Add a "Start Session" button/link that navigates to `/skills/${id}/session?from=skill`
- [ ] Styled with tier colour, placed near existing session/grind controls
- [ ] Keep existing GrindOverlay for now (deprecation, not removal)
**Verify:** Button visible on skill detail page; clicking navigates to session route
**Done when:** Skill detail page has a working "Start Session" link.

---

## T4-logic: Code gate review (reviewer)

**Input:** plan.md, T1 test files, T2 backend files, T3a hook files, T3d.1 SessionPage
**ACs:** AC-L1 through AC-L7
**Steps:**
- [ ] Verify all T1 tests pass
- [ ] Verify migration SQL is correct
- [ ] Verify Go handler accepts and stores Pomodoro fields
- [ ] Verify API client sends new fields
- [ ] Verify hooks implement specified behaviour
- [ ] Verify XP calculation matches D-034 formula
- [ ] Check for regressions in shared packages (barrel exports, type compatibility)
**Done when:** Reviewer writes review.md with GO verdict.

## T4-visual: Visual review (reviewer)

**Input:** plan.md, T3b/T3c/T3d component files, style guides, page guide
**ACs:** AC-V1 through AC-V5
**Reference:** `Documentation/page-guides/session.md`, `Documentation/style-guide/shared.md`
**Steps:**
- [ ] Token compliance: no hardcoded colours/fonts
- [ ] Theme compatibility: all three variants render correctly
- [ ] Three-layer architecture: CSS tokens (L1) and theme-scoped CSS (L2) used where possible; Layer 3 only for structural timer differences
- [ ] Accessibility: focus states, touch targets >= 44px, contrast ratios
- [ ] Page composition matches session page guide
**Done when:** Reviewer writes visual-review.md with GO verdict.

---

## Plan Review

**Reviewer:** orchestrator (inline plan-review)
**Date:** 2026-03-22

### Findings

All 12 spec ACs (AC-L1 through AC-L7, AC-V1 through AC-V5) map to plan tasks. All tasks reference absolute file paths. All implementation steps have verification commands (go test, vitest, tsc --noEmit, or visual inspection). All tasks have explicit Done conditions.

**Minor optimization noted:** T3b (SessionConfig + SessionSummary) is listed as depending on T3a (hooks), but neither component imports hooks directly. T3b could run in parallel with T3a after T1 completes. Not a correctness issue.

### Verdict

APPROVED -- proceed to parallel-session.
