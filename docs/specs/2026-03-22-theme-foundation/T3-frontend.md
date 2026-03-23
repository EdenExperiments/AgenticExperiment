## Status: DONE

## Files Changed

### Groups A + B (T1–T4) — previously committed
- `packages/ui/tokens/base.css` — added `--shadow-sm`, `--shadow-md`, `--shadow-lg` tokens; confirmed no colour or font tokens present (T1)
- `packages/ui/tokens/minimal.css` — created; full token set: colours (light palette), typography using `var(--font-inter)`, `--motion-scale: 0.3`, radii, shadows, XP bar, `prefers-reduced-motion` override (T2)
- `packages/ui/tokens/retro.css` — created; full token set: colours (dark amber/gold, `--color-secondary` deep purple), typography using `var(--font-press-start)` display / `var(--font-space-grotesk)` body, `--motion-scale: 0.7`, radii, shadows, XP bar gradient, `prefers-reduced-motion` override (T2)
- `packages/ui/tokens/modern.css` — created; full token set: colours (dark navy, cyan accent, magenta `--color-secondary`), typography using `var(--font-rajdhani)` display / `var(--font-space-grotesk)` body, `--motion-scale: 1.0`, radii, shadows, XP bar gradient, `prefers-reduced-motion` override (T2)
- `apps/rpg-tracker/app/layout.tsx` — added `next/font/google` imports for Inter, Press_Start_2P, Space_Grotesk, Rajdhani (all `display: 'swap'`); CSS variables set on `<html>` via `.variable` classNames; default fallback changed from `'rpg-game'` to `'minimal'` (T3, T4)
- `packages/ui/src/ThemeProvider.tsx` — `Theme` type changed to `'minimal' | 'retro' | 'modern'`; `VALID_THEMES` constant added; client-side cookie migration guard (invalid value → `'minimal'`, overwrites cookie); `setTheme()` function exported (T4)
- `packages/ui/src/index.ts` — added `setTheme`, `VALID_THEMES`, `ThemeSwitcher` to barrel exports (T4, T5)

### Group C (T5–T7)
- `packages/ui/src/ThemeSwitcher.tsx` — created; renders Minimal/Retro/Modern buttons with 44px minimum touch targets (WCAG 2.5.5); active state reads resolved `data-theme` via MutationObserver; onClick calls `setTheme()` — no reload; accepts optional `className` prop; all colours via `var(--color-*)` tokens (T5)
- `packages/ui/tokens/components.css` — created; atmosphere per theme: minimal=clean bg, retro=dark+scanline `::after` overlay using `repeating-linear-gradient`, modern=corner gradient; glassmorphism utilities `[data-theme="modern"] .card/.modal/.nav-panel` with `backdrop-filter: blur(12px)` + `@supports not` fallback to solid `--color-surface` (T6, T7)
- `apps/rpg-tracker/app/(app)/layout.tsx` — outer wrapper uses `var(--color-bg/--color-text)` inline styles; Sidebar wrapped in `<div class="nav-panel">` for glassmorphism targeting in Modern theme (T6)

### Group D (T8)
- `apps/rpg-tracker/tokens.css` — removed `rpg-game.css` and `rpg-clean.css` imports; added `minimal.css`, `retro.css`, `modern.css`, `components.css` (T8)
- `apps/rpg-tracker/proxy.ts` — `defaultTheme: 'minimal'` (T8)
- `apps/nutri-log/proxy.ts` — `defaultTheme: 'minimal'` (T8)
- `apps/mental-health/proxy.ts` — `defaultTheme: 'minimal'` (T8)
- `packages/ui/tokens/rpg-game.css` — deleted (T8)
- `packages/ui/tokens/rpg-clean.css` — deleted (T8)
- `apps/rpg-tracker/components/XPGainAnimation.tsx` — JSDoc comment updated (rpg-game/rpg-clean → retro/minimal) (T8)
- `packages/ui/src/StatCard.tsx` — JSDoc comment updated (T8)

### Group E (T9)
- `packages/ui/src/__tests__/ThemeProvider.test.tsx` — `'rpg-game'` → `'retro'`, `'rpg-clean'` → `'minimal'`, `'nutri-saas'` → `'minimal'` (T9)
- `packages/ui/src/useMotionPreference.test.ts` — `data-theme='rpg-game'` → `'retro'` (T9)
- `packages/ui/src/SkillCard.test.tsx` — describe block name + inline comment updated (T9)
- `packages/ui/src/StatCard.test.tsx` — describe block name updated (T9)
- `packages/ui/src/ActivityFeedItem.test.tsx` — describe block name updated (T9)
- `packages/ui/src/useMotionPreference.ts` — JSDoc updated: rpg-game/rpg-clean → retro/modern/minimal with correct motion-scale values (T9)

## Notes

- Font CSS variables follow the `variable` option pattern from `next/font/google`. All four font variables land on `<html>`, available everywhere in the document tree.
- `--color-xp-fill` for Retro and Modern is a gradient string. Components must apply it via `background` (not `background-color`).
- `--color-surface` in Modern is `rgba(15, 23, 42, 0.8)` — semi-transparent by design for glassmorphism. The glassmorphism rules in `components.css` use a slightly more opaque override (`rgba(15, 23, 42, 0.6)`) for the blurred layer.
- The `nav-panel` wrapper div around Sidebar in `(app)/layout.tsx` is a safe addition — Sidebar's own `aside` is `hidden md:flex w-64` so the wrapper is a transparent passthrough in normal layout. In Modern theme it receives the glassmorphism treatment.
- One intentional `rpg-game`/`rpg-clean` reference remains in `ThemeProvider.tsx` JSDoc — it names these as legacy values that trigger the migration guard. This is load-bearing documentation.
- The `@media (prefers-reduced-motion: reduce)` override that sets `--motion-scale: 0` is present in all three theme files (minimal, retro, modern) as required by AC-37.

## Test Results

All 170 tests pass (7/7 turbo tasks successful, 0 failing):
- `@rpgtracker/ui`: 116 passed
- `rpg-tracker`: 33 passed
- `@rpgtracker/landing`: 5 passed
- `@rpgtracker/api-client`: 3 passed
- `@rpgtracker/auth`: 1 passed
