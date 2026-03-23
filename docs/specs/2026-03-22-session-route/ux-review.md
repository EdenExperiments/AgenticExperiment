# UX Review: Session Route

**Date:** 2026-03-22
**Spec:** docs/specs/2026-03-22-session-route/spec.md

---

## Flow Correctness

The end-to-end flow is sound:
1. User navigates to skill detail -> taps "Start Session" -> arrives at `/skills/[id]/session`
2. Config screen: choose Simple or Pomodoro, configure intervals -> tap "Begin Session"
3. Timer runs (work phase) -> break phase (Pomodoro) -> repeat -> complete
4. Post-session summary overlay -> reflection -> "Log Session" -> return to origin

**No dead ends identified.** All states have clear exit paths:
- Config: Begin or Cancel (back to origin)
- Timer: End Early -> confirmation (Keep Going / Claim / Abandon)
- Break: auto-transition to next work interval, or Skip Break
- Summary: Log Session or Dismiss

**One flow clarification needed (minor):** The spec should explicitly state what happens when a user navigates away mid-session (e.g., closes tab, navigates to another URL). Recommendation: the session is treated as abandoned with no XP. The existing `popstate` handler in GrindOverlay handles back-button; the spec should note that `beforeunload` is also handled.

---

## Mobile Viability

**Good.** The full-screen layout with no nav is mobile-first by design:
- Timer display is centred and large -- works on all screen sizes
- Config screen uses `max-w-sm` card pattern (existing GrindOverlay) -- mobile-friendly
- Post-session summary scrolls vertically with sticky footer (existing PostSessionScreen pattern)
- Pause/resume buttons are full-width or large touch targets (existing pattern uses `min-h-[48px]`)

**Pomodoro config concern:** The config screen adds work duration, break duration, and rounds inputs. On mobile, these must not require a number picker or complex input. Recommendation: use preset chips (like Quick Log) with a "Custom" option. E.g., Work: [15m] [25m] [45m] [Custom], Break: [5m] [10m] [Custom], Rounds: [2] [4] [6] [Custom].

---

## Navigation Changes

- **New route:** `/skills/[id]/session` -- does not affect bottom tabs or sidebar
- **New layout:** `app/(app)/skills/[id]/session/layout.tsx` -- full-screen, no nav. This is the same pattern used by the existing grind overlay (full viewport `fixed` positioning) but as a proper route
- **Back navigation:** End-early confirmation intercepts back button (existing pattern)
- **No bottom tab changes** -- session route is hidden from nav (same as current overlay)
- **Context-aware return:** tracked via query param or sessionStorage. Query param (`?from=dashboard` or `?from=skill`) is more robust than sessionStorage (survives refresh). Recommend query param approach.

---

## Theme Awareness

The spec correctly identifies this as Layer 3 work (component variants for timer displays). Theme-dependent interactions:
- Timer animations gated by `--motion-scale` (Minimal: subtle, Retro: moderate, Modern: full)
- Phase transition animations also gated
- No theme-dependent user flows (all themes have the same interaction model)

No issues.

---

## Edge Cases

The spec should address these explicitly:

1. **Tab close / navigate away mid-session:** Session lost, no XP. Add `beforeunload` warning during active timer.
2. **Session with 0 work time completed:** If user starts and immediately ends, `actual_duration_sec = 0`. XP should be 0. The API already handles this (xp_delta is required and computed client-side from duration).
3. **Notification permission denied after initial request:** Spec covers this (graceful degradation). Good.
4. **Very long sessions:** No upper bound specified. Recommend a sanity cap (e.g., 4 hours max for a single session). The timer can continue past the planned duration in Simple mode but should warn after the cap.
5. **Device sleep / screen lock during session:** Timer may pause. Use `Date.now()` delta (already done in GrindOverlay) rather than `setInterval` counting to handle this correctly. The spec should note this is preserved from the existing implementation.
6. **Multiple sessions for same skill:** No concurrency issue -- sessions are independent rows. Opening `/skills/[id]/session` in two tabs is an edge case but not harmful (both will POST independently).

---

## Approval

APPROVED

The flow is correct, mobile-viable, and theme-aware. The edge cases noted above are recommendations to strengthen the spec but are not blockers -- the existing GrindOverlay already handles most of them (beforeunload, Date.now delta), and the new route inherits those patterns. The Pomodoro config chip-based input recommendation is a UX improvement but the spec's approach (config inputs) is also acceptable.
