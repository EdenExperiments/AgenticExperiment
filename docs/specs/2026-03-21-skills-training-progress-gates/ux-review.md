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

---

## Third Pass — Starting-Level Gate Interaction (2026-03-21)

**Trigger:** UX advisory request on the unspecified interaction between self-reported starting levels and the gate system.

**Status of this pass: CHANGES-NEEDED** — the spec is silent on this flow. The items below must be addressed before the skill creation handler is implemented.

---

### Flow Correctness

The spec defines the gate submission flow (AC-Group G) and the skill creation wizard (AC-Group A, sections 7 and existing feature context) but contains no rule governing how gates are initialised when a skill is created with a starting level above a gate boundary. This is a dead end in the creation flow: a user who claims level 26 arrives at their new skill's detail page, sees a gate section (D-021 — it replaces the XP bar as the dominant screen element), and has no spec-defined path that explains why two gate submissions are required before their stated level is displayed.

**Recommended rule — Option B (single boundary gate):**

When a skill is created with `starting_level > 9`, the creation handler must:

1. Identify the highest gate whose level is strictly below `starting_level`. For level 26 this is gate 19 (the Adept boundary). For level 45 this is gate 39. For level 9 or below, no auto-clearing occurs.
2. Bulk-insert `gate_submissions` rows with `verdict = 'self_reported'` for all gates whose level is strictly below the identified highest gate. For level 26: gate 9 is auto-cleared. For level 45: gates 9, 19, 29 are auto-cleared.
3. Set `blocker_gates.is_cleared = true` and `cleared_at = now()` on those same rows, so the existing `EffectiveLevel()` server-side logic (R-004) treats them as cleared without any code change.
4. The single highest boundary gate (gate 19 at level 26, gate 39 at level 45) is NOT auto-cleared. It requires a normal G-flow submission.

**Rationale:** Gate integrity validates tier transitions. A user claiming Adept (level 20–29) is asserting they crossed the Apprentice→Adept boundary — gate 19 is the correct check. Requiring gate 9 evidence from a self-reported Adept adds no integrity signal and directly contradicts D-011 (low-friction principle) and the spirit of D-007 (gates are not punitive to ongoing logging). The audit trail is preserved: auto-cleared rows in `gate_submissions` record the reason, satisfying G5 for future social verification (G4).

**The level 99 edge case:** A user claiming level 99 (the maximum per D-018) sits above gate 89. Gates 9 through 79 are auto-cleared. Gate 89 (Master→Grandmaster) requires submission. This is correct — one meaningful submission for the highest claimed boundary.

**Why not Option C (single consolidated submission that clears all):** C is close to B but requires the gate submission handler to programmatically clear N gates on a single approved verdict — a more complex transaction with no meaningful integrity gain over B for this use case.

**Why not Option D (auto-clear all gates at creation):** D loses the integrity check entirely for the starting level. This is acceptable for Novice/Apprentice range but indefensible for a user claiming level 89.

---

### Mobile Viability

With Option B in place, a user creating a level-26 skill arrives at the detail page and sees one gate section for gate 19. One submission, one focused task. This is appropriate mobile UX — the dominant gate section (D-021) is purposeful and bounded.

Without this fix (status quo Option A), a user creating a level-75 skill would face six sequential gate submissions before reaching their starting level. Each submission involves three textareas with character minimums (G2), a possible 30-second AI wait (G3), and a rejection/retry cycle. On mobile this is not merely inconvenient — it is a screen-time and cognitive load pattern that will cause users to abandon the skill or understate their level. D-006 (strong mobile usability for core flows) is violated by Option A.

---

### Navigation Changes

None introduced by this fix. The gate submission flow (AC-Group G) is unchanged. The new logic lives entirely in the creation handler.

---

### Edge Cases

**Starting level exactly on a gate boundary (e.g., level 19 exactly):** The user is at the gate level itself. Gate 19 is the active gate — no auto-clearing occurs for levels below since the user is claiming exactly the boundary, not a level above it. `EffectiveLevel()` caps at 9 until gate 19 is cleared. This is correct and consistent.

**Starting level 10–18 (Apprentice tier, above gate 9 but below gate 19):** Only gate 9 requires submission. No auto-clearing needed — gate 9 is the single applicable boundary gate. This is already consistent with Option B without any auto-clearing logic (no gates to auto-clear below gate 9).

**Starting level 1–9 (Novice tier):** No gates are applicable at creation. The user encounters gate 9 through normal XP accumulation. Option B does not change this path.

**Wizard communication gap (question 2):** The spec does not inform the user during skill creation that a gate submission will be required. This creates a surprise dead-end. The wizard must surface an inline note beneath the level picker when `starting_level` exceeds a gate boundary. Suggested copy: "Starting above level [N] means you'll need to submit one gate assessment (for [TierName] mastery) before your full starting level is displayed." The note must name the specific gate and tier (not generic language), must be non-blocking (not a modal or confirmation step), and must be positioned within normal thumb scroll reach on mobile. No new wizard step is required.

---

### Items to Add to spec.md

- **Add to AC-Group G (Gate Submission), as G9:** "When a skill is created with `starting_level` above a gate boundary, the creation handler auto-clears all gate boundaries strictly below the highest applicable gate by inserting `gate_submissions` rows with `verdict = 'self_reported'` and setting `blocker_gates.is_cleared = true, cleared_at = now()` on those rows. Only the single highest boundary gate requires a user submission. Auto-cleared rows store the note 'Auto-cleared at skill creation — starting level implies this tier was reached' in `ai_feedback`. No cooldown is set. `EffectiveLevel()` is unchanged."
- **Add to AC-Group A (or the wizard section in section 7):** "When the user selects a starting level above a gate boundary in the skill creation wizard, an inline informational note appears beneath the level picker: 'Starting above level [N] means you'll need to submit one gate assessment ([TierName] mastery) before your full starting level is displayed.' The note is non-blocking and requires no additional wizard step."
- **Add a new decision entry D-033** (or equivalent) to `Documentation/decision-log.md`: "Starting-level gate initialisation: when a skill is created above a gate boundary, all gates below the highest applicable boundary are auto-cleared at creation (verdict = 'self_reported'). Only the single highest boundary gate requires a submission. This is the 'start where you are' rule — the gate system validates tier transitions going forward, not every historical boundary below the claimed starting level." This prevents future agents from treating the auto-clear as a bug or reverting it.

---

### Approval (Third Pass)

CHANGES-NEEDED

- G9: Add the starting-level auto-clear rule to AC-Group G as specified above.
- Wizard note: Add the inline gate-preview note to the skill creation wizard section.
- D-033: Add the binding decision entry to `Documentation/decision-log.md` so the rule is anchored and not inadvertently removed by a future implementation agent.
