# Implementation Plan — Theme Foundation (F-023 Phase 0)

**Spec:** `docs/specs/2026-03-22-theme-foundation/spec.md`
**Gateway:** GO
**Type:** visual
**Date:** 2026-03-22

---

## Execution Summary

No T1 (tester) task — `type: visual` per D-036. Five execution groups based on the Parallelisation Map from arch-review.md. All work is frontend agent scope.

## Style Guide References (for frontend agent and reviewer)

- `Documentation/style-guide/shared.md`
- `Documentation/style-guide/minimal.md`
- `Documentation/style-guide/retro.md`
- `Documentation/style-guide/modern.md`

---

## Tasks

### Group A — Foundation (parallel)

#### T1: Update base.css
**Owner:** frontend
**ACs:** AC-1, AC-2, AC-3
**File:** `packages/ui/tokens/base.css`
**Steps:**
1. Read current `base.css`
2. Ensure shadow tokens exist: `--shadow-sm`, `--shadow-md`, `--shadow-lg`
3. Verify radius tokens exist: `--radius-sm`, `--radius-md`, `--radius-lg`
4. Confirm no colour or font tokens are defined (those are theme-specific)
5. Clean up any tokens that should move to theme files

#### T2: Create three theme CSS files (draft)
**Owner:** frontend
**ACs:** AC-4, AC-5, AC-6, AC-7, AC-8, AC-8b, AC-9, AC-37
**Files to create:** `packages/ui/tokens/minimal.css`, `packages/ui/tokens/retro.css`, `packages/ui/tokens/modern.css`
**Steps:**
1. Read `style-guide/shared.md` for required token categories
2. Read `style-guide/minimal.md`, `retro.md`, `modern.md` for palette/typography/motion values
3. Read existing `rpg-game.css` and `rpg-clean.css` for reference (token naming patterns, completeness)
4. Create `minimal.css` scoped to `[data-theme="minimal"]`:
   - Light palette (#ffffff bg, #f8f9fa surface, #1a1a2e text)
   - Typography: `--font-display: var(--font-inter)`, `--font-body: var(--font-inter)`, `--font-mono`
   - `--motion-scale: 0.3`
   - Radii, shadows (can override base.css values for theme-specific feel)
   - XP bar tokens
5. Create `retro.css` scoped to `[data-theme="retro"]`:
   - Dark palette (#0a0a12 bg, #1a1a2e surface, #e8e0d0 text, #d4a853 accent, #6b21a8 secondary)
   - Typography: `--font-display: var(--font-press-start)`, `--font-body: var(--font-space-grotesk)`, `--font-mono`
   - `--motion-scale: 0.7`
   - XP bar tokens (gold gradient)
6. Create `modern.css` scoped to `[data-theme="modern"]`:
   - Dark navy palette (#0a0e1a bg, rgba surface, #e2e8f0 text, #00d4ff accent, #e040fb secondary)
   - Typography: `--font-display: var(--font-rajdhani)`, `--font-body: var(--font-space-grotesk)`, `--font-mono`
   - `--motion-scale: 1.0`
   - XP bar tokens (cyan gradient)
7. Add `@media (prefers-reduced-motion: reduce)` rule in each theme file (or in `base.css`) that sets `--motion-scale: 0` to override theme defaults when the user's OS prefers reduced motion (AC-37)
8. Verify: `grep -r 'prefers-reduced-motion' packages/ui/tokens/` returns at least one match

#### T3: Font loading
**Owner:** frontend
**ACs:** AC-11, AC-12, AC-13, AC-14
**File:** `apps/rpg-tracker/app/layout.tsx`
**Steps:**
1. Read current `layout.tsx`
2. Import `next/font/google` for: Inter, Press_Start_2P, Space_Grotesk, Rajdhani
3. Configure each with `display: 'swap'` and appropriate weights:
   - Inter: 400, 500, 700, 900
   - Press Start 2P: 400 (single weight)
   - Space Grotesk: 400, 500, 600, 700
   - Rajdhani: 400, 500, 600, 700
4. Set font CSS variables on `<html>` via className or style attribute:
   - `--font-inter`, `--font-press-start`, `--font-space-grotesk`, `--font-rajdhani`
5. Verify theme CSS files reference these variables in `--font-display` and `--font-body`

---

### Group B — ThemeProvider + finalise tokens (sequential after Group A)

#### T4: Update ThemeProvider
**Owner:** frontend
**ACs:** AC-15, AC-16, AC-17, AC-18, AC-18b, AC-18c, AC-19
**File:** `packages/ui/src/ThemeProvider.tsx`
**Steps:**
1. Read current ThemeProvider
2. Change `Theme` type to `'minimal' | 'retro' | 'modern'`
3. Add `VALID_THEMES` constant array for validation
4. Add cookie migration guard: if cookie value not in `VALID_THEMES`, fall back to `'minimal'`, overwrite cookie
5. Export `setTheme(theme: Theme)` function that:
   - Validates theme is in `VALID_THEMES`
   - Sets `document.documentElement.setAttribute('data-theme', theme)`
   - Sets `rpgt-theme` cookie with 1-year expiry
6. Ensure server-side theme application path is preserved (AC-18c — middleware reads cookie, not ThemeProvider)
7. Update `layout.tsx` fallback from `'rpg-game'` to `'minimal'`
8. Verify: `grep -r 'rpg-game' apps/rpg-tracker/app/layout.tsx` returns zero results

---

### Group C — Components + atmosphere (parallel, after Group B)

#### T5: Theme switcher component
**Owner:** frontend
**ACs:** AC-20, AC-21, AC-22, AC-23
**File to create:** `packages/ui/src/ThemeSwitcher.tsx`
**Steps:**
1. Create ThemeSwitcher component accepting optional `className` prop
2. Render three theme options: Minimal, Retro, Modern
3. Each option: minimum 44x44px interactive area, shows theme name
4. Active theme gets distinct visual state (highlighted border or similar)
5. Active state reflects resolved theme from ThemeProvider, not raw cookie
6. onClick calls `setTheme()` — immediate update, no reload
7. Export from `packages/ui/src/index.ts`
8. Verify: `grep 'ThemeSwitcher' packages/ui/src/index.ts` returns a match

#### T6: Background atmosphere system
**Owner:** frontend
**ACs:** AC-24, AC-25, AC-26, AC-27, AC-28
**File:** `packages/ui/tokens/components.css` (create) + `apps/rpg-tracker/app/(app)/layout.tsx`
**Steps:**
1. Create `components.css` with atmosphere rules:
   - `[data-theme="minimal"]` body: clean white bg, no patterns
   - `[data-theme="retro"]` body: dark bg with scanline overlay via `::after` pseudo-element using `repeating-linear-gradient`
   - `[data-theme="modern"]` body: dark navy with subtle directional gradient
2. Apply atmosphere at layout level — add class to `(app)/layout.tsx` wrapper or body
3. All CSS-only, no image assets

#### T7: Glassmorphism utilities
**Owner:** frontend
**ACs:** AC-29, AC-30, AC-31, AC-32
**File:** `packages/ui/tokens/components.css` (same file as T6)
**Steps:**
1. Add Modern-only glassmorphism rules in `components.css`:
   - `[data-theme="modern"] .card` — `backdrop-filter: blur(12px)`, semi-transparent bg, cyan-tinted border
   - `[data-theme="modern"] .modal` — same treatment
   - `[data-theme="modern"] .nav-panel` — same treatment
2. Add `@supports not (backdrop-filter: blur(1px))` fallback with solid `--color-surface` background
3. Ensure selectors are scoped to `[data-theme="modern"]` only — no effect on Minimal or Retro

---

### Group D — Wiring (sequential after Group C)

#### T8: App wiring + old theme removal
**Owner:** frontend
**ACs:** AC-10, AC-33, AC-34, AC-35, AC-36
**Files:**
- `apps/rpg-tracker/tokens.css` — replace imports
- `apps/rpg-tracker/proxy.ts` — change default theme
- `apps/nutri-log/proxy.ts` — change default theme
- `apps/mental-health/proxy.ts` — change default theme
**Steps:**
1. Update `tokens.css`: remove `rpg-game.css` and `rpg-clean.css` imports, add `minimal.css`, `retro.css`, `modern.css`, `components.css`
2. Update `apps/rpg-tracker/proxy.ts`: `defaultTheme: 'minimal'`
3. Update `apps/nutri-log/proxy.ts`: `defaultTheme: 'minimal'`
4. Update `apps/mental-health/proxy.ts`: `defaultTheme: 'minimal'`
5. Delete `packages/ui/tokens/rpg-game.css` and `rpg-clean.css`
6. Run `grep -r 'rpg-game\|rpg-clean'` across repo — fix any remaining references
7. Verify TypeScript compilation passes for all three apps
8. Smoke test: start dev server, navigate to `/dashboard`, switch between all three themes via ThemeSwitcher (or manual cookie edit if switcher not yet wired into a page). Confirm: `data-theme` attribute updates on `<html>`, no console errors, CSS custom properties resolve to theme-specific values

---

### Group E — Test updates (after Group D)

#### T9: Update existing tests for new theme names
**Owner:** frontend
**ACs:** AC-10 (test portion), AC-37
**Files:**
- `packages/ui/src/__tests__/ThemeProvider.test.tsx`
- `packages/ui/src/useMotionPreference.test.ts`
- `packages/ui/src/SkillCard.test.tsx`
- `packages/ui/src/StatCard.test.tsx`
- `packages/ui/src/ActivityFeedItem.test.tsx`
- `packages/ui/src/useMotionPreference.ts` (JSDoc update)
**Steps:**
1. Replace all `'rpg-game'` references with `'retro'` (closest mapping)
2. Replace all `'rpg-clean'` references with `'minimal'` (closest mapping)
3. Update motion-scale expectations: `rpg-clean` had `--motion-scale: 0` → `minimal` has `0.3`, update assertions accordingly
4. Update describe block names (e.g., "rpg-clean instant transitions" → "minimal reduced motion")
5. Update JSDoc in `useMotionPreference.ts`
6. Run full test suite — all tests must pass

---

### Group F — Visual Review (after Group E)

#### T10: Visual review gate
**Owner:** reviewer (Visual Review mode)
**ACs:** All (AC-1 through AC-37)
**Review inputs:**
- `docs/plans/2026-03-22-theme-foundation/plan.md` (this file)
- All source files listed in the file manifest
- Style guides: `Documentation/style-guide/shared.md`, `minimal.md`, `retro.md`, `modern.md`
**Review checks:**
- Design token usage (no hardcoded values)
- Theme compatibility (all three themes render)
- Accessibility (contrast ratios, touch targets, motion preferences)
- Three-layer architecture compliance (Layer 1 before Layer 2)
- Cookie migration guard present
- No old theme name references remaining

---

## Execution Order Summary

```
Group A: T1 + T2 + T3  (parallel — base.css, theme files draft, font loading)
    ↓
Group B: T4             (ThemeProvider — depends on Theme type for everything downstream)
    ↓
Group C: T5 + T6 + T7  (parallel — switcher, atmosphere, glassmorphism)
    ↓
Group D: T8             (wiring — imports, proxy updates, old file deletion)
    ↓
Group E: T9             (test updates — must follow type change)
    ↓
Group F: T10            (visual review gate)
```

## Notes

- **No T1 tester task.** `type: visual` per D-036. Existing tests are updated (T9) to not break, but no new tests are written for visual work.
- **No backend tasks.** No API or schema changes.
- **nutri-saas.css and mental-calm.css** are left in place — they are scaffold themes for future app theming and are not consumed by rpg-tracker. They are not removed in this phase.
