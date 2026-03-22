# Arch Review: skill-detail-ux-polish
**Date:** 2026-03-21
**Reviewer:** architect agent
**Spec status at review:** DRAFT-REVISED (reviewer pass 1 complete)

## Verdict

APPROVED

No schema changes. No API changes. No new service contracts. The spec is internally consistent with the existing codebase and decision-log. The parallelisation constraint in Section 6 of the spec is technically correct and is formalised below.

---

## Schema Impact

None.

The spec explicitly prohibits API changes and schema changes (Section 2 Goals, Section 3 Out of Scope). All three components under change (`BlockerGateSection`, `XPBarChart`, `GateVerdictCard`) receive data through existing props. No new fields are introduced on any type. AC-19 confirms that `active_gate_submission` already exists on `SkillDetail` (line 102 of `packages/api-client/src/types.ts`) and that `GateSubmission` (line 64) already matches `BlockerGateSectionProps.activeGateSubmission` — no migration is triggered.

---

## Service Boundaries

None changed.

No new endpoints. No modifications to existing API contracts. No changes to `packages/api-client/src/`. The frontend consumes pre-existing fields; the Go API layer is untouched.

---

## ADR

None required.

All decisions relevant to this spec are already resolved:
- CSS variable system and theme architecture: D-020 (binding colour system).
- Gate section layout rule (replaces XP bar, does not appear below it): D-021, updated by this spec to remove "future update" copy.
- Motion scaling requirement: the spec correctly references `var(--motion-scale)` in the constraints section.

The D-021 update described in Section 4 of the spec (removing "coming in a future update" language, replacing with actionable UX) is a content/copy change to an already-confirmed decision, not a new technical decision. No ADR is warranted.

---

## Shared Package Changes

The following files in `packages/ui/src/` must change:

- `packages/ui/src/BlockerGateSection.tsx` — replace hardcoded Tailwind colour classes and `dark:` breakpoint classes with CSS variable inline styles or CSS-variable-backed utility tokens. Remove the "future update" string. Restructure layout for requirements callout (AC-01 through AC-06, AC-20).
- `packages/ui/src/XPBarChart.tsx` — increase container height from `h-32` to minimum `h-48`, add x-axis date labels with stride logic, update `title`/`aria-label` format, apply CSS variables for background and text (AC-08 through AC-12, AC-21).
- `packages/ui/src/GateVerdictCard.tsx` — replace `bg-green-900/20`, `bg-red-900/20`, `bg-blue-900/20` and their border/text companions with CSS variable references. Replace raw emoji with `aria-label`-bearing SVG or `<span role="img" aria-label="...">` wrappers (AC-13 through AC-16).
- `packages/ui/src/index.ts` — **no changes required.** All three components are already exported (lines 9, 20, 25). No new exports are added; no export names change. The barrel file is stable.

---

## Parallelisation Map

### Pre-condition (must complete before any task below)

**T1 — Write failing tests** (tester agent)

The spec's test scope (Section 8) defines tests that assert against DOM output, class strings, inline styles, and aria attributes. All tests will fail against the current implementations. T1 must complete before T2 and T3 begin so the TDD gate is meaningful.

Why T1 must precede T2/T3: the tester agent's tests define the exact assertions the implementation must satisfy (class-scan for `bg-amber-50`, height assertions, label-count assertions, `aria-label` format). Writing tests after implementation defeats the TDD contract.

---

### Tasks that CAN run in parallel (after T1 is merged)

- **T2a — `BlockerGateSection.tsx` polish** (frontend): CSS variable migration, requirements callout, remove "future update" copy, Submit button styling.
- **T2b — `XPBarChart.tsx` polish** (frontend): height increase, x-axis labels, `title`/`aria-label` format, CSS variable colours.
- **T2c — `GateVerdictCard.tsx` polish** (frontend): CSS variable migration, SVG/aria icon replacements.

These three files are independent of each other. No component imports another. No shared type is being modified. All three can be worked simultaneously in a single worktree (single frontend agent) or across parallel sessions without merge conflict risk, because their file paths do not overlap.

- **T3 — `page.tsx` copy & layout fixes** (frontend): streak copy fix (AC-17), "Last 30 Days" label font (AC-18), `activeGateSubmission` prop pass-through (AC-19).

T3 can run in parallel with T2a/T2b/T2c **if and only if** no prop interface changes are made in T2a–T2c. The spec's Section 7 Non-Goals explicitly prohibits prop interface changes ("Do not change any prop interfaces"). This constraint is confirmed by inspecting the existing props:

- `BlockerGateSection` already has `activeGateSubmission?: GateSubmissionData | null` (line 18 of the current file). The call site in `page.tsx` (lines 207–215) does **not** currently pass `activeGateSubmission` or `hasApiKey` — these are missing props that AC-19 requires the call site to add. This is the one coordinating touch between T2a and T3.

**Revised ruling on T2a / T3 coordination:** T3's AC-19 requires adding `activeGateSubmission={skill.active_gate_submission}` to the `BlockerGateSection` call in `page.tsx`. Because `activeGateSubmission` already exists on the component's props interface (it is already declared in `BlockerGateSection.tsx` line 18), T3 does not depend on any T2a implementation change — the prop is already accepted. T3 can begin immediately after T1, in parallel with T2a.

---

### Tasks that MUST be sequenced (and why)

1. **T1 before T2a, T2b, T2c, T3.** Reason: TDD gate. Failing tests must exist before implementation so passing them is the completion signal.

2. **T2a, T2b, T2c before final QA pass.** Reason: the visual quality bar (AC-20, AC-21) requires manual review of all three components together in a running rpg-game theme. Individual component changes can be merged as they complete, but the QA sign-off pass requires all three to be present in the same build.

3. **All T2/T3 tasks before closing the spec.** Self-evident sequencing — no architectural risk, just process completion.

---

## Additional Risks and Observations

### Risk 1 — CSS variable availability at component render time (low)

`BlockerGateSection` and `GateVerdictCard` will switch from Tailwind utility classes to inline `style={{ color: 'var(--color-warning)' }}` or equivalent patterns. CSS variables are resolved by the browser at paint time relative to the nearest ancestor that declares them. The `data-theme="rpg-game"` attribute must be present on a DOM ancestor (confirmed by `ThemeProvider` in `packages/ui/src/ThemeProvider.tsx`) for variables to resolve. If any test environment renders a component without wrapping it in `ThemeProvider` (or without setting `data-theme`), the CSS variables will fall back to the browser default (typically `unset`), causing test assertions on colour values to behave unexpectedly. The spec's test scope (Section 8) focuses on class-string absence and DOM structure — not computed colour values — so this risk is low for the automated test suite. It is a note for the manual QA step.

### Risk 2 — XPBarChart empty-state height test (spec ambiguity resolved)

AC-12 specifies that the `data-testid="xp-chart-empty-state"` element must have minimum height of 192px, and that the test asserts height on this `data-testid` directly (not on `xp-bar-chart`). The current empty-state branch (lines 11–17 of `XPBarChart.tsx`) returns a `div` with only `py-8` padding — no explicit height. The tester agent must assert the height on the empty-state element itself. The spec is clear on this; it is recorded here to avoid implementation ambiguity.

### Risk 3 — `animate-spin` on emoji in GateVerdictCard (minor)

The current `GateVerdictCard` applies `animate-spin` to the `⟳` emoji (line 51). When this is replaced with an SVG per AC-16, the `animate-spin` class should transfer to the SVG element. If the implementer drops the animation without replacement, the pending state loses its visual "in progress" affordance. The spec does not address animation retention for this icon — the implementer should confirm intent. This is a note only; it does not block approval.

### Observation — `hasApiKey` prop not passed at call site

`BlockerGateSection` accepts `hasApiKey?: boolean` (line 19 of the component). The current `page.tsx` call site (lines 207–215) does not pass it. The spec does not mention `hasApiKey` in AC-19 or elsewhere. If the Submit button visibility is gated on `hasApiKey` in the polished implementation, the call site must also be updated. The current implementation does not gate on `hasApiKey` (line 35: `showSubmitButton = !!firstNotifiedAt && !isCleared`). Provided the prop remains optional and unused, the call site needs no change. If the implementation adds a `hasApiKey` guard, AC-19 must be updated and the call site must pass the value. No action required now; flag for implementer awareness.
