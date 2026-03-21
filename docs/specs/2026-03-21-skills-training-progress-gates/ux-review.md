# UX Review — Skills: Training Sessions, Progress Visualisation & Gate Mastery

**Spec:** `docs/specs/2026-03-21-skills-training-progress-gates/spec.md`
**Reviewer:** UX Agent
**Date:** 2026-03-21
**Decision baseline:** D-006, D-017, D-019, D-021, D-022, D-023–D-032

---

**Second pass: APPROVED 2026-03-21**

All 22 CHANGES-NEEDED items from the first pass have been resolved. One minor residual note is recorded below under Flow Correctness (item 11) — it does not block approval.

---

## Flow Correctness

### Flow 1: Start Pomodoro → work → break → post-session → log XP

All first-pass gaps are now resolved.

- **Gap 1.1 (Cancel on session config overlay):** B2 now specifies an explicit Cancel affordance (✕ button top-right or swipe-down on mobile). RESOLVED.
- **Gap 1.2 (Break phase exit path):** B7 now states that tapping "End Session" during the break phase skips the break immediately and transitions to the post-session screen. Break is explicitly optional. RESOLVED.
- **Gap 1.3 (Dismiss / Log Later from post-session screen):** D8 adds a low-emphasis "Dismiss / Log Later" link above the action buttons. Tapping it closes the overlay and returns to skill detail with no XP or session recorded. The spec states "the app never forces a user to log." RESOLVED.

**Residual note — post-session system back-gesture (minor, non-blocking):** D1 describes the post-session screen as part of the same overlay stack. D8 covers the tap-based dismiss path. However the spec does not explicitly state whether the Android system back-gesture (or iOS swipe-back) on the post-session screen triggers D8 behaviour or navigates further back through the overlay stack. The recommended implementation is: system back-gesture on the post-session screen triggers the same behaviour as the "Dismiss / Log Later" link. This can be captured in the implementation plan rather than reopening the spec — it is a single-line implementation note.

### Flow 2: Start Pomodoro → end early → claim partial / abandon

- **Gap 2.1 (Abandon option in C3):** C3 now lists all three outcomes: "Keep Going" / "Claim Session" / "Abandon (no XP)." Abandon records a training_sessions row with status = 'abandoned', bonus_xp = 0, and does not create an xp_events row. RESOLVED.
- **Gap 2.2 (50% threshold communication):** B2 now includes a brief note in the session config overlay: "Sessions under 50% of planned time earn no time bonus." Users see this before starting. RESOLVED.

### Flow 3: Submit gate evidence (AI path) → rejected → retry after cooldown

- **Gap 3.1 (Post-rejection state):** G3 now explicitly defines the rejection state: submission form is hidden, AI feedback is shown in full, a date-based retry message is shown, and a disabled Retry button is visible. RESOLVED.
- **Gap 3.2 (Cooldown display granularity):** G3 specifies "Retry available tomorrow" or "Retry available on [date]" — never a live countdown in hours/minutes. RESOLVED.

### Flow 4: Submit gate evidence → approved → unlock animation → XP bar re-appears

- The gate cleared → XP bar transition is now defined in G3: "BlockerGateSection is replaced by the XP progress bar; the next gate section does not appear until the user naturally reaches that gate level." RESOLVED.

---

## Mobile Viability

All first-pass mobile concerns are now addressed.

### Session Config Overlay (B2)

Work and break durations are display-only for MVP. Single primary CTA "Begin" at the bottom. Explicit Cancel affordance. Safe for 375 px.

### Grind View (B3, B4)

B3 now explicitly states the bottom tab bar is hidden while the Grind View is active (D-017 compliance). Fullscreen overlay covers the full viewport. The "End Session" button is the sole interactive control alongside the active-use label — implementation must maintain a minimum 44 px tap target per platform HIG (implementation concern, not a spec gap).

### Post-Session Screen (D1–D5)

D4 now explicitly pins action buttons ("Quick Log" / "Log + Reflect") to the bottom of the viewport via sticky footer on mobile. Reflection fields scroll above. This correctly handles the 375 px scroll depth concern raised in the first pass. RESOLVED.

### XP Chart (F1)

F1 now specifies: tap-to-inspect bar interaction (tooltip with date and XP total), minimum bar width 6 px with 2 px gap, and zero-XP days render as a 2 px hairline stub. The empty state (all bars zero) shows motivational copy rather than an empty bar grid. All mobile concerns resolved.

### Gate Submission Form (G2)

Inline character counters update as the user types. Standard safe-area-inset handling for keyboard is an implementation concern. Form is manageable at 375 px.

---

## Navigation Changes

All first-pass navigation gaps are now resolved.

- **Tab bar hidden:** B3 explicitly states the bottom tab bar is hidden while the Grind View is active. RESOLVED.
- **Back-button interception:** B3 explicitly states the system back-button / back-gesture intercepts to show the end-session-early confirmation (C3) rather than navigating away. RESOLVED.
- **Post-session back nav:** D1 places the post-session screen in the same overlay stack. D8 provides the tap-based dismiss. Residual question on system back-gesture is noted above (non-blocking).
- **Start Session vs. Log XP hierarchy:** B1 now designates "Start Session" as primary (filled/prominent) and "Log XP" as secondary (outlined/subdued) in a two-button row. RESOLVED.

No new bottom tab bar items. All new flows remain within the existing `/skills/{id}` route. Navigation structure is stable.

---

## Edge Cases

All first-pass edge cases are now resolved.

- **Streak = 0:** E5 now hides the streak badge when current_streak = 0 and replaces it with a motivational prompt: "Log today to start your streak." RESOLVED.
- **XP chart day 1 / all-zero:** F1 now specifies the empty state copy: "Start logging to see your progress here" with no empty bar grid rendered. RESOLVED.
- **App closed mid-Pomodoro:** B8 and D-032 define the localStorage recovery mechanism: session state is saved on session start; on skill detail mount, if a matching entry is found within the planned window, the recovery banner is shown with "Yes, log it" / "No, discard". If elapsed time exceeds planned duration, the session is treated as completed. RESOLVED.
- **Gate AI timeout + loading state + navigate-away:** G3 specifies the loading state copy ("Assessing your evidence..."), a 30-second client-side timeout (after which the AI-unavailable error state is shown), and navigate-away behaviour (request continues server-side; result is available via active_gate_submission on next skill detail load). RESOLVED.
- **AI-unavailable error state:** G3 specifies an inline error message with the path selector remaining visible and evidence pre-filled, so the user can immediately switch to self-report without losing content. No cooldown is set on failure. RESOLVED.
- **Rejected evidence pre-fill:** G3 now states that the three evidence fields from the previous submission are pre-filled when the cooldown expires and the user taps Retry. RESOLVED.

---

## Animation

All first-pass animation gaps are now resolved.

- **General animation defined:** D-023 now defines the General animation: a pulsing circular ring that breathes in and out with gentle particle emission on the pulse peaks. Described as neutral, domain-agnostic, visually engaging. This covers all custom skills and the three mapped slugs (finance, nutrition, productivity). RESOLVED.
- **Social → speech waveform clarified:** D-023 now reads "`social` → Language/Speaking (speech waveform or conversation bubbles — not social media iconography)." RESOLVED.

---

## Approval

APPROVED

All 22 items from the first-pass CHANGES-NEEDED list are resolved in the updated spec. The single residual note (system back-gesture on the post-session screen) is a one-line implementation detail that does not require a spec change and does not block implementation or approval.
