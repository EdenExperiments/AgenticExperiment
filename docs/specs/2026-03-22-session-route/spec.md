# Spec: Session Route (Phase 2)

**Status:** SHIPPED
**Type:** mixed (logic + visual)
**Date:** 2026-03-22
**Roadmap:** P2-1 through P2-7
**Feature Tracker:** F-024 (Focus timer / Pomodoro)

---

## Summary

Extract the existing grind overlay (currently a full-screen `fixed` overlay on the skill detail page) into a dedicated `/skills/[id]/session` route with its own layout (no sidebar/bottom tabs). Add Pomodoro work/break cycle support with configurable intervals. Add per-theme timer visuals (Layer 3 component variants). Add a post-session summary overlay with XP earned, streak status, and duration. Add context-aware return navigation. Add browser notifications on session complete.

---

## Decision Resolution: D-040 (Session History Schema)

The `training_sessions` table already exists (migration 000007) with fields:
- `id`, `skill_id`, `user_id`, `session_type`, `planned_duration_sec`, `actual_duration_sec`
- `status` (completed | partial | abandoned), `completion_ratio`, `bonus_percentage`, `bonus_xp`, `created_at`

**D-040 Resolution:** The existing schema is sufficient for Pomodoro support. The `session_type` field already stores `'pomodoro'` or `'manual'`. For Pomodoro interval tracking, we add two columns:
- `pomodoro_work_sec INT NOT NULL DEFAULT 1500` -- work interval duration (default 25 min)
- `pomodoro_break_sec INT NOT NULL DEFAULT 300` -- break interval duration (default 5 min)
- `pomodoro_intervals_completed INT NOT NULL DEFAULT 0` -- how many work intervals were completed
- `pomodoro_intervals_planned INT NOT NULL DEFAULT 0` -- how many work intervals were planned

These are recorded at session completion. The timer itself runs entirely client-side. The API receives the final counts when the session ends.

---

## Zones Touched

| Zone | Paths | Changes |
|------|-------|---------|
| Go API | `apps/api/` | Migration for Pomodoro columns, update session handler to accept/store new fields |
| Next.js UI | `apps/rpg-tracker/` | New `/skills/[id]/session` route + layout, session page component |
| Shared UI | `packages/ui/src/` | Extract/refactor GrindOverlay into session components, per-theme timer variants, notification hook |
| API Client | `packages/api-client/src/` | Update `createSession` to send Pomodoro fields, update `TrainingSession` type |

---

## Acceptance Criteria

### Logic ACs (TDD gate applies)

**AC-L1: Pomodoro timer state machine**
- Timer has states: `idle` -> `work` -> `break` -> `work` -> ... -> `complete`
- User can configure: work duration (default 25 min), break duration (default 5 min), number of rounds (default 4)
- Timer counts down during work and break phases
- After the last work interval, state transitions to `complete` (skip final break)
- User can pause/resume at any time during work or break
- User can end session early from any state

**AC-L2: Session API accepts Pomodoro fields**
- `POST /api/v1/skills/:id/sessions` accepts optional fields: `pomodoro_work_sec`, `pomodoro_break_sec`, `pomodoro_intervals_completed`, `pomodoro_intervals_planned`
- Fields are stored in `training_sessions` table
- Existing session creation (non-Pomodoro) continues to work unchanged (backward compatible)
- `GET /api/v1/skills/:id/sessions` returns Pomodoro fields in response

**AC-L3: XP calculation for Pomodoro sessions**
- XP is calculated from actual work time only (break time excluded)
- Formula: `xp_delta = work_minutes * 3 * (1 + 0.4 * (tierNum - 1))` (per D-034)
- XP is computed client-side and sent as `xp_delta` in the session POST (same as current flow)
- Bonus XP calculation (completion ratio, active use) works the same as existing sessions

**AC-L4: Browser notifications**
- App requests notification permission on session start (if not already granted)
- Notification fires when: work interval ends, break interval ends, full session completes
- Notification includes: skill name, phase transition info ("Break time!", "Back to work!", "Session complete!")
- Notifications work when the tab is backgrounded
- If permission denied, session works normally without notifications (graceful degradation)

**AC-L5: Context-aware return navigation**
- Entry point is tracked via query parameter: `?from=dashboard` or `?from=skill` (default)
- Post-session "Return" button navigates to the correct origin
- If entry point cannot be determined (no query param), defaults to skill detail (`/skills/[id]`)
- Browser back button during active session shows end-early confirmation (existing behaviour preserved)
- `beforeunload` event fires a warning during active timer to prevent accidental tab close

**AC-L6: Session completion flow**
- On session complete (timer ends or user claims early): session data POSTed to API
- API returns: session record, XP result (with level/tier info), streak update
- Post-session summary displays: XP earned, bonus percentage, streak status, duration, intervals completed
- "Log Session" button submits reflection and confirms XP (existing PostSessionScreen flow)

**AC-L7: Session duration safety**
- Timer uses `Date.now()` delta (not interval counting) to handle device sleep/screen lock correctly
- `beforeunload` warning fires during active timer phases (work/break)
- Maximum session duration: 4 hours (240 min). Timer warns at cap but does not force-stop
- Session with 0 work time completed: XP is 0, status is "abandoned"

### Visual ACs (reviewer gate applies)

**AC-V1: Dedicated session route with no nav**
- Route: `/skills/[id]/session`
- Full-screen layout: no sidebar, no bottom tabs, no header
- Background: `var(--color-bg)` full viewport
- Only session content visible

**AC-V2: Per-theme timer displays (Layer 3 component variants)**
- **Minimal:** Large Inter Bold countdown numbers, centered. Subtle breathing animation (pulsing circle) synced to timer. Clean outlined pause/resume buttons. Muted background.
- **Retro:** Press Start 2P timer text. Pixel-art styled progress. "Grinding" XP counter ticking up. Gold/amber accents. Battle screen aesthetic.
- **Modern:** Rajdhani numbers in a holographic timer ring. Progress ring filling as session progresses. Pulsing ambient glow. Cyan/magenta accents on dark navy. HUD aesthetic.
- All three variants use design tokens (`var(--color-*)`, `var(--font-*)`, `var(--motion-scale)`)

**AC-V3: Work/break phase visual distinction**
- Work phase: full intensity, accent colours, active animations
- Break phase: reduced visual intensity, muted colours, calmer animations
- Phase transition: smooth crossfade gated by `--motion-scale`
- Round counter visible: "Round N of M"

**AC-V4: Post-session summary overlay**
- Overlays the session route (not a new page navigation)
- Displays: XP earned (large, accent colour), bonus percentage, streak status, session duration, intervals completed (for Pomodoro)
- "Return" button with context-aware destination
- Reflection inputs (existing PostSessionScreen fields)
- Theme-appropriate styling (tokens, not hardcoded)

**AC-V5: Session config screen**
- Entry screen before timer starts
- Shows: skill name, session type selector (Simple / Pomodoro)
- Pomodoro config uses preset chips for mobile-friendly input:
  - Work: [15m] [25m] [45m] [Custom] (default: 25m)
  - Break: [5m] [10m] [Custom] (default: 5m)
  - Rounds: [2] [4] [6] [Custom] (default: 4)
- Simple mode: count-up timer (no countdown)
- "Begin Session" button (accent colour, tier-coloured)

---

## Out of Scope

- Audio/ambient soundtracks (Phase 8, P8-1)
- Dashboard Quick Session button (Phase 4, P4-4 -- depends on skill pinning)
- Advanced notification system / streak reminders (Phase 8, P8-4)
- Pixel particle effects and holographic effects beyond basic timer treatment (Phase 8, P8-5/P8-6)

---

## Migration Plan

**Migration 000008_session_pomodoro.up.sql:**
```sql
ALTER TABLE public.training_sessions
    ADD COLUMN IF NOT EXISTS pomodoro_work_sec INT NOT NULL DEFAULT 1500,
    ADD COLUMN IF NOT EXISTS pomodoro_break_sec INT NOT NULL DEFAULT 300,
    ADD COLUMN IF NOT EXISTS pomodoro_intervals_completed INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS pomodoro_intervals_planned INT NOT NULL DEFAULT 0;
```

**Migration 000008_session_pomodoro.down.sql:**
```sql
ALTER TABLE public.training_sessions
    DROP COLUMN IF EXISTS pomodoro_work_sec,
    DROP COLUMN IF EXISTS pomodoro_break_sec,
    DROP COLUMN IF EXISTS pomodoro_intervals_completed,
    DROP COLUMN IF EXISTS pomodoro_intervals_planned;
```

---

## Component Architecture

### New Components (packages/ui/src/)
- `SessionPage` -- orchestrator component for the session route
- `SessionConfig` -- pre-session configuration (replaces GrindOverlay config phase)
- `SessionTimer` -- base timer logic with Pomodoro state machine
- `SessionTimerMinimal` -- Layer 3 variant: breathing countdown
- `SessionTimerRetro` -- Layer 3 variant: pixel battle screen
- `SessionTimerModern` -- Layer 3 variant: holographic HUD
- `SessionSummary` -- post-session overlay (replaces/extends PostSessionScreen)
- `usePomodoro` -- hook: Pomodoro state machine (idle/work/break/complete, pause/resume)
- `useBrowserNotification` -- hook: permission request + notification dispatch
- `useSessionNavigation` -- hook: track entry point, provide return URL

### Modified Components
- `GrindOverlay` -- deprecated in favour of SessionPage; kept temporarily for backward compat
- `PostSessionScreen` -- logic extracted into SessionSummary; old component marked deprecated

### Route Structure (apps/rpg-tracker/)
- `app/(app)/skills/[id]/session/page.tsx` -- session route page
- `app/(app)/skills/[id]/session/layout.tsx` -- full-screen layout (no nav)

---

## Existing Code to Reuse

- `GrindOverlay` phases (config, work, break, end-early) map directly to new SessionPage states
- `PostSessionScreen` reflection inputs and XP display reused in SessionSummary
- `GrindAnimation` component reused as base for theme-specific timer variants
- `createSession` / `listSessions` API client functions already exist -- extend with new fields
- Session handler and store in Go API already functional -- extend with new columns
- `useMotionPreference` hook for animation gating
- Tier colour system (D-020) for accent colours in timer displays
