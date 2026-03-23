# UX Review — Theme Foundation (F-023 Phase 0)

**Spec:** `docs/specs/2026-03-22-theme-foundation/spec.md`
**Reviewer:** UX Agent
**Date:** 2026-03-22
**Type:** Visual / CSS infrastructure

---

## Flow Correctness

The end-to-end flow is sound for an infrastructure phase. The ThemeSwitcher writes a cookie, updates `data-theme` on `<html>`, and CSS custom properties cascade immediately. No page reload means no perceptible interruption to the user.

One gap in the described flow:

**Flash of wrong theme (FOUT) during SSR/hydration.** The spec does not address this. Next.js renders on the server before the client reads `document.cookie`. If the server-side middleware does not read the `rpgt-theme` cookie and apply `data-theme` to the `<html>` element before sending the initial HTML, the browser will briefly render with the fallback (Minimal) before React hydrates and the ThemeProvider corrects it. For Minimal-as-default this is a subtle flicker. For a Retro or Modern user it is a jarring flash of a white light-mode layout followed by a dark one.

The spec references `proxy.ts` setting a `defaultTheme` but does not explicitly state that the middleware reads the existing cookie on every request and sets the `data-theme` attribute server-side. This needs to be explicit.

**Cookie read path for ThemeProvider.** AC-18 says "Default theme for new users (no cookie) is `minimal`." AC-19 says `setTheme()` updates the cookie. Neither AC explicitly states that ThemeProvider reads the cookie on mount and applies the stored theme before first paint. This is implied but should be stated to prevent an implementation that reads the cookie only after hydration.

Apart from these two gaps the flow is logical. Switching themes on the account page, observing the change propagate instantly across the app, and having the choice persist across sessions is a coherent user experience.

---

## Mobile Viability

The spec is mobile-viable in principle but has two areas that need clarification.

**ThemeSwitcher touch targets.** AC-20 says the component renders "three selectable theme options" with a distinct active state. No minimum size is specified. On mobile, each option must be at least 44x44px to meet WCAG 2.5.5 (AA Target Size). The account page guide confirms the theme picker will be a prominent, high-visibility section — but that is a Phase 1 page concern. For Phase 0, the ThemeSwitcher component itself should bake in a minimum interactive area so it is not rebuilt when placed on mobile layouts.

**ThemeSwitcher placement in Phase 0.** AC-23 says the component is "reusable (will be used on landing hero and account page in later phases)." This means Phase 0 produces a component that has no visible home in the current app yet — it is shipped but not surfaced. This is acceptable for infrastructure work but means no real-world mobile testing will happen this phase. This is a known gap, not a blocker.

**Background atmosphere on mobile.** The scanline overlay (Retro) and gradient depth (Modern) are CSS-only and perform well on mobile. The scan-line pseudo-element approach (`repeating-linear-gradient`) has no GPU cost concern at mobile screen sizes.

**Press Start 2P on mobile.** The style guide correctly notes this font is small and wide and must only be used for h1/h2 and stat values. The shared guide's typography rules already address this, and the spec inherits them. No additional mobile concern.

**Glassmorphism on mobile Safari.** `backdrop-filter: blur()` is supported on iOS Safari since 15.4. The solid fallback (AC-30) covers older devices correctly. No concern.

---

## Navigation Changes

None. This phase adds no new routes, no changes to bottom tabs or sidebar, and no back-navigation implications. The ThemeSwitcher is a component, not a route.

Confirmed: no navigation changes.

---

## Edge Cases

### 1. Old cookie value migration (`rpg-game` or `rpg-clean`)

This is the highest-risk edge case and the spec does not address it.

Users who visited the app before this deploy will have `rpgt-theme=rpg-game` or `rpgt-theme=rpg-clean` stored in their browser. After deploy, `Theme` type becomes `'minimal' | 'retro' | 'modern'`. The ThemeProvider will receive an unrecognised string.

If ThemeProvider does a direct `setAttribute('data-theme', cookieValue)` without validation, `data-theme="rpg-game"` will be set on `<html>`. No CSS selector matches it. The user sees a completely unstyled or broken layout.

The spec must explicitly require: if the stored cookie value is not one of the three valid theme names, fall back to `'minimal'` and overwrite the cookie. This is a one-line guard but it must be specified.

### 2. First visit after deploy (no cookie, new user)

AC-18 covers this. Default is `minimal`. Flow is clear.

### 3. ThemeProvider receiving undefined cookie

If the cookie is absent entirely (new user, incognito, cleared cookies), the fallback to `minimal` must be the same code path as the invalid-cookie case above. The spec implies this via AC-18 but does not make it explicit that "no cookie" and "invalid cookie value" are handled the same way. Worth stating.

### 4. setTheme() called before hydration

If a user somehow triggers a theme change before ThemeProvider has fully hydrated (e.g., keyboard shortcut, rapid interaction), `setTheme()` must be a no-op or queue the change rather than write an invalid intermediate state. Not a common scenario but should be noted in the AC.

### 5. NutriLog and MindTrack apps receiving old theme cookies

The spec changes `defaultTheme` in `nutri-log/proxy.ts` and `mental-health/proxy.ts`. However, if these apps share the same cookie domain as `rpg-tracker`, existing users may carry over an `rpg-game` or `rpg-clean` cookie value to those apps too. The same invalid-cookie guard needs to apply to all three apps, not just the RPG Tracker ThemeProvider.

### 6. ThemeSwitcher active state with no valid theme

If the cookie contains an invalid value and ThemeProvider falls back to `minimal`, the ThemeSwitcher must show `minimal` as active — not show no active state, which would confuse the user. The spec's AC-21 (active state for selected theme) should specify that the active state reflects the resolved theme, not the raw cookie value.

### 7. WCAG contrast for Minimal light theme

Minimal uses a light background (`#ffffff`, `#f8f9fa`) with `--color-text: #1a1a2e`. The shared guide mandates WCAG AA (4.5:1). Dark text on white is unambiguously compliant. The concern is `--color-muted: #6b7280` on `#ffffff` — that combination measures approximately 4.6:1, which is at the edge of AA compliance. The spec notes palette values are "directional" and final values come from implementation. The reviewer should verify `--color-muted` contrast before merge.

### 8. Font swap visible flash during initial load

All four fonts use `font-display: swap` (AC-14). On first visit, the browser renders system fonts briefly before the web fonts load. Inter is close to system sans-serif so the swap is minimal for Minimal theme. Press Start 2P has no system-font analogue — the Retro theme heading swap will be visible as a dramatic layout reflow (pixel headings are much wider and shorter than any fallback). This is a known trade-off with `font-display: swap`, not a blocker, but the spec should acknowledge it so it is not treated as a bug during visual review.

---

## Approval

CHANGES-NEEDED

- **[Required — cookie migration guard]** AC-19 or a new AC must state: if the stored `rpgt-theme` cookie value is not one of `'minimal' | 'retro' | 'modern'`, ThemeProvider falls back to `'minimal'` and overwrites the cookie. This guards against all existing users with `rpg-game` or `rpg-clean` values seeing a broken layout on deploy.

- **[Required — server-side theme application]** Add an AC explicitly stating that the auth middleware (or Next.js middleware) reads the `rpgt-theme` cookie and sets `data-theme` on the server-rendered `<html>` element before the response is sent. Without this, dark-theme users will see a Minimal flash on every hard navigation.

- **[Required — ThemeSwitcher minimum touch target]** AC-20 must specify a minimum interactive area of 44x44px per option for mobile compliance.

- **[Recommended — invalid cookie and active state]** AC-21 should clarify that the active state reflects the resolved (validated) theme, not the raw cookie value, so that a migrated user sees a consistent UI.

- **[Recommended — font swap acknowledgement]** Add a note under Font Loading that `font-display: swap` will produce a visible reflow on first load for Press Start 2P (Retro theme). This is expected behaviour, not a bug.
