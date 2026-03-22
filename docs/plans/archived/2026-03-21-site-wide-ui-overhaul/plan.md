# Implementation Plan: Site-Wide Responsive Layout & Design System Overhaul

**Spec:** `docs/specs/2026-03-21-site-wide-ui-overhaul/spec.md` (APPROVED)
**Arch review:** `docs/specs/2026-03-21-site-wide-ui-overhaul/arch-review.md` (APPROVED)
**UX review:** `docs/specs/2026-03-21-site-wide-ui-overhaul/ux-review.md` (APPROVED)
**Gateway:** `docs/specs/2026-03-21-site-wide-ui-overhaul/gateway.md` (GO)
**Date:** 2026-03-21

---

## Execution Order

Three batches derived from the architect's Parallelisation Map. T1 (tester) writes failing tests BEFORE any T2/T3 implementation in each batch. This is non-negotiable — the TDD gate must hold.

```
Batch 1 (sequential: T1 first, then T2 parallel):
  T1a: tester  — failing tests for shared components + layout container
  T2a: frontend — SkillCard colour migration + hover/focus
  T2b: frontend — StatCard hover/focus
  T2c: frontend — ActivityFeedItem hover highlight
  T2d: frontend — (app)/layout.tsx container strategy

Batch 2 (sequential: T1 first, then T2 parallel):
  T1b: tester  — failing tests for all page layouts + colour migration
  T3a: frontend — Dashboard page layout
  T3b: frontend — Skills list page layout
  T3c: frontend — Skill detail page layout (Option B)
  T3d: frontend — Skill create + edit layout
  T3e: frontend — Account page + sub-pages layout + colour migration

Batch 3 (final):
  T4:  frontend — Full colour migration grep verification + loading skeleton fix
  T5:  reviewer — Code gate review
```

---

## Task Details

### T1a: Tester — Shared Component + Layout Tests (BATCH 1)

**Agent:** tester
**ACs covered:** AC-01, AC-09, AC-14, AC-15, AC-16, AC-17, AC-19, AC-22
**Files to create/update:**
- `packages/ui/src/SkillCard.test.tsx` (update)
- `packages/ui/src/StatCard.test.tsx` (update)
- `packages/ui/src/ActivityFeedItem.test.tsx` (update)
- `apps/rpg-tracker/app/__tests__/app-layout.test.tsx` (update)

**Test quality requirements — READ CAREFULLY:**

The tester agent MUST write tests that assert the design system contract, not just DOM presence. Specifically:

1. **Colour migration tests (AC-09):**
   - DO: Assert rendered output does NOT contain hardcoded Tailwind colour classes (`orange-500`, `orange-400`, `bg-gray-700`). Use regex scan on `container.innerHTML` or rendered class strings.
   - DO: Assert that streak badge element has inline style or class referencing CSS variable (`--color-accent-muted`, `--color-accent`).
   - DO NOT: Just check "badge renders" — that proves nothing about colour correctness.

2. **Hover/focus tests (AC-14, AC-15, AC-16, AC-17):**
   - DO: Assert hover styles are inside a `@media (hover: hover)` guard. This can be tested by checking that the component's rendered styles include the media query, OR by asserting that the element has the correct Tailwind arbitrary variant class.
   - DO: Assert `:focus-visible` produces an outline with `var(--color-accent)`. Use `fireEvent.focus()` + check computed styles or class presence.
   - DO: Assert motion-scale gating by checking transition duration includes `var(--motion-scale)` or `var(--duration-fast)`.
   - DO NOT: Just check "element exists" or "className contains hover".

3. **Layout container tests (AC-01):**
   - DO: Assert the content wrapper inside `<main>` has classes matching `max-w-[1500px]` and `w-[90%]` and `mx-auto`.
   - DO: Assert no child page still renders `max-w-2xl` on its own outer container.
   - DO NOT: Just check "main element renders".

4. **Card hierarchy tests (AC-19):**
   - DO: Assert SkillCard and StatCard use `var(--color-bg-elevated)` background and `var(--color-border)` border (via inline style or class scan).
   - DO NOT: Just check "card renders children".

5. **Tap target tests (AC-22):**
   - DO: Assert SkillCard's clickable wrapper has `min-h-[44px]` class or equivalent computed style.
   - DO NOT: Skip this because "it looks big enough".

**Anti-patterns to avoid:**
- `expect(component).toBeTruthy()` — proves nothing
- `expect(screen.getByText('...')).toBeInTheDocument()` as the ONLY assertion — too shallow
- Mocking CSS modules to return empty strings — defeats the purpose of style testing
- Testing implementation details like exact pixel values that aren't in the spec

**Existing tests to update (not rewrite from scratch):**
- `SkillCard.test.tsx`: Add colour migration negative assertions + hover/focus tests alongside existing behavioural tests
- `StatCard.test.tsx`: Add hover/focus tests alongside existing CSS variable checks (which are already good)
- `ActivityFeedItem.test.tsx`: Add hover highlight test alongside existing behavioural tests
- `app-layout.test.tsx`: Add container strategy assertions alongside existing nav link tests

---

### T2a: Frontend — SkillCard Colour Migration + Hover/Focus (BATCH 1)

**Agent:** frontend
**ACs covered:** AC-09, AC-14, AC-17, AC-19, AC-22
**File:** `packages/ui/src/SkillCard.tsx`

**Changes:**
1. Replace `orange-500/20` streak badge bg → inline style `backgroundColor: 'var(--color-accent-muted)'` or Tailwind arbitrary value `bg-[var(--color-accent-muted)]`
2. Replace `orange-400` streak text → `text-[var(--color-accent)]` or inline style
3. Add hover lift: `@media (hover: hover)` guard with `hover:-translate-y-0.5` + `hover:shadow-lg`
4. Add transition: `transition-[transform,box-shadow]` with `duration-[calc(var(--duration-fast)*var(--motion-scale,0))]`
5. Add `:focus-visible` outline: `focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2`
6. Ensure card wrapper has `min-h-[44px]`
7. Ensure card background uses `var(--color-bg-elevated)` and border uses `var(--color-border)`

**Done when:** `vitest run packages/ui/src/SkillCard.test.tsx` passes all T1a assertions for AC-09, AC-14, AC-17, AC-19, AC-22.

**Constraints:**
- No new required props (arch review constraint)
- Must work in both stack and grid layouts (no fixed width)
- Must not break NutriLog/MindTrack consumers

---

### T2b: Frontend — StatCard Hover/Focus (BATCH 1)

**Agent:** frontend
**ACs covered:** AC-15, AC-17, AC-19
**File:** `packages/ui/src/StatCard.tsx`

**Changes:**
1. Add hover lift: same pattern as SkillCard (media query guard + motion-scale)
2. Add `:focus-visible` outline
3. Verify internal padding doesn't overflow at ~300px column width
4. Ensure background uses `var(--color-bg-elevated)` and border uses `var(--color-border)`

**Done when:** `vitest run packages/ui/src/StatCard.test.tsx` passes all T1a assertions for AC-15, AC-17, AC-19.

---

### T2c: Frontend — ActivityFeedItem Hover (BATCH 1)

**Agent:** frontend
**ACs covered:** AC-16, AC-17
**File:** `packages/ui/src/ActivityFeedItem.tsx`

**Changes:**
1. Add subtle hover background highlight (not full lift): `hover:bg-[var(--color-bg-elevated)]` or similar shift
2. Gate with `@media (hover: hover)` + `--motion-scale` transition
3. Review contrast against both `--color-bg-surface` and `--color-bg-elevated` backgrounds

**Done when:** `vitest run packages/ui/src/ActivityFeedItem.test.tsx` passes all T1a assertions for AC-16, AC-17.

---

### T2d: Frontend — Layout Container Strategy (BATCH 1)

**Agent:** frontend
**ACs covered:** AC-01, AC-07
**File:** `apps/rpg-tracker/app/(app)/layout.tsx`

**Changes:**
1. Add inner wrapper inside `<main>` around `{children}`: `<div className="max-w-[1500px] w-[90%] mx-auto px-4 md:px-0">`
2. Keep `flex-1` on `<main>` (sidebar/content flex relationship must stay intact)
3. Mobile: `w-[90%]` gives appropriate side padding; `px-4` as fallback at very small widths

**Done when:** `vitest run apps/rpg-tracker/app/__tests__/app-layout.test.tsx` passes all T1a assertions for AC-01.

**Implementation note (from arch review):**
The wrapper goes INSIDE `<main>`, not replacing it. The `<main>` element keeps its `flex-1` class.

---

### T1b: Tester — Page Layout + Colour Migration Tests (BATCH 2)

**Agent:** tester
**ACs covered:** AC-02, AC-03, AC-04, AC-05, AC-06, AC-07, AC-08, AC-10, AC-11, AC-12, AC-13, AC-13a, AC-18, AC-20
**Files to create/update:**
- `apps/rpg-tracker/app/__tests__/dashboard.test.tsx` (update)
- `apps/rpg-tracker/app/__tests__/skills-list.test.tsx` (update)
- `apps/rpg-tracker/app/__tests__/skill-detail.test.tsx` (update)
- `apps/rpg-tracker/app/__tests__/skill-create.test.tsx` (update)
- `apps/rpg-tracker/app/__tests__/account.test.tsx` (update)

**Test quality requirements — same standards as T1a, PLUS:**

1. **Page layout tests (AC-02 through AC-08):**
   - DO: Assert grid container has correct CSS Grid classes (`grid-cols-4`, `grid-cols-2`, `auto-fill`).
   - DO: Assert responsive collapse by checking mobile-specific classes exist (`grid-cols-1` or equivalent below `md`).
   - DO: For skill detail AC-05, assert: hero section is full-width, below hero there's a 2-column grid, chart is in left column, description+history in right column.
   - DO: For skill detail empty chart state, assert: when no chart data, history section has `col-span-2` or equivalent full-width class.
   - DO: For dashboard AC-03, assert: activity feed section comes AFTER skills grid in DOM order (not beside it in a sticky column).
   - DO NOT: Assert exact pixel widths — test class presence and DOM structure.

2. **Colour migration sweep (AC-10, AC-11, AC-12, AC-13):**
   - DO: Scan `container.innerHTML` for the forbidden pattern `(bg|text|border)-(gray|orange|amber)-\d`. Use regex.
   - DO: Exclude `.tier-accent-*` classes from the scan (D-020 binding).
   - DO NOT: Just check one specific element — scan the ENTIRE rendered output.

3. **Section header typography (AC-18):**
   - DO: Assert section headers have `font-family: var(--font-display)` via inline style or class containing `font-display` token reference.

4. **Loading skeleton colour test (AC-13a):**
   - DO: Assert `dashboard.test.tsx` scans dashboard loading state rendered HTML for forbidden `bg-gray-*` patterns.
   - DO NOT: Just check the loading spinner renders.

5. **No-regression verification (AC-20):**
   - AC-20 is verified by T4's `git diff --name-only` check on protected component files, NOT by vitest assertions. Do not write test assertions for AC-20 in T1b — this is a shell-level verification.

**Existing tests to update (not rewrite):**
- `dashboard.test.tsx`: Add grid layout + activity feed position assertions alongside existing render tests
- `skills-list.test.tsx`: Add grid layout assertions alongside existing sort/filter tests
- `skill-detail.test.tsx`: Add Option B layout structure + empty chart state tests
- `account.test.tsx`: Add 2-column grid + colour sweep + mobile collapse tests
- `skill-create.test.tsx`: Add centered container assertion

---

### T3a: Frontend — Dashboard Page Layout (BATCH 2)

**Agent:** frontend
**ACs covered:** AC-02, AC-03, AC-07, AC-13a, AC-18
**File:** `apps/rpg-tracker/app/(app)/dashboard/page.tsx`

**Changes:**
1. Remove `max-w-2xl` outer constraint
2. Stats grid: `grid-cols-2 md:grid-cols-4` (preserves 2x2 on mobile, 4-wide on desktop)
3. Skills section: CSS Grid with `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` or `auto-fill minmax(320px, 1fr)`
4. Activity feed: render BELOW skills grid (not as sticky column)
5. Section headers: add `font-family: var(--font-display)`
6. Loading skeletons: replace `bg-gray-700` with `bg-[var(--color-bg-elevated)]`
7. Empty state: ensure "Begin Your Quest" CTA doesn't use its own `max-w-2xl`

**Done when:** `vitest run apps/rpg-tracker/app/__tests__/dashboard.test.tsx` passes all T1b assertions for AC-02, AC-03, AC-13a, AC-18.

---

### T3b: Frontend — Skills List Page Layout (BATCH 2)

**Agent:** frontend
**ACs covered:** AC-04, AC-07, AC-18
**File:** `apps/rpg-tracker/app/(app)/skills/page.tsx`

**Changes:**
1. Remove `max-w-2xl` outer constraint
2. Filter bar: full width
3. Skills grid: `grid-cols-1 md:grid-cols-[repeat(auto-fill,minmax(320px,1fr))]`
4. Empty state: centered full-width CTA, no filter bar when no skills
5. Section headers: `font-family: var(--font-display)`

**Done when:** `vitest run apps/rpg-tracker/app/__tests__/skills-list.test.tsx` passes all T1b assertions for AC-04, AC-18.

---

### T3c: Frontend — Skill Detail Page Layout (BATCH 2)

**Agent:** frontend
**ACs covered:** AC-05, AC-07, AC-18
**File:** `apps/rpg-tracker/app/(app)/skills/[id]/page.tsx`

**Changes (Option B):**
1. Remove `max-w-2xl` outer constraint
2. Hero block: full-width (name, tier badge, level, streak, gate/XP bar, action buttons)
3. Below hero: 2-column CSS Grid `grid-cols-1 md:grid-cols-2`
   - Left column: XP bar chart
   - Right column: description (moved here on desktop) + activity history
4. Chart absent state: when no chart data, right column gets `md:col-span-2` to span full width
5. Delete action: full-width below the grid
6. `BlockerGateSection` and `XPProgressBar`: stay in hero block, full-width, NOT MODIFIED
7. Section headers: `font-family: var(--font-display)`

**Done when:** `vitest run apps/rpg-tracker/app/__tests__/skill-detail.test.tsx` passes all T1b assertions for AC-05, AC-18.

**Spec flexibility:** If the implementer deviates from the two-column grid spec for skill detail (e.g., different grid proportions, description placement), they must document the deviation in a `## Spec Deviations` section in their task output. T5 (reviewer) will assess whether the deviation satisfies AC-05. No AC may be silently dropped.

---

### T3d: Frontend — Skill Create + Edit Layout (BATCH 2)

**Agent:** frontend
**ACs covered:** AC-08
**Files:**
- `apps/rpg-tracker/app/(app)/skills/new/page.tsx`
- `apps/rpg-tracker/app/(app)/skills/[id]/edit/page.tsx`

**Changes:**
1. Remove any outer `max-w-lg` or `max-w-2xl` that conflicts with the layout container
2. Use `max-w-xl mx-auto` (or `max-w-2xl` if cramped) for the form container within the outer layout
3. Preserve centered alignment and multi-step form structure
4. Consider any layout improvements — wider form, better step indicators, etc. Flag if changes feel beneficial.

**Done when:** `vitest run apps/rpg-tracker/app/__tests__/skill-create.test.tsx` passes all T1b assertions for AC-08.

---

### T3e: Frontend — Account Pages Layout + Colour Migration (BATCH 2)

**Agent:** frontend
**ACs covered:** AC-06, AC-07, AC-10, AC-11, AC-12, AC-18
**Files:**
- `apps/rpg-tracker/app/(app)/account/page.tsx`
- `apps/rpg-tracker/app/(app)/account/password/page.tsx`
- `apps/rpg-tracker/app/(app)/account/api-key/page.tsx`

**Changes:**
1. Account main: remove `max-w-2xl`, use `grid-cols-1 md:grid-cols-2` for settings sections
2. Replace ALL `gray-900`, `gray-100`, `gray-200`, `gray-800` with CSS variable equivalents
3. Account password + API key: replace ALL `dark:bg-gray-800`, `dark:border-gray-700` with CSS vars
4. Section headers: `font-family: var(--font-display)`
5. Mobile: `grid-cols-1` collapse

**Done when:** `vitest run apps/rpg-tracker/app/__tests__/account.test.tsx` passes all T1b assertions for AC-06, AC-10, AC-11, AC-12, AC-18.

---

### T4: Frontend — Colour Migration Verification + Cleanup (BATCH 3)

**Agent:** frontend
**ACs covered:** AC-13 (full sweep), AC-20, AC-24, AC-25, AC-26
**All in-scope files**

**Steps:**
1. Run grep: `(bg|text|border)-(gray|orange|amber|red|blue|green)-\d` across all in-scope files
2. Exclude `.tier-accent-*` matches (D-020)
3. Fix any remaining hardcoded colours found
4. Verify `BlockerGateSection`, `XPBarChart`, `GateVerdictCard`, `TierBadge`, `XPProgressBar` files are UNMODIFIED (git diff check)
5. Verify no page still has `max-w-2xl` as outer container
6. Run full test suite to confirm all T1a + T1b tests pass

**Done when:** AC-13 grep returns zero matches (excluding `.tier-accent-*`), `git diff --name-only` confirms protected component files are unmodified (AC-20), no page has `max-w-2xl` outer container, `max-w-lg` removed from `skills/new/page.tsx` and `skills/[id]/edit/page.tsx` (R-LAYOUT-02), and full test suite passes.

---

### T5: Reviewer — Code Gate Review (BATCH 3)

**Agent:** reviewer
**All ACs**

**Review scope:**
1. Verify all 26 ACs pass (automated where possible, manual QA for AC-21, AC-23)
2. Verify no new required props added to shared components
3. Verify `@media (hover: hover)` guard on all hover effects
4. Verify `--motion-scale` gating on all transitions
5. Verify `:focus-visible` parity for all hover effects
6. Verify no regressions on protected components
7. Verify test quality — tests assert design system contracts, not just DOM presence
8. Run the AC-13 grep pattern as a final check

---

## Test Quality Gate (applies to ALL test tasks)

The tester agent must follow these rules. If a test violates them, the reviewer (T5) will reject it:

### MUST DO:
- Every AC must have at least one test assertion directly tied to it
- Colour migration tests must scan rendered HTML for forbidden patterns via regex
- Layout tests must assert CSS Grid class presence on the correct container elements
- Hover/focus tests must verify the interaction mechanism (media query, outline, motion-scale)
- Tests must use `data-testid` attributes for targeting specific layout regions

### MUST NOT DO:
- Write `expect(element).toBeTruthy()` or `toBeInTheDocument()` as the sole assertion for an AC
- Mock CSS/style processing in a way that makes colour/class assertions meaningless
- Skip tests for edge cases (empty chart, empty skills list, long skill names)
- Write tests that pass regardless of whether the implementation is correct (e.g., testing a mock return value instead of actual rendered output)
- Copy-paste the same assertion pattern across all tests without adapting to what each AC actually requires

### SPEC FLEXIBILITY:
- The implementer agents (T2, T3) are encouraged to improve the UI beyond what the spec prescribes. If an improvement makes a test assertion obsolete or wrong, the test should be updated to match the better implementation — not the other way around.
- If an implementer discovers a layout that looks better than what the spec describes, they should implement it and flag the spec deviation. The reviewer (T5) will assess whether the change is an improvement.

---

## Dependencies & Sequencing

```
T1a (failing tests) ──→ T2a, T2b, T2c, T2d (parallel)
                                    │
                                    ▼
T1b (failing tests) ──→ T3a, T3b, T3c, T3d, T3e (parallel)
                                    │
                                    ▼
                         T4 (verification) ──→ T5 (review)
```

- T1a MUST complete before ANY T2 task starts
- T1b MUST complete before ANY T3 task starts
- All T2 tasks can run in parallel
- All T3 tasks can run in parallel
- T4 runs after all T3 tasks complete
- T5 runs after T4 completes

---

## Risk Mitigations (from arch review)

| Risk | Mitigation |
|------|-----------|
| R-LAYOUT-01: Double container if page keeps `max-w-2xl` | T4 grep sweep for `max-w-2xl` in all page files |
| R-HOVER-01: Stuck hover on iOS | `@media (hover: hover)` guard in D-HOVER, verified by T1a tests |
| R-TOKEN-01: `--motion-scale` missing from rpg-clean | `var(--motion-scale, 0)` fallback; verify rpg-clean.css during T2a |
| R-LAYOUT-02: Skill create/edit inner centering | T4 grep confirms `max-w-lg` removed from form pages; `mx-auto` verified on inner form container |
| R-SHARED-01: Barrel export issues | No new components added; only modifying existing. No barrel changes needed |

---

## Prior Spec Adjustments

The skill-detail-ux-polish spec (already merged) defined the skill detail page as `max-w-2xl` single column. This overhaul supersedes that layout decision. The merged components (`BlockerGateSection`, `XPBarChart`, etc.) are protected and not modified — only the page layout around them changes.

Existing tests for these protected components remain as-is. New layout tests in T1b supplement (not replace) the existing behavioural tests.
