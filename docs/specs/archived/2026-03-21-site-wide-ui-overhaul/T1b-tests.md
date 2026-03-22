## Test Files Written

- apps/rpg-tracker/app/__tests__/dashboard.test.tsx
- apps/rpg-tracker/app/__tests__/skills-list.test.tsx
- apps/rpg-tracker/app/__tests__/skill-detail.test.tsx
- apps/rpg-tracker/app/__tests__/skill-create.test.tsx
- apps/rpg-tracker/app/__tests__/account.test.tsx

## Coverage Map

- AC-02 (stats 4-col grid on desktop) → dashboard.test.tsx:218 "AC-02: stats container has md:grid-cols-4 class"
- AC-03 (skills multi-col + activity below) → dashboard.test.tsx:228 "AC-03: skills grid appears before activity feed in DOM order"
- AC-03 (skills multi-col grid class) → dashboard.test.tsx:243 "AC-03: skills section uses multi-column grid class on desktop"
- AC-04 (skills list CSS Grid) → skills-list.test.tsx:145 "AC-04: skills container has CSS grid class for multi-column desktop layout"
- AC-05 (hero section full-width) → skill-detail.test.tsx:91 "AC-05: hero section exists at full width containing skill name and tier"
- AC-05 (two-column detail grid with chart) → skill-detail.test.tsx:100 "AC-05: two-column detail grid exists below hero when XP chart data is present"
- AC-05 (history col-span-2 when chart absent) → skill-detail.test.tsx:113 "AC-05: history section gets col-span-2 when no XP chart data"
- AC-06 (account 2-col grid) → account.test.tsx:40 "AC-06: account page settings container has md:grid-cols-2 class"
- AC-08 (skill create mx-auto centering) → skill-create.test.tsx:40 "AC-08: form container has mx-auto centering class"
- AC-08 (skill create max-w-xl or max-w-2xl) → skill-create.test.tsx:48 "AC-08: form container uses max-w-xl or max-w-2xl"
- AC-10 (account page no gray- classes) → account.test.tsx:54 "AC-10: account page rendered HTML contains no hardcoded gray- colour classes"
- AC-11 (password page no dark:bg-gray-*) → account.test.tsx:65 "AC-11: password page rendered HTML contains no dark:bg-gray-* or dark:border-gray-* classes"
- AC-12 (api-key page no dark:bg-gray-*) → account.test.tsx:72 "AC-12: api-key page rendered HTML contains no dark:bg-gray-* or dark:border-gray-* classes"
- AC-13 (no hardcoded colour classes) → covered by AC-10, AC-11, AC-12 per-page scans; full sweep is T4 shell verification
- AC-13a (loading skeleton no bg-gray-*) → dashboard.test.tsx:255 "AC-13a: loading skeleton uses CSS variable tokens — no bg-gray-* classes"
- AC-18 (section headers use var(--font-display)) → dashboard.test.tsx:264, skills-list.test.tsx:161, skill-detail.test.tsx:122, account.test.tsx:79

## Red State Confirmed

14 new tests fail against current code. 26 existing tests continue to pass.
Failing: AC-02, AC-03 (×2), AC-04, AC-05 (×3), AC-06, AC-08 (×1 of 2), AC-10, AC-11, AC-12, AC-18 (account).

## Notes

- AC-18 for dashboard h1/h2 already passes (existing code uses var(--font-display) on headings) — this AC is pre-satisfied for dashboard and skills-list. The account page AC-18 fails because the h1 uses `text-gray-900 dark:text-white` without font-display.
- AC-08 mx-auto test passes because existing `max-w-lg mx-auto` already has mx-auto — the failing test is the one asserting it is NOT max-w-lg.
- AC-20 (no regressions on protected components) is verified by T4 shell grep, not vitest assertions, per plan.md.
