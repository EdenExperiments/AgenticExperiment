# Code Gate Review — site-wide-ui-overhaul

## Verdict: GO

## AC Checklist

### Layout (AC-01 to AC-08)
- [x] AC-01: `(app)/layout.tsx` content wrapper uses `max-w-[1500px] w-[90%] mx-auto`. No child page sets `max-w-2xl`.
- [x] AC-02: Dashboard stats grid uses `grid-cols-2 md:grid-cols-4`.
- [x] AC-03: Dashboard skills grid (`md:grid-cols-2 lg:grid-cols-3`) appears before activity feed in DOM.
- [x] AC-04: Skills list uses `grid grid-cols-1 md:grid-cols-[repeat(auto-fill,minmax(320px,1fr))]`.
- [x] AC-05: Skill detail uses Option B — hero section + `grid grid-cols-1 md:grid-cols-2` detail grid. History spans `md:col-span-2` when no chart data.
- [x] AC-06: Account page uses `data-testid="settings-grid"` with `grid-cols-1 md:grid-cols-2`.
- [x] AC-07: All pages use single-column base with responsive breakpoints (verified by class structure).
- [x] AC-08: Skill create/edit use `max-w-xl mx-auto` within the outer container.

### Colour Migration (AC-09 to AC-13a)
- [x] AC-09: SkillCard has zero hardcoded orange-* classes. Streak badge uses `--color-accent-muted` / `--color-accent`.
- [x] AC-10: Account page has zero hardcoded gray-* classes.
- [x] AC-11: Password page has zero `dark:bg-gray-*` or `dark:border-gray-*` classes.
- [x] AC-12: API key page has zero `dark:bg-gray-*` or `dark:border-gray-*` classes.
- [x] AC-13: Full grep returns zero matches for `(bg|text|border)-(gray|orange|amber|red|blue|green)-\d` in non-protected source files. Only XPProgressBar.tsx and TierBadge.tsx (protected, D-020 tier maps) retain Tailwind colour utilities.
- [x] AC-13a: Dashboard loading skeletons use `var(--color-bg-elevated)` inline styles.

### Hover & Motion (AC-14 to AC-17)
- [x] AC-14: SkillCard has `[@media(hover:hover)]:hover:-translate-y-0.5`, `[@media(hover:hover)]:hover:shadow-lg`, `focus-visible:outline-[var(--color-accent)]`, motion-scale gated transition.
- [x] AC-15: StatCard has matching hover/focus/motion-scale implementation.
- [x] AC-16: ActivityFeedItem has `hover:bg-[var(--color-bg-elevated)]` with motion-scale gated transition.
- [x] AC-17: All transitions use `calc(var(--duration-fast, 150ms) * var(--motion-scale, 1))` — 0ms when scale=0 (rpg-clean).

### Visual Quality (AC-18 to AC-19)
- [x] AC-18: All page section headers use `fontFamily: var(--font-display, ...)` inline style.
- [x] AC-19: Primary cards use `var(--color-bg-elevated)` background with `var(--color-border)` border.

### No-Regression (AC-20)
- [x] AC-20: `git diff main..HEAD` shows zero changes to BlockerGateSection.tsx, XPBarChart.tsx, GateVerdictCard.tsx, TierBadge.tsx, XPProgressBar.tsx.

### Manual QA (deferred)
- [ ] AC-21: Visual match to landing page quality bar (requires browser inspection)
- [ ] AC-23: Hover contrast ratio WCAG AA check (requires devtools)

### Accessibility (AC-22)
- [x] AC-22: SkillCard has `min-h-[44px]` on clickable wrapper.

### Binding Decisions (AC-24 to AC-26)
- [x] AC-24: D-020 tier colour system preserved — `.tier-accent-*` and tier maps in XPProgressBar/TierBadge unchanged.
- [x] AC-25: D-021 gate layout preserved — BlockerGateSection unmodified.
- [x] AC-26: D-017 navigation preserved — BottomTabBar and Sidebar unmodified.

## Issues Found

1. **FIXED during review:** SkillStreakBadge, SkillCard lock icon, GateSubmissionForm, and skills/new page had remaining hardcoded colour classes caught by AC-13 grep. All fixed in commit `cf6fb9b`.

## Protected Component Check

| Component | Modified? | Status |
|-----------|-----------|--------|
| BlockerGateSection | No | OK |
| XPBarChart | No | OK |
| GateVerdictCard | No | OK |
| TierBadge | No | OK |
| XPProgressBar | No | OK |

## Test Quality Assessment

- **170 tests total** (56 app + 114 UI), all passing
- Tests use meaningful assertions: DOM structure queries (`data-testid`), class inspection, inline style verification, full HTML scanning for forbidden patterns
- AC-10/11/12 tests scan `container.innerHTML` for forbidden colour patterns — impossible to fake
- AC-13a tests verify loading skeleton uses CSS variable tokens
- AC-14/15/17 tests verify motion-scale gating in transition strings
- No superficial `toBeTruthy()` or snapshot-only tests found

## Notes

- GateSubmissionForm.tsx was colour-migrated (not in protected list) — all semantic red/blue colours now use CSS variables
- Auth pages (login, register) also fully migrated despite being outside `(app)` route group — per user instruction "convert ALL colours in ALL areas"
- SkillStreakBadge.tsx migrated to CSS variables for consistency, though not currently imported by any page component
