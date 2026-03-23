# UX Review — Skill Create Overhaul

**Reviewer:** ux agent
**Date:** 2026-03-23
**Spec:** `docs/specs/2026-03-23-skill-create-overhaul/spec.md`
**Verdict:** APPROVED

---

## User Flows

The end-to-end flow is coherent and follows a clear narrative arc: path selection → Identity → Appraisal → The Arbiter → done. There are no dead ends.

**Path Selector → Step 1:** The two-card entry point (Preset vs Custom) gives users an immediate, unambiguous choice. The "Back to Skills" link on the selector screen means users are never trapped at the entry point. This is correct.

**Step 1 (Identity):** Both paths resolve cleanly to Step 1. The Preset path pre-fills name/description/category and makes them editable — this is good: the user retains agency over the AI-sourced data. The Custom path gives the user full control. The "Next" button is disabled until name is filled, which is a correct guard with no dead-end risk since the name fields are always visible.

**Step 2 (Appraisal):** The level picker (1–50) is straightforward. The gate info banner at levels above 9 is a useful, non-blocking contextual hint. The Preset path showing `ProgressionPreview` with `highlightLevel` at the current selection is a strong reinforcing signal — the user can see immediately which tier they would occupy. This is a clear UX win.

**Step 3 (The Arbiter):** Three sub-flows exist and all are complete:
1. With API key: calibration request → result → accept or override → create. Well-structured.
2. Without API key: summary + soft upsell + create. The "Add API key" link is correctly styled as optional, not a blocker.
3. Calibration error: in-character error message + create with current level. No dead end.

**One gap (MINOR):** The spec describes two actions after calibration — "Accept suggestion (Level {N})" and "Keep my level (Level {current})" — but does not specify what happens if the user clicks neither and then clicks "Create Skill." The summary panel shows "final level," but it is not clear whether "final level" defaults to the user's picker value until explicitly changed, or defaults to the Arbiter's suggestion once it appears. The spec should state which value is pre-selected in the absence of an explicit choice.

**Convergence:** Both paths (Preset and Custom) converge cleanly at Step 2 and Step 3 with no divergent terminal states.

---

## Mobile Viability

The flow is viable on mobile with one layout concern to clarify.

**Path Selector:** ACV-3 mandates vertical stacking on mobile (<768px). The two-card layout collapses to a single column. Touch targets on the card buttons will be adequate as long as cards fill the column width and have a minimum height — the spec does not state a minimum card height. Recommend the implementation ensure each path card is at least 80px tall with appropriate internal padding on mobile (this is an implementation note, not a spec defect).

**Step 1 — Preset Gallery:** A searchable, category-grouped grid that stacks on mobile is standard and viable. The `ProgressionPreview` panel that expands inline below a selected preset card requires attention: on a narrow screen this panel could be long (11 tiers = significant vertical scroll). This is not a blocker — vertical scroll in a form step is acceptable — but the implementation should ensure the panel does not obscure the "Select" button. Sticky or positioned "Select" + "Next" buttons are not specified; implementers should be aware.

**Step 1 — Custom Path:** Name input, description textarea, and category pill buttons stack cleanly on mobile. Category pills may wrap to multiple rows, which is expected and fine.

**Step 2:** Level picker described as a "scrollable list" — on mobile this needs to be a native or custom scroll wheel, not a long vertical list of 50 tappable rows. The spec does not specify the picker widget type. This is a MINOR gap: the spec should clarify the picker control (e.g., `<input type="number">`, a scroll wheel, or a slider) so the mobile experience is unambiguous. A long tappable list of 50 items would be unusable on mobile.

**Step 3 — Arbiter Avatar + Dialogue:** The avatar and dialogue stack vertically by default on mobile (avatar above, dialogue below). ACV-16 mandates responsive, mobile-first stacking. This is sufficient as a constraint.

**Bottom navigation:** The shared layout provides sticky bottom tabs on mobile. The multi-step form sits in the main scroll area above the tabs, which is correct. The "Next" / "Back" / "Create Skill" buttons within the form must not be fixed-positioned or they will conflict with the bottom tab bar. The spec does not specify button positioning — the implementation should keep step navigation in the normal document flow.

---

## Navigation

**Back/Forward within the 3-step flow:** Back and Next buttons are specified on each step. Draft state is preserved within the flow (P6-D11). This is correct.

**Back to path selector:** P6-D11 states that navigating back all the way to the path selector resets all draft state. The user must pass through Step 1 → path selector (two explicit Back presses), making accidental reset unlikely. No confirmation dialog is specified, which is the right call given the multi-step back requirement. This is sound.

**Step indicator visibility:** The arch review (MINOR-2) correctly flags that the step indicator must be suppressed on the path selector screen. This needs to be explicit in the spec's ACs — currently no AC covers this. See Findings.

**"Create Skill" terminal action:** On success, the spec states "creates and redirects." The redirect target is not specified. It should redirect to the newly created skill's detail page (`/skills/{id}`). This is standard behaviour for skill creation but is not written in the spec, leaving the implementer to infer it. See Findings.

**No new routes introduced:** The flow lives within `/skills/new`. No new routes are added. No bottom tab changes are needed. Back-navigation from `/skills/new` returns to `/skills` (existing behaviour), unchanged.

---

## Theme Awareness

The spec is strongly theme-aware throughout.

**Path Selector:** Three theme treatments are explicitly described (Minimal / Retro / Modern headings, card treatments). Correct.

**Arbiter dialogue:** Per-theme greeting text, loading animations, and result text are all specified with distinct in-character voices for each theme. This is thorough and directly matches the page guide's intent.

**ArbiterAvatar:** Three distinct structural treatments (Minimal: circular icon, Retro: pixel-art sage, Modern: holographic wireframe). These cross into Layer 3 territory (component variants) which is appropriate given the structural differences between themes. The spec correctly calls this out as a Layer 3 component variant.

**ArbiterDialogue:** Per-theme animation treatments (fade / typewriter / scan-line) are specified. ACV-21 mandates `--motion-scale` compliance and `prefers-reduced-motion` respect. This is correct.

**One gap:** The spec does not state how the Retro theme's typewriter animation behaves when `prefers-reduced-motion` is set. The `--motion-scale` will be 0.7 for Retro theme, but `prefers-reduced-motion` is a separate OS-level preference. ACV-21 covers both, but the spec should clarify that when `prefers-reduced-motion: reduce` is active, the typewriter effect must not run (text appears immediately, no character-by-character reveal). This is an implementation note that should be formalised in the AC.

---

## Edge Cases

The spec covers edge cases well overall. Gaps and confirmations:

**Covered:**
- Empty presets list: "No presets available yet" + switch-to-custom link. Correct.
- Search zero results: "No presets match your search" + Clear search button. Correct.
- No API key: summary + soft upsell + create. Correct.
- Calibration error: themed in-character error + create with current level. Correct.
- Starting level > 9: gate info banner. Correct.

**Not covered — MINOR gaps:**

1. **Presets API loading state:** The spec describes the empty state and error state for the preset list but does not describe a loading state while `GET /api/v1/presets` is in flight. On a slow connection, the gallery would be blank momentarily. The spec should describe a skeleton or loading indicator for the preset gallery.

2. **Calibration result ambiguity (see User Flows):** If the user sees the Arbiter's suggestion but clicks neither "Accept" nor "Keep my level" before clicking "Create Skill," which level is used? The spec must clarify the default selected state after calibration results appear (recommendation: the Arbiter's suggestion is pre-selected by default, and "Keep my level" is the explicit opt-out).

3. **Network error during skill creation:** The spec covers calibration errors but not errors on the final `POST /api/v1/skills`. If creation fails, the user should see an inline error without losing their draft. The spec should add a brief error state for the create action.

4. **Preset selection then Back to selector:** If a user is on Step 2 (having come from Preset path), presses Back to Step 1, then presses Back again to the path selector, the draft resets (P6-D11). This is correct. However, if the user presses Back from Step 1 to the path selector and immediately selects Custom instead of Preset, the flow should start cleanly. P6-D11 covers this, but it is worth confirming in an AC that switching paths from the selector clears any previously loaded preset data.

---

## Accessibility

**Keyboard navigation:** The multi-step form must support keyboard-only navigation. Tab order through form fields, pill buttons (category picker), and the preset gallery cards must be sequential and logical. The spec does not address tab order or keyboard activation of the path selector cards. The implementation must ensure both path cards are keyboard-focusable and activatable via Enter/Space.

**Preset gallery:** Individual preset cards must be keyboard-accessible. If clicking a card expands `ProgressionPreview`, this expand/collapse must also be keyboard-triggerable and must announce its state change to screen readers (`aria-expanded`).

**Screen reader concerns for animated text:** The Retro typewriter effect and Modern scan-line reveal present a specific screen reader problem: if the text is revealed character-by-character in the DOM, screen readers may read each character or fragment individually, producing an unusable experience. The spec does not address this.

**Fix required:** `ArbiterDialogue` must render the full text in the DOM immediately (for screen readers) and apply the visual animation via CSS or a visually-revealed overlay, not by progressively inserting characters into the DOM. The `animate` prop should control only the visual presentation. This should be an AC. See Findings.

**ArbiterAvatar state changes:** When the avatar transitions from `idle` → `thinking` → `speaking`, screen readers should not announce these purely decorative state changes. The avatar element should use `aria-hidden="true"` or equivalent so the visual state changes do not interrupt the reading flow.

**ArbiterDialogue ARIA live region:** When calibration results appear, screen readers must announce the new text. The dialogue container should use `aria-live="polite"` so the result is announced without interrupting current reading. This is not specified in the spec.

**"Consult The Arbiter" button:** During the loading state, the button must be disabled and its text (or `aria-label`) should reflect the loading state (e.g., "Consulting The Arbiter..." with `aria-busy="true"`). The spec describes visual loading animations but does not address the button's accessible state during loading.

**Step indicator:** The step indicator should use `aria-current="step"` on the active step label to communicate current position to screen readers. Not specified.

**Category pill buttons:** The category picker uses pill buttons. These must communicate selected state via `aria-pressed` or equivalent.

---

## Page Guide Alignment

The spec delivers the page guide's vision faithfully on all major points:

**Two clearly separated paths:** The full-screen path selector with two themed cards matches the page guide's "clearly separated at the start" directive. The page guide does not specify a full-screen pre-step, but the spec's interpretation is a natural extension and a stronger implementation of the intent.

**Step labels:** "Identity," "Appraisal," "The Arbiter" — exact match.

**The Arbiter as core selling point:** The page guide says "This is a core selling point, not a tucked-away feature." Moving calibration to a dedicated Step 3 with narrative space, themed avatar, and dialogue treatment fulfils this intent completely.

**Preset progression preview:** The page guide says "Shows expected gates / progression paths." The spec delivers `ProgressionPreview` with D-014 tier timeline and `highlightLevel`. This matches.

**Description field prominence:** The page guide says "Description is user-facing, keep prominent." The spec places it in Step 1 (Identity) directly below the name input. This is correct.

**Avatar treatments per theme:** The page guide specifies Minimal (clean dialog, no character), Retro (sage, typewriter, in-character), Modern (AI entity, holographic, clinical). The spec's `ArbiterAvatar` treatments match these descriptions precisely.

**One divergence (informational):** The page guide says the Arbiter "assesses the user's level and designs their progression path" — implying the Arbiter produces gate descriptions. The spec's calibration result shows `suggested_level` and `rationale` (from the existing API), which does not include per-gate descriptions. The page guide's vision of "designing their progression path" is partially delivered. This is an acceptable scope limitation (gate descriptions are out of scope per the Out of Scope section) and does not constitute a UX failure, but it is worth noting for future iterations.

---

## Findings

### MAJOR — None

### MINOR-1 — Redirect target after "Create Skill" is unspecified

The spec states the "Create Skill" button "creates and redirects" but does not name the destination route. The standard and expected redirect is to the new skill's detail page (`/skills/{id}`). This must be explicit in the spec to avoid implementer ambiguity.

**Fix:** Add to the Step 3 flow description: "On successful creation, redirect to `/skills/{id}` (the newly created skill's detail page)."

### MINOR-2 — Step indicator AC missing: must be hidden on path selector screen

The spec and ACs describe the step indicator showing "Identity / Appraisal / The Arbiter" (ACV-6) but do not state that the indicator must be suppressed when the user is on the path selector pre-step. Rendering the step indicator before a path is chosen is meaningless and likely confusing.

**Fix:** Add an AC: "Step indicator is not rendered on the path selector screen. It appears only after a path has been chosen (Step 1 onwards)."

### MINOR-3 — Level picker control type unspecified; mobile viability at risk

The spec describes a "scrollable list, 1–50" but does not specify the picker widget. A naive implementation as 50 tappable list items would be unusable on mobile. A native `<input type="number" min="1" max="50">` is accessible but minimal; a scroll-wheel picker is more on-theme.

**Fix:** Add to the Step 2 specification: state the picker control type explicitly. Recommended: a scroll-wheel or stepper widget, not a bare list of 50 items.

### MINOR-4 — Calibration result default selection not specified

After the Arbiter returns a result, the user can "Accept suggestion (Level {N})" or "Keep my level (Level {current})." The spec does not state which is pre-selected. If the user clicks "Create Skill" without explicitly choosing, the flow is ambiguous.

**Fix:** Add to the Step 3 flow: "The Arbiter's suggested level is pre-selected by default when calibration results appear. 'Keep my level' is an explicit opt-out that updates the final level to the picker value from Step 2."

### MINOR-5 — ArbiterDialogue screen reader behaviour unspecified

Progressive text reveal (typewriter / scan-line) must not be implemented by inserting DOM characters sequentially, as this produces an unusable screen reader experience. The spec does not address this.

**Fix:** Add an AC: "ArbiterDialogue renders its full `text` content in the DOM immediately. Visual reveal animations are applied via CSS (clip, opacity, overlay) — not via progressive DOM insertion. The component is announced as a single unit by screen readers."

### MINOR-6 — ArbiterDialogue `aria-live` region not specified

When calibration results appear, screen reader users need to be notified without the result being in a DOM location they have already passed.

**Fix:** Add to the ArbiterDialogue component spec: "The dialogue container uses `aria-live='polite'` so new text content is announced to screen readers when it appears."

### MINOR-7 — Presets gallery loading state not specified

The spec covers the empty state and zero-search-result state for the preset gallery, but not the loading state while `GET /api/v1/presets` is in flight.

**Fix:** Add to the Step 1 (Preset path) flow: "While presets are loading, the gallery shows a skeleton layout (3–6 placeholder cards). If the API call fails, show an error message with a retry option."

### MINOR-8 — `prefers-reduced-motion` behaviour for Retro typewriter is implicit

ACV-21 covers `prefers-reduced-motion` and `--motion-scale` compliance, but does not state what the typewriter and scan-line effects look like when motion is reduced (the text cannot reveal character-by-character).

**Fix:** Expand ACV-21 or add a companion note: "When `prefers-reduced-motion: reduce` is active, ArbiterDialogue renders text as immediately visible (no character-by-character or scan-line reveal) regardless of theme or `--motion-scale` value."
