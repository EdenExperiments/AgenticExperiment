# Spec: Skill Detail UX/UI Polish Pass
**Status:** APPROVED (arch ✓, ux ✓, gateway GO)
**Date:** 2026-03-21
**Feature slug:** skill-detail-ux-polish

---

## 1. Problem Statement

The skill detail page (`/skills/[id]`) has visual and UX deficiencies identified via screenshot review:

1. **Theme inconsistency (jarring colours):** `BlockerGateSection` uses Tailwind `dark:` media-query classes (`bg-amber-50 dark:bg-amber-950/20`) instead of the CSS variable theme system. Users with a light OS mode see a glaring amber-50 box inside a dark-fantasy `#0a0a0f` layout. This is the primary jarring-colour complaint.

2. **Gate UX is opaque:** The locked gate section does not clearly communicate what the user must *do* to clear it. The description text is present but buried; there is no visual hierarchy separating "what's locked" from "how to unlock it". The "coming in a future update" copy (D-021) is now stale — gate submission is fully implemented.

3. **XPBarChart is decorative, not readable:** At `h-32` (128px) with no axis labels, dates, or hover state, the bar chart does not function as a usable data visualisation. It has no x-axis date labels and no visible value indicators.

4. **GateVerdictCard has hardcoded dark values:** Uses `bg-green-900/20`, `bg-red-900/20` etc. instead of CSS variables, creating contrast issues on light themes.

5. **Streak copy is redundant:** "Log today to start your streak today" repeats "today" twice.

---

## 2. Goals

- Bring the skill detail page to the visual quality of the rpg-game dark-fantasy aesthetic (Cinzel display font, gold accents, deep backgrounds) — matching or exceeding the landing page bar.
- Replace all hardcoded Tailwind `dark:` classes in UI components with CSS variable equivalents.
- Make the gate locked state clearly communicate the required action, not just the blocked state.
- Make the XP chart readable and usable on any viewport.
- No API changes. No schema changes. No new backend work.

---

## 3. Out of Scope

- GateSubmissionForm redesign (separate, deeper feature)
- Rendering of future gate states beyond those currently implemented (e.g. "submission window closed", "review in progress" if a distinct state is added). This spec covers the existing states only: unlocked, first-notified, submitted (pending/approved/rejected/self_reported).
- PostSessionScreen / GrindOverlay redesign (recently shipped)
- NutriLog or MindTrack pages
- New API endpoints
- Any changes to the XP curve, tier definitions, or gate logic

---

## 4. Decision Updates Required

| Decision | Current text | Updated text | Reason |
|----------|-------------|--------------|--------|
| D-021 | "explanatory line that completion is coming in a future update" | Gate section shows: lock icon, gate title, **requirements callout** (description as primary action text), current XP accruing, display level (capped), raw level, and **Submit for Assessment CTA**. The structural rule from D-021 is preserved: the gate section **replaces** the XP progress bar (does not appear below it). | Gates are implemented — the "future update" copy is now misleading and should be replaced with actionable UX |

---

## 5. Acceptance Criteria

### 5.1 BlockerGateSection (theme fix + requirements UX)

- AC-01: `BlockerGateSection` uses **no** hardcoded Tailwind colour utility classes (`amber-50`, `amber-300`, etc.) and **no** `dark:` breakpoint classes. All colours are drawn from CSS variables (`var(--color-bg-elevated)`, `var(--color-warning)`, `var(--color-text-primary)`, etc.).
- AC-02: On rpg-game theme with an OS in **light** mode, the gate section renders on a dark surface (not a light beige box).
- AC-03: The gate section renders a visually distinct "Requirements" area that renders `description` as the prominent action callout — visually separated from the status line ("Progression Paused"). When `description` is null or an empty string, the Requirements area is hidden entirely (no empty callout box renders). Gate descriptions generated at creation time are non-empty by invariant, so this is a defensive guard only. Gate descriptions display at full length with no truncation — a 400-character max is acceptable vertical expansion on mobile for this screen.
- AC-04: The `!firstNotifiedAt` branch (gate exists but user has not yet been notified — lines 73–78 of `BlockerGateSection.tsx`) no longer renders the text `"Gate completion is coming in a future update"`. That branch may render a short informational message such as `"Your XP keeps accumulating. Once you clear this gate, progression resumes."` with no "future update" language. This is confirmed by asserting the rendered output does not contain the string `"future update"`.
- AC-05: The `Submit for Assessment` button uses `var(--color-warning)` for background colour, `var(--color-text-inverse)` for label text, and `hover:opacity-90` for its hover state — no hardcoded `hover:bg-amber-600` or equivalent.
- AC-06: Attempt count (`Attempt N of ∞`) is rendered below the Submit button when an active submission exists and `attempt_number` is ≥ 1. When `attempt_number` is 0, null, or undefined, the line is hidden — no "Attempt 0 of ∞" renders. (The `GateSubmission.attemptNumber` type is `number` so null is not expected in practice, but defensive rendering is required.)
- AC-07: *(Removed — covered by AC-01. AC-01's class-scan assertion is sufficient.)*

### 5.2 XPBarChart (readability)

- AC-08: Chart container height increases from `h-32` (128px) to a minimum of `h-48` (192px) via a style variable or named class.
- AC-09: X-axis date labels are rendered beneath the bars. Labels show abbreviated dates (e.g., `Mar 19`). The label stride is `Math.max(1, Math.floor(data.length / 7))` — so for 30 data points, every 4th bar shows a label (≤ 7 labels); for ≤ 7 data points, stride = 1 and every bar shows a label. Bars without a label still render but their label slot is empty. **The `Math.max(1, …)` clamp is required** — stride = 0 is not permitted (potential infinite loop / overflow on new skills with < 7 days of data).
- AC-10: Each bar has a `title` attribute (and `aria-label`) in the format `"MMM D — N XP"` (e.g. `"Mar 19 — 450 XP"`), replacing the current `"YYYY-MM-DD: N XP"` format. The date portion is formatted using `new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })`. This attribute is the hover tooltip on desktop and the screen-reader label.
- AC-11: The bar chart background, empty-state text, and axis label text all use CSS variables, not hardcoded colours.
- AC-12: The empty-state element (`data-testid="xp-chart-empty-state"`) renders with a minimum height of 192px (equivalent to `h-48`) so the section does not collapse. The test asserts height on this `data-testid` directly, not on `xp-bar-chart` (which is a separate DOM branch).

### 5.3 GateVerdictCard (CSS variable consistency)

- AC-13: `GateVerdictCard` replaces `bg-green-900/20 border-green-700/40 text-green-400` with `var(--color-success)` and surface variables.
- AC-14: `GateVerdictCard` replaces `bg-red-900/20 border-red-700/40 text-red-400` with `var(--color-error)` and surface variables.
- AC-15: `GateVerdictCard` replaces `bg-blue-900/20 border-blue-700/40 text-blue-400` with `var(--color-info)` and surface variables.
- AC-16: Emoji icons (`✅`, `❌`, `⟳`) are replaced with inline SVG or equivalent `aria-label`-bearing elements so screen readers do not read raw emoji names.

### 5.4 Skill Detail Page — copy & layout

- AC-17: Zero-streak copy reads `"Log today to start your streak"` (not `"Log today to start your streak today"`).
- AC-18: The XP chart section label (`Last 30 Days`) is styled using `var(--font-display)` (Cinzel on rpg-game theme) to match the visual hierarchy of the `h1` and other section headers.
- AC-19: The `BlockerGateSection` call site in `page.tsx` passes `activeGateSubmission={skill.active_gate_submission}`. The field `active_gate_submission?: GateSubmission | null` already exists on `SkillDetail` (line 102, `packages/api-client/src/types.ts`) and `GateSubmission` (line 64) matches `BlockerGateSectionProps.activeGateSubmission`. No API client type changes required.

### 5.5 Visual quality bar

- AC-20: The gate section's border colour is set via `var(--color-warning)` (e.g. `borderColor: 'var(--color-warning)'` in inline style or a CSS variable reference). No hardcoded `border-amber-300` or `dark:border-amber-*` class may be present. **Manual QA note (not a code assertion):** On rpg-game theme, the reviewer confirms the gate section reads as a blocking, high-stakes state — dark surface, gold border, not a neutral info card.
- AC-21: On rpg-game theme, the XP chart bars render in the tier colour (already done) against a dark chart surface, with muted axis labels that do not compete with bar colour.

---

## 6. Zones Touched

| Zone | Files | Agent |
|------|-------|-------|
| `packages/ui/src/` | `BlockerGateSection.tsx`, `XPBarChart.tsx`, `GateVerdictCard.tsx` | frontend (shared — coordinate) |
| `apps/rpg-tracker/app/(app)/skills/[id]/` | `page.tsx` | frontend |

**Shared package files changed:** `packages/ui/src/BlockerGateSection.tsx`, `XPBarChart.tsx`, `GateVerdictCard.tsx`
→ Parallelisation constraint: UI component changes (T2) must be committed before skill detail page changes (T3) if they change exported interfaces. Since no new props are added (only styling changes), T2 and T3 can run in parallel once T1 (failing tests) is complete.

---

## 7. Non-Goals / Constraints

- Do **not** introduce new external chart libraries (recharts, d3, nivo). Enhance the existing hand-rolled chart.
- Do **not** change `data-testid` attributes — tests depend on them.
- Do **not** change any prop interfaces for `BlockerGateSection`, `XPBarChart`, or `GateVerdictCard`. Styling only.
- Do **not** change the gate submission flow, assessment logic, or API.
- Respect `--motion-scale` — any animation added to the chart or gate section must scale by `var(--motion-scale, 0)`.
- Maintain 44px minimum tap target for all interactive elements (`--tap-target-min: 2.75rem`).

---

## 8. Test Scope

Tests for this spec are **visual / behavioural**, not logic-heavy. The tester agent should write:

- A test asserting `BlockerGateSection` renders no `bg-amber-50` or `dark:` class strings in the output (snapshot or class inspection) — covers AC-01
- A test asserting `data-testid="xp-bar-chart"` container has minimum height of 192px — covers AC-08
- A test asserting `data-testid="xp-chart-empty-state"` container has minimum height of 192px — covers AC-12
- A test asserting x-axis label elements are rendered when data is non-empty, and that label count ≤ 7 for 30-entry data — covers AC-09
- A test asserting bar `aria-label` / `title` values match `"MMM D — N XP"` format — covers AC-10
- A test confirming the string `"future update"` does NOT appear in `BlockerGateSection` rendered output — covers AC-04
- A test confirming `GateVerdictCard` rendered output does not contain the strings `green-900`, `red-900`, or `blue-900` — covers AC-13–AC-15
- A test asserting `data-testid="submit-gate-btn"` has `min-height` ≥ 44px (via class or inline style) — covers the 44px tap target constraint from Section 7 for the highest-stakes CTA on the page
- Existing `data-testid` tests (`submit-gate-btn`, `attempt-count`, `xp-bar`, `xp-bar-chart`, `xp-chart-empty-state`) must continue passing without modification

---

## 9. Open Questions

None — all design constraints derived from decision-log (D-020, D-021, D-022), CSS variable system, and screenshot review.

---

## 10. Appendix — Root Cause Analysis

**Why does the gate section look jarring on the screenshot?**

`BlockerGateSection` uses `bg-amber-50 dark:bg-amber-950/20`. These classes respond to the OS-level `prefers-color-scheme: dark` media query. The rpg-game theme's dark look is delivered via `data-theme="rpg-game"` CSS custom properties, independent of OS dark mode. If a user's OS is in light mode (or dark mode is not applied by the browser), they see `bg-amber-50` — a light beige box — inside a `#0a0a0f` dark layout. The fix is to use `var(--color-bg-elevated)` for the surface and `var(--color-warning)` for the border/accent, which respond to the data-theme attribute, not OS dark mode.
