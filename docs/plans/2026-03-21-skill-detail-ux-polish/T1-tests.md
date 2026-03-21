# T1 Test Manifest — skill-detail-ux-polish

## Files Written
- packages/ui/src/__tests__/BlockerGateSection.test.tsx
- packages/ui/src/__tests__/XPBarChart.test.tsx
- packages/ui/src/__tests__/GateVerdictCard.test.tsx

## Test Results (pre-implementation)

Run: `cd packages/ui && node_modules/.bin/vitest run`

```
Test Files  3 failed | 16 passed (19)
     Tests  21 failed | 74 passed (95)
  Duration  1.36s
```

All 21 new tests fail against the current implementation. All 74 pre-existing tests continue to pass.

### Failing tests summary

**BlockerGateSection.test.tsx — 8 failing:**
- renders no element with class bg-amber-50 (current: `bg-amber-50 dark:bg-amber-950/20` present)
- renders no element with a dark: breakpoint class (current: multiple `dark:*` classes present)
- renders no element with class border-amber-300 (current: `border-amber-300` present)
- does not render "future update" when firstNotifiedAt is null (current: "Gate completion is coming in a future update." is rendered)
- does not render "future update" when firstNotifiedAt is set (AC-04 second case)
- submit-gate-btn has no hardcoded bg-amber-500 class (current: `bg-amber-500` present)
- submit-gate-btn has no hardcoded hover:bg-amber-600 class (current: `hover:bg-amber-600` present)
- does not render attempt-count when attemptNumber is 0 (current: renders "Attempt 0 of ∞")
- does not render Requirements area when description is empty (current: empty paragraph renders)

**XPBarChart.test.tsx — 7 failing:**
- xp-bar-chart container lacks h-48 or min-h-[192px] (current: `h-32`)
- xp-chart-empty-state lacks min-h-[192px] (current: only `py-8`)
- no xp-chart-label elements exist (current: no x-axis labels rendered at all)
- label count ≤ 7 for 30 entries (no labels exist yet)
- label count equals data length for ≤ 7 entries (no labels exist yet)
- first bar aria-label/title lacks "—" (current: `"2026-03-01: 50 XP"` format)
- first bar title uses old YYYY-MM-DD: format (current: `"2026-03-01: 50 XP"`)

**GateVerdictCard.test.tsx — 6 failing:**
- approved verdict has green-900 class (current: `bg-green-900/20`)
- rejected verdict has red-900 class (current: `bg-red-900/20`)
- pending verdict has blue-900 class (current: `bg-blue-900/20`)
- ✅ appears as bare text node without aria-label role="img"
- ❌ appears as bare text node without aria-label role="img"
- pending state has no role="img" aria-label="Assessment pending"

## AC Coverage

- AC-01 (no hardcoded colour classes, no dark: classes) → BlockerGateSection.test.tsx:22, 30
- AC-03 (Requirements area hidden when description empty) → BlockerGateSection.test.tsx:104
- AC-04 (no "future update" copy) → BlockerGateSection.test.tsx:54, 63
- AC-05 (submit button uses CSS variable not amber-500/amber-600) → BlockerGateSection.test.tsx:71, 78
- AC-06 (attempt count hidden when attemptNumber is 0) → BlockerGateSection.test.tsx:86, 96
- AC-08 (chart container min height 192px) → XPBarChart.test.tsx:18
- AC-09 (x-axis labels, stride ≤ 7, stride clamp) → XPBarChart.test.tsx:50, 55, 65
- AC-10 (bar aria-label format "MMM D — N XP") → XPBarChart.test.tsx:79, 86
- AC-12 (empty-state min height 192px) → XPBarChart.test.tsx:30
- AC-13 (approved: no green-900) → GateVerdictCard.test.tsx:10, 18, 26
- AC-14 (rejected: no red-900) → GateVerdictCard.test.tsx:38
- AC-15 (pending: no blue-900) → GateVerdictCard.test.tsx:50
- AC-16 (emoji aria-label wrappers) → GateVerdictCard.test.tsx:63, 73, 80
- AC-20 (no border-amber-300) → BlockerGateSection.test.tsx:44
