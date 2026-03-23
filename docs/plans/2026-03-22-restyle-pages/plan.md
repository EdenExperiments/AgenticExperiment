# Implementation Plan — Restyle Existing Pages (F-023 Phase 1)

**Spec:** `docs/specs/2026-03-22-restyle-pages/spec.md`
**Gateway:** GO
**Type:** visual
**Date:** 2026-03-22

---

## Execution Summary

No T1 (tester) task — `type: visual` per D-036. Seven execution groups based on the Parallelisation Map from arch-review.md. All work is frontend agent scope.

## Style Guide References (for frontend agent and reviewer)

- `Documentation/style-guide/shared.md`
- `Documentation/style-guide/minimal.md`
- `Documentation/style-guide/retro.md`
- `Documentation/style-guide/modern.md`
- `Documentation/page-guides/` (all 9 page guides)

---

## Pre-Implementation Verification

Before starting any task, run:
```bash
grep -r '@rpgtracker/ui' apps/nutri-log/app/ apps/mental-health/app/ --include='*.tsx' | grep -v 'ThemeProvider\|Theme'
```
If this returns matches, add canonical token aliases to `nutri-saas.css` and `mental-calm.css` before proceeding. (Expected: zero matches — verified during spec review.)

---

## Tasks

### Group A — Token Extension + Layer 2 CSS (parallel, T3 after T2)

#### T1: Extend theme CSS files
**Owner:** frontend
**ACs:** AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
**Files:**
- `packages/ui/tokens/minimal.css`
- `packages/ui/tokens/retro.css`
- `packages/ui/tokens/modern.css`
**Steps:**
1. Read `Documentation/style-guide/minimal.md`, `retro.md`, `modern.md` for exact palette values
2. Add 9 new tokens to `minimal.css` under `[data-theme="minimal"]`:
   - `--color-bg-elevated`, `--color-text-secondary`, `--color-accent-muted`, `--color-secondary` (alias to `--color-accent`), `--color-warning`, `--color-break`, `--color-border-strong`, `--color-text-inverse`, `--color-info`
   - Values must be from the Minimal light palette (e.g., `--color-bg-elevated: #ffffff`, not dark values)
3. Add same 9 tokens to `retro.css` (dark/warm palette, gold accent-muted)
4. Add same 9 tokens to `modern.css` (dark navy/cyan palette, cyan accent-muted)
5. Verify: `grep 'color-bg-elevated' packages/ui/tokens/minimal.css` returns a match (repeat for retro, modern)

#### T2: Create pages.css (Layer 2)
**Owner:** frontend
**ACs:** AC-41, AC-42, AC-43
**File to create:** `packages/ui/tokens/pages.css`
**Steps:**
1. Read all 9 page guides for theme-specific visual treatments
2. Read `Documentation/style-guide/shared.md` for Layer 2 rules
3. Create `pages.css` with theme-scoped CSS rules for:
   - **Gate mood:** `[data-theme="minimal"] .gate-section`, `[data-theme="retro"] .gate-section` (double border, warm accents), `[data-theme="modern"] .gate-section` (animated accent border, backdrop-filter)
   - **Activity history:** `[data-theme="minimal"] .activity-history`, `[data-theme="retro"] .activity-history`, `[data-theme="modern"] .activity-history` (timeline with `::before` pseudo-element)
   - **Step indicator:** Per-theme treatment for skill create steps
   - **Navigation:** Per-theme sidebar/tab treatments
   - **Auth backgrounds:** Per-theme atmospheric pseudo-elements for dark themes
   - **Stat cards:** Modern glow treatment `[data-theme="modern"] .stat-card`
   - **NutriLog placeholder:** Per-theme teaser styling
4. All rules scoped to `[data-theme="<name>"]` — no unscoped styles
5. Rules must not duplicate Layer 1 token values — only pseudo-elements, complex selectors, structural overrides

#### T3: Update tokens.css imports + remove input hack (after T2)
**Owner:** frontend
**ACs:** AC-50, AC-50b
**File:** `apps/rpg-tracker/tokens.css`
**Depends on:** T2 (pages.css must exist before it can be imported)
**Steps:**
1. Add `@import '@rpgtracker/ui/tokens/pages.css';` after the `components.css` import
2. Replace the `@layer base` input colour override (lines 12–18) with:
   ```css
   @layer base {
     input:not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]),
     textarea,
     select {
       color: var(--color-text);
       background-color: var(--color-surface);
     }
   }
   ```
3. Verify: `grep 'pages.css' apps/rpg-tracker/tokens.css` returns a match

---

### Group B — Component Token Migration (sequential after Group A)

#### T4: Migrate shared components — token names
**Owner:** frontend
**ACs:** AC-1, AC-6, AC-8, AC-10, AC-11, AC-12, AC-13, AC-14, AC-15, AC-16, AC-17, AC-18, AC-19, AC-33, AC-34, AC-38, AC-46, AC-51
**Files:** All 19 components listed in spec manifest + `GrindAnimation.tsx`
**Steps:**
1. For each component, apply the migration table from the spec:
   - `--color-bg-surface` → `--color-surface`
   - `--color-bg-base` → `--color-bg`
   - `--color-text-primary` → `--color-text`
   - `--color-text-muted` → `--color-muted`
   - `--color-danger` → `--color-error`
2. Remove all hex fallback values from `var()` calls where the token is now guaranteed to exist (e.g., `var(--color-bg-elevated, #1a1a2e)` → `var(--color-bg-elevated)`)
3. Replace hardcoded `bg-yellow-900/20` in `GateSubmissionForm.tsx` with `var(--color-warning)`
4. Replace hardcoded `#60a5fa` in `GrindAnimation.tsx` with `var(--color-break)`
5. Add theme-scoped CSS classes where needed: `.gate-section` on `BlockerGateSection`, `.activity-history` on `ActivityFeedItem` wrapper, `.stat-card` on `StatCard`
6. Apply per-theme nav treatment to `Sidebar.tsx` (add `nav-panel` class for Modern glassmorphism) and `BottomTabBar.tsx`
7. All animations use `calc(duration * var(--motion-scale))` or `@media (prefers-reduced-motion: reduce)` (AC-51)
8. Verify: `grep -r 'color-bg-surface\|color-bg-base\|color-text-primary\|color-text-muted\|color-danger' packages/ui/src/ --include='*.tsx'` returns zero matches

#### T5: Create SkillEditModal + export
**Owner:** frontend
**ACs:** AC-36, AC-37, AC-38, AC-38b, AC-39, AC-40, AC-40b
**Files:**
- `packages/ui/src/SkillEditModal.tsx` (create)
- `packages/ui/src/index.ts` (modify — add export)
**Steps:**
1. Create `SkillEditModal.tsx` accepting props: `skillId`, `skillName`, `skillDescription`, `isOpen`, `onClose`, `onUpdate`
2. Implement accessibility: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trap, ESC close, focus return on close
3. Desktop: centred modal with `--color-bg-elevated` bg, `--color-border` border, `z-50`
4. Mobile (<768px): full-width bottom sheet with `rounded-t-3xl`, `align-items: flex-start`, `min-height: var(--tap-target-min)` on buttons
5. Modern theme: apply `.modal` class for glassmorphism from `components.css`
6. Name field: `required`, submit disabled when empty
7. Error state: inline message using `--color-error` on mutation failure
8. On success: invalidate `['skill', id]` and `['skills']` query keys, close modal
9. Export from `packages/ui/src/index.ts`
10. Verify: `grep 'SkillEditModal' packages/ui/src/index.ts` returns a match

---

### Group C — RPG Tracker Page Restyling (parallel, after Group B)

#### T6: Dashboard restyle (P1-1)
**Owner:** frontend
**ACs:** AC-7, AC-8, AC-9, AC-10
**Files:**
- `apps/rpg-tracker/app/(app)/dashboard/page.tsx`
- `apps/rpg-tracker/app/(app)/layout.tsx` — activity feed sidebar layout support
**Steps:**
1. Stat cards grid: 2-col at ≥640px, 4-col at ≥1024px
2. Activity feed: CSS grid sidebar layout on desktop (>1024px): `grid-template-columns: 1fr minmax(280px, 320px)`, single column on mobile
3. Quick Log bottom sheet: restyle with theme tokens (existing bottom sheet behaviour preserved)
4. Verify all colour/font references use `var(--color-*)` and `var(--font-*)` tokens

#### T7: Skills list restyle (P1-2)
**Owner:** frontend
**ACs:** AC-11, AC-12
**File:** `apps/rpg-tracker/app/(app)/skills/page.tsx`
**Steps:**
1. Card grid: Modern cards carry `.card` class for glassmorphism
2. Toolbar: theme tokens for backgrounds/borders, `min-height: var(--tap-target-min)` on interactive elements
3. Verify token usage — no hardcoded colours

#### T8: Skill detail restyle + edit modal wiring (P1-3 + P1-10)
**Owner:** frontend
**ACs:** AC-13, AC-14, AC-15, AC-16, AC-36, AC-39, AC-40, AC-40b
**Files:**
- `apps/rpg-tracker/app/(app)/skills/[id]/page.tsx`
- `apps/rpg-tracker/app/(app)/skills/[id]/edit/page.tsx` (replace with redirect)
**Steps:**
1. Hero section: XP progress bar as first child, action buttons alongside
2. Gate section: add `.gate-section` class (Layer 2 CSS handles per-theme treatment)
3. Activity history: add `.activity-history` class, themed empty state strings
4. XP chart: theme tokens for bars, grid lines, axes
5. Edit trigger: hidden when `!skill.is_custom` (AC-40b)
6. Wire SkillEditModal: import from `@rpgtracker/ui`, open on Edit button click
7. Remove `/skills/[id]/edit/page.tsx`, replace with redirect stub:
   ```tsx
   import { redirect } from 'next/navigation'
   export default function EditRedirect({ params }: { params: { id: string } }) {
     redirect(`/skills/${params.id}`)
   }
   ```
8. Verify redirect works and no broken links remain

#### T9: Skill create restyle (P1-4)
**Owner:** frontend
**ACs:** AC-17, AC-18, AC-19
**File:** `apps/rpg-tracker/app/(app)/skills/new/page.tsx`
**Steps:**
1. Step indicator: narrative labels ("Identity", "Appraisal", "The Arbiter") in `var(--font-display)`
2. Add `.step-indicator` class for per-theme treatment from `pages.css`
3. Form inputs: `--color-surface` bg, `--color-border` borders, `--color-text` input text, `--color-text-secondary` labels
4. Focus ring: `--color-accent`

#### T10: Account + sub-pages restyle (P1-5)
**Owner:** frontend
**ACs:** AC-20, AC-21, AC-22
**Files:**
- `apps/rpg-tracker/app/(app)/account/page.tsx`
- `apps/rpg-tracker/app/(app)/account/password/page.tsx`
- `apps/rpg-tracker/app/(app)/account/api-key/page.tsx`
**Steps:**
1. Settings grid: 2-col on desktop (>768px), 1-col on mobile
2. Cards use `--color-bg-elevated`, `--color-border`
3. Sign out button: `--color-error` text/border
4. Password page: `--color-error` for validation, `--color-accent` for submit
5. API key page: `--color-surface` code background, `--font-mono` for key text

#### T11: Auth pages restyle (P1-6)
**Owner:** frontend
**ACs:** AC-23, AC-24, AC-25
**Files:**
- `apps/rpg-tracker/app/(auth)/login/page.tsx`
- `apps/rpg-tracker/app/(auth)/register/page.tsx`
**Steps:**
1. Migrate token names (already using extended names with fallbacks)
2. Page background: `--color-bg`
3. Form card: `--color-bg-elevated` bg, `--color-border` border
4. Inputs: `--color-surface` bg, `--color-text` text, `--color-text-secondary` labels
5. Auth pages inherit theme from root layout `data-theme` — no auth-specific layout needed

#### T12: NutriLog placeholder restyle (P1-8)
**Owner:** frontend
**ACs:** AC-31, AC-32
**File:** `apps/rpg-tracker/app/(app)/nutri/page.tsx`
**Steps:**
1. Replace emoji-only content with themed teaser:
   - Minimal: "Coming Soon — NutriLog" + `--color-text` heading, `--color-muted` description
   - Retro: "A New Chapter Approaches..." + `--color-accent` gold heading, `--font-display`
   - Modern: "MODULE PENDING" + `--color-accent` cyan heading, accent glow `box-shadow`
2. CSS + text only — no image assets

---

### Group D — Landing App Setup (parallel with Group A)

#### T13: Landing app dependency + fonts + ThemeProvider
**Owner:** frontend
**ACs:** AC-26, AC-27, AC-28
**Files:**
- `apps/landing/package.json`
- `apps/landing/app/layout.tsx`
**Steps:**
1. Add `"@rpgtracker/ui": "workspace:*"` to `apps/landing/package.json` dependencies
2. Run `pnpm install` to resolve workspace dependency
3. Update `apps/landing/app/layout.tsx`:
   - Load all four fonts via `next/font/google`: Inter, Press_Start_2P, Space_Grotesk, Rajdhani (replace current Cinzel + Inter setup)
   - Set font CSS variables on `<html>`: `--font-inter`, `--font-press-start`, `--font-space-grotesk`, `--font-rajdhani`
   - Add ThemeProvider wrapping the layout children
   - Import theme CSS files (minimal.css, retro.css, modern.css, components.css) via a landing-specific tokens import
4. Verify: `grep 'ThemeProvider' apps/landing/app/layout.tsx` returns a match

---

### Group E — Landing Page Restyle (sequential after Group D + Group A)

#### T14: Landing globals.css partial migration + page restyle
**Owner:** frontend
**ACs:** AC-29, AC-30, AC-30b
**Files:**
- `apps/landing/app/globals.css`
- `apps/landing/app/page.tsx`
**Steps:**
1. In `globals.css` `:root` block, replace the 6 overlapping tokens:
   - `--bg` references → `var(--color-bg)`
   - `--bg-surface` references → `var(--color-surface)`
   - `--bg-elevated` references → `var(--color-bg-elevated)`
   - `--text-primary` references → `var(--color-text)`
   - `--text-secondary` references → `var(--color-text-secondary)`
   - `--text-muted` references → `var(--color-muted)`
2. Remove the 6 declarations from `:root` block (keep all `--gold-*`, `--emerald-*`, `--sage-*` tokens)
3. Remove `.font-display` CSS class (line 53)
4. In `page.tsx`: hero heading uses `var(--font-display)`, body uses `var(--font-body)`, feature cards use `--color-bg-elevated`, CTA uses `--color-accent`
5. Preserve all landing-specific layout/animation CSS, hardcoded `rgba()` values, and `--gold-*` / `--emerald-*` / `--sage-*` references
6. Verify: `grep 'font-display.*font-family.*cinzel' apps/landing/app/globals.css` returns zero matches

---

### Group F — Test Updates (after Group C)

#### T15: Update existing tests
**Owner:** frontend
**ACs:** AC-45
**Files:**
- `packages/ui/src/SkillCard.test.tsx`
- `packages/ui/src/StatCard.test.tsx`
- `packages/ui/src/ActivityFeedItem.test.tsx`
- Any other test files affected by token migration or component changes
**Steps:**
1. Update any test assertions that reference old token names or hex fallback values
2. Update any snapshot tests affected by class name additions (`.gate-section`, `.activity-history`, `.stat-card`, `.card`, `.nav-panel`)
3. Run full test suite: `pnpm turbo test`
4. All tests must pass — no regressions

---

### Group G — Visual Review (after Groups C + E + F)

#### T16: Visual review gate
**Owner:** reviewer (Visual Review mode)
**ACs:** All (AC-1 through AC-52)
**Review inputs:**
- `docs/plans/2026-03-22-restyle-pages/plan.md` (this file)
- All source files listed in the file manifest
- Style guides: `Documentation/style-guide/shared.md`, `minimal.md`, `retro.md`, `modern.md`
- Page guides: all 9 files in `Documentation/page-guides/`
**Review checks:**
- Design token usage (no hardcoded values, no undefined tokens)
- Token migration completeness (zero old token names remaining)
- Theme compatibility (all three themes render correctly across all pages)
- Accessibility (contrast ratios, touch targets, focus states, motion preferences)
- Three-layer architecture compliance (Layer 1 tokens, Layer 2 scoped CSS, no Layer 3)
- Mobile layout preserved
- Edit modal flow (trigger hidden for presets, validation, bottom sheet on mobile)
- Landing page partial migration (6 tokens replaced, landing-local tokens preserved)

---

## Execution Order Summary

```
Group A: T1 + T2 (parallel) → T3 (after T2 — tokens.css pages.css import)
                        [Group D: T13 — landing setup, parallel with A]
    ↓
Group B: T4 + T5        (component migration + SkillEditModal, sequential after A)
    ↓
Group C: T6 + T7 + T8 + T9 + T10 + T11 + T12  (parallel — all RPG Tracker pages)
                        [Group E: T14 — landing restyle, after D + A]
    ↓
Group F: T15            (test updates — after C)
    ↓
Group G: T16            (visual review gate)
```

## Notes

- **No T1 tester task.** `type: visual` per D-036. Existing tests are updated (T15) to not break, but no new tests are written for visual work.
- **No backend tasks.** No API or schema changes.
- **Landing-local tokens preserved.** `--gold-*`, `--emerald-*`, `--sage-*` remain in `globals.css`. Full landing restyle is Phase 7.
- **NutriLog/MindTrack apps not affected.** They only import `ThemeProvider` and `Theme` type — none of the 19 migrated components.
- **GrindOverlay and PostSessionScreen** are restyled in-place. Session route extraction is Phase 2.
