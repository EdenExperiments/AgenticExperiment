# Theme Foundation — Spec

**Status:** SHIPPED
**Feature:** F-023 (Three-theme system) — Phase 0
**Type:** visual
**Date:** 2026-03-22

---

## Summary

Replace the two-theme system (`rpg-game` / `rpg-clean`) with three distinct themes: **Minimal**, **Retro**, and **Modern**. This phase builds the CSS infrastructure only — no page-specific restyling.

## Motivation

The current two themes were transitional (`rpg-game` = dark/gold, `rpg-clean` = dark/indigo). The product vision (D-035) calls for three fundamentally different design languages:

- **Minimal** — Light, data-forward, productivity-tool. Default for new users.
- **Retro** — Dark, warm amber/gold, pixel-art accents, RPG narrative.
- **Modern** — Dark navy, cyan/magenta neon, glassmorphism, sci-fi command centre.

## Zones Touched

| Zone | Paths | Changes |
|------|-------|---------|
| Shared UI (packages/ui) | `packages/ui/tokens/`, `packages/ui/src/` | New theme CSS files, updated ThemeProvider, new ThemeSwitcher component, glassmorphism utilities, background atmosphere |
| RPG Tracker app | `apps/rpg-tracker/` | Font loading via `next/font`, tokens.css imports, layout updates |
| Auth package | `packages/auth/src/middleware.ts` | Default theme cookie: `minimal` instead of `rpg-game` (logic sub-task — verify via grep/compilation) |
| NutriLog app | `apps/nutri-log/proxy.ts` | Change `defaultTheme: 'nutri-saas'` → `'minimal'` (temporary until NutriLog theming) |
| MindTrack app | `apps/mental-health/proxy.ts` | Change `defaultTheme: 'mental-calm'` → `'minimal'` (temporary until MindTrack theming) |

## File Manifest

Files to **create:**
- `packages/ui/tokens/minimal.css` — Minimal theme tokens
- `packages/ui/tokens/retro.css` — Retro theme tokens
- `packages/ui/tokens/modern.css` — Modern theme tokens
- `packages/ui/tokens/components.css` — Glassmorphism utilities + background atmosphere (Layer 2 CSS)
- `packages/ui/src/ThemeSwitcher.tsx` — Theme switcher component

Files to **modify:**
- `packages/ui/tokens/base.css` — Ensure shared tokens, add shadow tokens
- `packages/ui/src/ThemeProvider.tsx` — Update `Theme` type, add `setTheme()` export
- `packages/ui/src/index.ts` — Export ThemeSwitcher and updated ThemeProvider
- `packages/ui/src/useMotionPreference.ts` — Update JSDoc theme name references
- `apps/rpg-tracker/app/layout.tsx` — Font loading via `next/font`, font CSS vars on `<html>`, change `'rpg-game'` fallback to `'minimal'`
- `apps/rpg-tracker/app/(app)/layout.tsx` — Background atmosphere class
- `apps/rpg-tracker/tokens.css` — Replace old theme imports with new
- `apps/rpg-tracker/proxy.ts` — Change `defaultTheme: 'rpg-game'` → `'minimal'`
- `apps/nutri-log/proxy.ts` — Change `defaultTheme: 'nutri-saas'` → `'minimal'`
- `apps/mental-health/proxy.ts` — Change `defaultTheme: 'mental-calm'` → `'minimal'`
- `packages/auth/src/middleware.ts` — Default cookie value `'minimal'` (if hardcoded; otherwise handled by proxy.ts callers)

Files to **update (tests — old theme name references):**
- `packages/ui/src/__tests__/ThemeProvider.test.tsx` — Rewrite for new theme names
- `packages/ui/src/useMotionPreference.test.ts` — Update `data-theme` in test setup
- `packages/ui/src/SkillCard.test.tsx` — Update theme literals and motion-scale describe blocks
- `packages/ui/src/StatCard.test.tsx` — Same
- `packages/ui/src/ActivityFeedItem.test.tsx` — Same

Files to **remove:**
- `packages/ui/tokens/rpg-game.css`
- `packages/ui/tokens/rpg-clean.css`

## Acceptance Criteria

### P0-5: Update base.css
- AC-1: `base.css` contains all shared spacing, breakpoints, and utility tokens that are theme-independent.
- AC-2: Radius tokens (`--radius-sm`, `--radius-md`, `--radius-lg`) and shadow tokens (`--shadow-sm`, `--shadow-md`, `--shadow-lg`) are defined in base.css, not in individual theme files (themes may override them).
- AC-3: No colour or font tokens in base.css — those are theme-specific.

### P0-1: Three theme CSS files
- AC-4: `minimal.css` defines all required token categories per `style-guide/shared.md`: colours (light palette), typography (Inter only), motion (`--motion-scale: 0.3`), radii, shadows.
- AC-5: `retro.css` defines all required token categories: colours (dark, amber/gold, purple secondary), typography (`Press Start 2P` display, `Space Grotesk` body), motion (`--motion-scale: 0.7`), radii, shadows.
- AC-6: `modern.css` defines all required token categories: colours (dark navy, cyan accent, magenta secondary), typography (`Rajdhani` display, `Space Grotesk` body), motion (`--motion-scale: 1.0`), radii, shadows.
- AC-7: Each theme file is scoped to `[data-theme="<name>"]` selector.
- AC-8: Token naming follows `style-guide/shared.md` — `--color-bg`, `--color-surface`, `--color-text`, `--color-muted`, `--color-accent`, `--color-accent-hover`, `--color-border`, `--color-error`, `--color-success`. Additionally: `--color-secondary` defined in Retro (deep purple) and Modern (magenta). Minimal intentionally omits `--color-secondary` — accent colour serves both roles.
- AC-8b: Each theme defines `--font-mono` (all three use `'JetBrains Mono', monospace` — inherited pattern from current themes, but explicitly declared per theme for completeness).
- AC-9: XP bar tokens (`--color-xp-fill`, `--color-xp-bg`) defined per theme as a default/single-colour bar fill. Note: D-020 tier colours are applied dynamically at the component level (JS) and override `--color-xp-fill` per tier. Phase 0 tokens provide the base styling; tier-aware colours are Phase 1 scope.
- AC-10: Old `rpg-game.css` and `rpg-clean.css` are removed. All references to old theme names in imports, code, type declarations, switch statements, cookie-value checks, and conditional logic are updated to use new theme names. This includes `ThemeProvider.tsx`, `middleware.ts`, `proxy.ts`, and any other files referencing `'rpg-game'` or `'rpg-clean'`.

### P0-2: Font loading
- AC-11: `apps/rpg-tracker/app/layout.tsx` loads four font families via `next/font`: Inter, Press Start 2P, Space Grotesk, Rajdhani.
- AC-12: Font CSS variables (`--font-inter`, `--font-press-start`, `--font-space-grotesk`, `--font-rajdhani`) are set on `<html>` element.
- AC-13: Theme CSS files reference these variables in `--font-display` and `--font-body` definitions (e.g., Retro: `--font-display: var(--font-press-start)`).
- AC-14: All fonts use `font-display: swap`. Note: Press Start 2P has no system-font analogue — the Retro theme will show a visible heading reflow on first load as the pixel font swaps in. This is expected `font-display: swap` behaviour, not a bug.

### P0-3: Updated ThemeProvider
- AC-15: `Theme` type is `'minimal' | 'retro' | 'modern'`.
- AC-16: ThemeProvider sets `data-theme` attribute on `<html>`.
- AC-17: Theme persists via `rpgt-theme` cookie (existing cookie name, 1-year expiry).
- AC-18: Default theme for new users (no cookie) is `minimal`.
- AC-18b: **Cookie migration guard.** If the stored `rpgt-theme` cookie value is not one of `'minimal' | 'retro' | 'modern'`, ThemeProvider falls back to `'minimal'` and overwrites the cookie. This handles existing users with `rpg-game` or `rpg-clean` cookies after deploy. The "no cookie" and "invalid cookie" paths use the same fallback logic.
- AC-18c: **Server-side theme application.** The auth middleware (or Next.js middleware) reads the `rpgt-theme` cookie on every request and sets `data-theme` on the server-rendered `<html>` element before the response is sent. This prevents flash-of-wrong-theme for dark-theme users on hard navigation. (This behaviour already exists in the current middleware — this AC ensures it is preserved, not accidentally broken.)
- AC-19: A `setTheme(theme: Theme)` function is exported for use by the theme switcher. It updates the cookie and the `data-theme` attribute.

### P0-4: Theme switcher component
- AC-20: `ThemeSwitcher` component in `packages/ui/src/` renders three selectable theme options. Each option has a minimum interactive area of 44x44px for mobile touch compliance (WCAG 2.5.5).
- AC-21: Each option shows the theme name. The currently active theme has a distinct visual state (e.g., highlighted border, checkmark, or filled indicator — implementation choice). The active state reflects the resolved (validated) theme, not the raw cookie value.
- AC-22: Selecting a theme calls `setTheme()`, which updates the cookie and applies immediately (no page reload).
- AC-23: Component is reusable (will be used on landing hero and account page in later phases).

### P0-7: Background atmosphere system
- AC-24: Minimal: clean white/light background, no patterns or textures.
- AC-25: Retro: scanline overlay via CSS `repeating-linear-gradient` (pseudo-element or utility class). Dark background with warm undertones.
- AC-26: Modern: subtle gradient depth (directional gradient from one corner). Dark navy. No textures.
- AC-27: Atmosphere is applied at the layout level (`(app)/layout.tsx` or equivalent), not per-page.
- AC-28: Atmosphere uses only CSS — no image assets.

### P0-6: Glassmorphism utilities
- AC-29: Theme-scoped CSS for Modern: `.card`, `.modal`, `.nav-panel` selectors under `[data-theme="modern"]` get `backdrop-filter: blur(12px)` + semi-transparent background + accent-tinted border.
- AC-30: Solid fallback for browsers without `backdrop-filter` support: uses `--color-surface` as solid background.
- AC-31: Max 2 stacked glass layers (documented as a rule, not enforced in code).
- AC-32: Glassmorphism selectors do NOT affect Minimal or Retro themes.

### Cross-cutting
- AC-33: The app loads and renders without errors on all three themes.
- AC-34: Switching themes via ThemeSwitcher changes colours, fonts, backgrounds, and motion scale across the entire app.
- AC-35: Switching themes updates `data-theme` on `<html>` and all CSS custom properties resolve to theme-specific values. Existing pages are not yet restyled to match page guides (Phase 1 scope).
- AC-36: No regressions — existing functionality (skill CRUD, XP logging, auth) works on all three themes.
- AC-37: `prefers-reduced-motion` media query is respected in addition to `--motion-scale`.

## Non-Goals (Phase 1+)

- Page-specific restyling (Phase 1)
- Theme-specific copy tone changes (Phase 8)
- Component variants / Layer 3 structural differences (Phase 1+)
- Tier colour theme-awareness (Phase 1)

## Style Guide References

- `Documentation/style-guide/shared.md` — token categories, three-layer architecture, agent rules
- `Documentation/style-guide/minimal.md` — Minimal palette, typography, density, backgrounds
- `Documentation/style-guide/retro.md` — Retro palette, typography, density, backgrounds, scanlines
- `Documentation/style-guide/modern.md` — Modern palette, typography, density, backgrounds, glassmorphism

## Decisions Referenced

- D-035: Three-theme system (architecture, three-layer approach)
- D-036: Pipeline split (this is `type: visual` work — no TDD gate)
