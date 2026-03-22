# Implementation Plan — skill-detail-ux-polish
**Date:** 2026-03-21
**Spec:** `docs/specs/2026-03-21-skill-detail-ux-polish/spec.md`
**Gateway:** GO

---

## Task Map

```
T1 (tester) ──────────────────────────────────────────────┐
                                                           ▼
                                          ┌── T2 (frontend: packages/ui) ──┐
                                          │                                 │
                                          └── T3 (frontend: page.tsx) ─────┘
                                                                            │
                                                                            ▼
                                                                   T4 (reviewer)
```

T1 must complete before T2 and T3 begin. T2 and T3 are independent and can run in parallel. T4 runs after both T2 and T3 are merged.

---

## T1 — Failing Tests (tester agent)

**Owner:** tester
**Depends on:** nothing
**Blocks:** T2, T3

Write failing Vitest + RTL tests from spec Section 8 ACs. All tests must FAIL against the current implementation before this task is complete — do not write passing tests.

### Tests to write

**BlockerGateSection tests** (test file: `packages/ui/src/__tests__/BlockerGateSection.test.tsx`):
- Assert rendered output contains no class strings matching `bg-amber-50` or the pattern `dark:` — covers AC-01
- Assert rendered output contains no class string `border-amber-300` — covers AC-01 / AC-20
- Assert the string `"future update"` does NOT appear in rendered output — covers AC-04
- Assert `data-testid="submit-gate-btn"` has `min-height` ≥ 44px (via class or inline style `minHeight`) — covers AC-05 + tap target
- Assert `data-testid="attempt-count"` is NOT rendered when `attemptNumber` is 0 — covers AC-06
- Assert Requirements area is not rendered when `description` is empty string — covers AC-03

**XPBarChart tests** (test file: `packages/ui/src/__tests__/XPBarChart.test.tsx`):
- Assert `data-testid="xp-bar-chart"` container has `minHeight` or class equivalent to ≥ 192px — covers AC-08
- Assert `data-testid="xp-chart-empty-state"` container has `minHeight` ≥ 192px when data is all-zero — covers AC-12
- Assert x-axis label elements are rendered when data is non-empty (at least one label element with a date string) — covers AC-09
- Assert label count ≤ 7 for a 30-entry data array — covers AC-09
- Assert label count equals data length when data has ≤ 7 entries (stride clamp to 1) — covers AC-09 edge case
- Assert first bar's `aria-label` or `title` attribute matches format `"MMM D — N XP"` (e.g. contains `"—"` and `"XP"`) — covers AC-10

**GateVerdictCard tests** (test file: `packages/ui/src/__tests__/GateVerdictCard.test.tsx`):
- Assert rendered output for `verdict="approved"` does not contain class strings `green-900`, `red-900`, or `blue-900` — covers AC-13
- Assert rendered output for `verdict="rejected"` does not contain class string `red-900` — covers AC-14
- Assert rendered output for `verdict="pending"` does not contain class string `blue-900` — covers AC-15
- Assert the raw emoji characters `✅`, `❌` do not appear as text nodes in the rendered output (they must be wrapped in elements with `aria-label`) — covers AC-16

**Existing tests:** Confirm existing tests still reference their `data-testid` values correctly. Do not modify existing test files.

---

## T2 — UI Component Polish (frontend agent, packages/ui zone)

**Owner:** frontend
**Depends on:** T1
**Runs in parallel with:** T3
**Files:** `packages/ui/src/BlockerGateSection.tsx`, `packages/ui/src/XPBarChart.tsx`, `packages/ui/src/GateVerdictCard.tsx`

> No prop interface changes. `packages/ui/src/index.ts` is not touched.

### T2a — BlockerGateSection.tsx

Replace all hardcoded Tailwind colour classes and `dark:` breakpoint classes with CSS variable references.

Key changes:
- Container: replace `rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/20` with CSS variable inline styles: `backgroundColor: 'var(--color-bg-elevated)'`, `borderColor: 'var(--color-warning)'`
- "GATE LOCKED" label: use `var(--color-warning)` for colour, not `text-amber-700 dark:text-amber-400`
- Status line ("Level N — Progression Paused"): use `var(--color-warning)` or `var(--color-text-secondary)`
- Restructure layout: add a visually distinct "Requirements" section (separate heading or callout) for the `description` field. Hide this area entirely when `description` is falsy (null/empty).
- Gate description renders at full length (no truncation).
- Submit button: use `var(--color-warning)` background, `var(--color-text-inverse)` text, `hover:opacity-90` for hover. Keep `min-h-[44px]`.
- Attempt count: hide when `attempt_number` is 0, null, or undefined.
- Remove the "future update" copy from the `!firstNotifiedAt` branch; replace with: `"Your XP keeps accumulating. Once you clear this gate, progression resumes."` (no "future update" language).
- All text colours via `var(--color-text-primary)`, `var(--color-text-secondary)`, `var(--color-text-muted)`.
- Border dividers use `var(--color-border)` or equivalent, not `border-amber-200`.

Arch note: `hasApiKey` prop is accepted but currently unused in visibility logic. Do not add a `hasApiKey` guard — leave visibility logic as `!!firstNotifiedAt && !isCleared`.

### T2b — XPBarChart.tsx

Key changes:
- Container height: increase from `h-32` to minimum `h-48` (192px). Apply to the non-empty branch's flex container.
- Empty-state container: add explicit `min-h-[192px]` to `data-testid="xp-chart-empty-state"`.
- X-axis labels: render a row of labels beneath the bar row. Stride = `Math.max(1, Math.floor(data.length / 7))`. Bars at index `i % stride === 0` show a label; others render an empty label slot. Label text: `new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })` (e.g. `Mar 19`).
- `title` and `aria-label` per bar: format as `"MMM D — N XP"` using the same locale formatter, replacing the current `"YYYY-MM-DD: N XP"` format.
- Bar background: already uses `tierColor` prop (hex value from `TIER_HEX` in page.tsx) — this is acceptable.
- Chart container background, empty-state text, axis label text: use `var(--color-text-muted)` for labels, `var(--color-bg-surface)` for any wrapper background (if a background is added to the chart panel).
- Respect `var(--motion-scale)` if any transition/animation is added to bars.

### T2c — GateVerdictCard.tsx

Key changes:
- `verdict="approved"` / `verdict="self_reported"`: replace `bg-green-900/20 border-green-700/40 text-green-400/green-300` with `var(--color-success)` (border/text) and `var(--color-bg-elevated)` (surface). Pattern: `backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--color-success)'`.
- `verdict="rejected"`: replace red-900/20 equivalents with `var(--color-error)`.
- `verdict="pending"`: replace blue-900/20 equivalents with `var(--color-info)`.
- Replace raw emoji text nodes:
  - `✅` → `<span role="img" aria-label="Gate cleared">✅</span>` (or inline SVG checkmark)
  - `❌` → `<span role="img" aria-label="Assessment rejected">❌</span>`
  - `⟳` → retain the `animate-spin` class on the replacement element. Use `<span role="img" aria-label="Assessment pending" className="animate-spin inline-block">⟳</span>` or an SVG spinner with `animate-spin`. The spinning animation must be preserved for the pending affordance.
- `aiFeedback` text and `nextRetryAt` text: use `var(--color-text-secondary)` and `var(--color-text-muted)`.

---

## T3 — Skill Detail Page Copy & Prop Fixes (frontend agent, rpg-tracker zone)

**Owner:** frontend
**Depends on:** T1
**Runs in parallel with:** T2
**File:** `apps/rpg-tracker/app/(app)/skills/[id]/page.tsx`

Changes:
1. **AC-17 — streak copy fix:** Change `"Log today to start your streak today"` (line 199) to `"Log today to start your streak"`.
2. **AC-18 — chart section header font:** Add `fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))'` inline style to the `"Last 30 Days"` `<h2>` (line 287), matching the existing pattern used by the page's main `<h1>` and section headers.
3. **AC-19 — pass activeGateSubmission:** At the `BlockerGateSection` call site (lines 207–215), add `activeGateSubmission={skill.active_gate_submission ?? null}`. The `active_gate_submission` field already exists on `SkillDetail` (types.ts line 102). No import changes required.

---

## T4 — Code Gate Review (reviewer agent)

**Owner:** reviewer
**Depends on:** T2 + T3 both merged
**Blocks:** close

Review checklist:
- All T1 tests pass
- No `dark:` class strings in `BlockerGateSection`, `XPBarChart`, or `GateVerdictCard`
- No hardcoded colour utilities (`amber-50`, `amber-300`, `green-900`, `red-900`, `blue-900`) in the three components
- `"future update"` string absent from `BlockerGateSection`
- `aria-label` present on all emoji replacements in `GateVerdictCard`
- `animate-spin` preserved on pending state icon
- `min-h-[192px]` or equivalent on both chart branches
- X-axis labels rendered with correct stride formula
- `activeGateSubmission` passed at call site in `page.tsx`
- Streak copy reads `"Log today to start your streak"` (no trailing "today")
- Manual QA note: on rpg-game theme, confirm gate section reads as dark-surface + gold border (AC-20), and chart bars read clearly against dark background (AC-21)

---

## Risk Notes (from arch-review)

1. **CSS variable test environment:** Tests assert class-string absence and DOM structure — not computed colour values. ThemeProvider wrapping not required for these test assertions.
2. **Empty-state chart height:** Must be explicitly set via `min-h-[192px]` or inline style — current `py-8` padding alone is insufficient.
3. **`animate-spin` transfer:** Must transfer to the SVG/span replacement in `GateVerdictCard` pending state.
4. **`hasApiKey` prop:** Remains optional and unused in logic — do not add gate on it.
