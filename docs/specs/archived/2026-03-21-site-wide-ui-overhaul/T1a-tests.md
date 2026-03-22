## Test Files Written
- packages/ui/src/SkillCard.test.tsx
- packages/ui/src/StatCard.test.tsx
- packages/ui/src/ActivityFeedItem.test.tsx
- apps/rpg-tracker/app/__tests__/app-layout.test.tsx

## Coverage Map
- AC-01 (layout container: max-w-[1500px] w-[90%] mx-auto wrapper inside main) → app-layout.test.tsx:14
- AC-09 (SkillCard zero hardcoded orange- classes; streak badge uses CSS vars) → SkillCard.test.tsx:101
- AC-14 (SkillCard hover lift gated by @media(hover:hover); focus-visible outline uses --color-accent) → SkillCard.test.tsx:144
- AC-15 (StatCard hover lift gated by @media(hover:hover); transition motion-scale; focus-visible outline) → StatCard.test.tsx:33
- AC-16 (ActivityFeedItem hover background class references CSS variable) → ActivityFeedItem.test.tsx:77
- AC-17 (rpg-clean instant transitions: transition uses --motion-scale gating — SkillCard) → SkillCard.test.tsx:174
- AC-17 (rpg-clean instant transitions: transition uses --motion-scale gating — StatCard) → StatCard.test.tsx:56
- AC-17 (rpg-clean instant transitions: transition uses --motion-scale gating — ActivityFeedItem) → ActivityFeedItem.test.tsx:111
- AC-19 (SkillCard primary card uses --color-bg-elevated + --color-border) → SkillCard.test.tsx:182
- AC-19 (StatCard primary card uses --color-bg-elevated + --color-border) → StatCard.test.tsx:68
- AC-22 (SkillCard clickable wrapper has min-h-[44px]) → SkillCard.test.tsx:206

## Red State Confirmed
- packages/ui: 13 tests failing, 101 passing (all failures are new T1a tests)
- apps/rpg-tracker: 4 tests failing (AC-01 container strategy), 1 passing (existing nav test)

## Notes
- AC-17 and AC-19 tests for SkillCard pass because current implementation already has
  var(--duration-fast)*var(--motion-scale) transition and --color-bg-elevated/--color-border inline styles.
  These tests correctly document the existing contract (they do not represent new work for SkillCard).
  The failing AC-17 tests are on StatCard and ActivityFeedItem, which lack the transition entirely.
- AC-19 tests for StatCard pass for the same reason — StatCard already satisfies the card hierarchy requirement.
  New work for StatCard is the hover/lift mechanism (AC-15) only.
