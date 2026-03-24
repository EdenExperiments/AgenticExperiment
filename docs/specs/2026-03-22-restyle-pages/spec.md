# Restyle Existing Pages — Spec

**Status:** SHIPPED
**Feature:** F-023 (Three-theme system) — Phase 1
**Type:** visual
**Date:** 2026-03-22

---

## Summary

Apply the three-theme token system (Minimal, Retro, Modern) from Phase 0 to all existing pages and components. Reconcile the token naming gap where components reference undefined extended tokens. Add per-theme Layer 2 CSS treatments per page guides. Convert the skill edit page to a modal overlay.

This phase is purely visual — no new API endpoints, schema changes, or new features. Elements marked NEW in page guides that require API/schema support are explicitly out of scope (see Non-Goals).

## Motivation

Phase 0 established the three-theme CSS infrastructure, but components fall back to hardcoded hex values because they reference 10 token names that do not exist in the new theme files (e.g., `--color-bg-elevated`, `--color-text-primary`, `--color-accent-muted`). Switching themes changes the atmosphere (backgrounds, fonts via `--font-display`) but card colours, text colours, and surface colours remain static across all themes. Phase 1 makes the themes fully functional by reconciling token names and restyling every existing page per its page guide.

## Token Reconciliation Strategy

Components reference 21 unique `--color-*` tokens. Theme files define 12. The gap is 10 undefined tokens (some overlap). The strategy is **migrate + extend:**

**Migrate (rename component references to canonical names):**

| Component uses | Canonical name | Reason |
|---------------|---------------|--------|
| `--color-bg-surface` | `--color-surface` | Semantic duplicate — same concept |
| `--color-bg-base` | `--color-bg` | Semantic duplicate — page background |
| `--color-text-primary` | `--color-text` | Semantic duplicate — primary text |
| `--color-text-muted` | `--color-muted` | Semantic duplicate — muted text |
| `--color-danger` | `--color-error` | Semantic duplicate — error state |

**Extend (add genuinely new tokens to all three theme files):**

| New token | Purpose | Why not a duplicate |
|-----------|---------|-------------------|
| `--color-bg-elevated` | Card/panel backgrounds (slightly raised from `--color-surface`) | Distinct shade — elevated surfaces need visual separation from flat surfaces |
| `--color-text-secondary` | Labels, secondary info (between `--color-text` and `--color-muted`) | Distinct opacity/shade level not covered by existing tokens |
| `--color-accent-muted` | Accent at reduced opacity (active nav backgrounds, streak badges) | No existing token covers low-opacity accent |
| `--color-secondary` | Secondary accent (Minimal only — Retro and Modern already define it) | Minimal needs it for completeness; can alias to `--color-accent` |
| `--color-warning` | Warning state (gate submissions, form validation) | Distinct from `--color-error`; currently hardcoded yellow |
| `--color-break` | Session break indicator | Currently hardcoded `#60a5fa` |
| `--color-border-strong` | Emphasized borders (gate sections, active states) | Stronger than `--color-border` |
| `--color-text-inverse` | Text on accent-coloured backgrounds | Needed for button text on coloured backgrounds |
| `--color-info` | Informational state (tooltips, notes) | Distinct from success/warning/error |

## Zones Touched

| Zone | Paths | Changes |
|------|-------|---------|
| Shared UI tokens | `packages/ui/tokens/` | Extend theme files, add Layer 2 page CSS |
| Shared UI components | `packages/ui/src/` | Token migration, component restyling, edit modal component |
| RPG Tracker app | `apps/rpg-tracker/app/` | Page-level restyling, layout adjustments, edit route removal |
| Landing app | `apps/landing/app/` | Theme-aware restyling of existing sections |

## File Manifest

Files to **modify (theme tokens):**
- `packages/ui/tokens/minimal.css` — Add extended tokens per table above
- `packages/ui/tokens/retro.css` — Add extended tokens per table above
- `packages/ui/tokens/modern.css` — Add extended tokens per table above

Files to **create:**
- `packages/ui/tokens/pages.css` — Layer 2 page-level theme CSS: gate mood treatments, activity history styles, navigation theme treatments, form styling, nutri placeholder theming, skill create step indicator styling
- `packages/ui/src/SkillEditModal.tsx` — Modal wrapper for skill edit (replaces dedicated edit page)

Files to **modify (shared components — token migration + restyling):**
- `packages/ui/src/Sidebar.tsx` — Migrate tokens + per-theme nav treatment
- `packages/ui/src/BottomTabBar.tsx` — Migrate tokens + per-theme nav treatment
- `packages/ui/src/BlockerGateSection.tsx` — Migrate tokens + gate mood CSS classes
- `packages/ui/src/ActivityFeedItem.tsx` — Migrate tokens + activity history CSS classes
- `packages/ui/src/StatCard.tsx` — Migrate tokens + per-theme density
- `packages/ui/src/SkillCard.tsx` — Migrate tokens + per-theme card treatment
- `packages/ui/src/QuickLogSheet.tsx` — Migrate tokens + per-theme restyle (existing bottom sheet only)
- `packages/ui/src/GateSubmissionForm.tsx` — Replace hardcoded `bg-yellow-900/20` with `--color-warning` token
- `packages/ui/src/GateVerdictCard.tsx` — Migrate tokens + per-theme treatment
- `packages/ui/src/TierTransitionModal.tsx` — Migrate tokens + per-theme treatment
- `packages/ui/src/XPProgressBar.tsx` — Migrate tokens (tier colours remain fixed per D-020)
- `packages/ui/src/XPBarChart.tsx` — Migrate tokens + per-theme chart styling
- `packages/ui/src/GrindOverlay.tsx` — Migrate tokens + per-theme overlay treatment (restyled in-place; extraction to session route is Phase 2)
- `packages/ui/src/PostSessionScreen.tsx` — Migrate tokens + per-theme treatment (restyled in-place; session route is Phase 2)
- `packages/ui/src/MonthlySummary.tsx` — Migrate tokens + per-theme treatment
- `packages/ui/src/PersonalBests.tsx` — Migrate tokens + per-theme treatment
- `packages/ui/src/ConfirmModal.tsx` — Migrate tokens + per-theme modal styling
- `packages/ui/src/SkillStreakBadge.tsx` — Migrate tokens + per-theme badge styling
- `packages/ui/src/GrindAnimation.tsx` — Migrate `--color-break` token
- `packages/ui/src/index.ts` — Export SkillEditModal

Files to **modify (RPG Tracker pages):**
- `apps/rpg-tracker/app/(app)/dashboard/page.tsx` — Restyle stat cards, skill grid, activity feed layout (sidebar on desktop)
- `apps/rpg-tracker/app/(app)/skills/page.tsx` — Restyle card grid and toolbar
- `apps/rpg-tracker/app/(app)/skills/[id]/page.tsx` — Restyle hero, gate section, activity history; add edit modal trigger
- `apps/rpg-tracker/app/(app)/skills/new/page.tsx` — Restyle step indicator with narrative labels, form inputs
- `apps/rpg-tracker/app/(app)/account/page.tsx` — Restyle settings grid per theme
- `apps/rpg-tracker/app/(app)/account/password/page.tsx` — Restyle per theme
- `apps/rpg-tracker/app/(app)/account/api-key/page.tsx` — Restyle per theme
- `apps/rpg-tracker/app/(auth)/login/page.tsx` — Migrate tokens, theme-responsive form
- `apps/rpg-tracker/app/(auth)/register/page.tsx` — Migrate tokens, theme-responsive form
- `apps/rpg-tracker/app/(app)/nutri/page.tsx` — Themed teaser
- `apps/rpg-tracker/app/(app)/layout.tsx` — Activity feed sidebar layout support
- `apps/rpg-tracker/tokens.css` — Import pages.css

Files to **modify (Landing app):**
- `apps/landing/package.json` — Add `@rpgtracker/ui` workspace dependency (currently has none; required for ThemeProvider and theme CSS imports)
- `apps/landing/app/layout.tsx` — Load all four fonts via `next/font/google`, add ThemeProvider, set font CSS vars on `<html>`
- `apps/landing/app/page.tsx` — Theme-responsive hero, features, CTA
- `apps/landing/app/globals.css` — Partially migrate bespoke `:root` block: replace 6 overlapping tokens (`--bg`, `--bg-surface`, `--bg-elevated`, `--text-primary`, `--text-secondary`, `--text-muted`) with canonical `--color-*` equivalents. Retain landing-local tokens (`--gold-*`, `--emerald-*`, `--sage-*`) as-is. Remove `.font-display` class override. Preserve all layout/animation CSS.

Files to **remove:**
- `apps/rpg-tracker/app/(app)/skills/[id]/edit/page.tsx` — Replaced by SkillEditModal on skill detail page

Files to **update (tests):**
- `packages/ui/src/SkillCard.test.tsx` — Update for token migration changes
- `packages/ui/src/StatCard.test.tsx` — Same
- `packages/ui/src/ActivityFeedItem.test.tsx` — Same
- Any other test files affected by component API changes

## Acceptance Criteria

### P1-T (Token reconciliation)

- AC-1: All component references to duplicate token names are migrated to canonical names: `--color-bg-surface` → `--color-surface`, `--color-bg-base` → `--color-bg`, `--color-text-primary` → `--color-text`, `--color-text-muted` → `--color-muted`, `--color-danger` → `--color-error`. Verified by: `grep -r 'color-bg-surface\|color-bg-base\|color-text-primary\|color-text-muted\|color-danger' packages/ui/src/ apps/rpg-tracker/` returns zero matches in `.tsx` files.
- AC-2: Each theme file (`minimal.css`, `retro.css`, `modern.css`) defines the new extended tokens: `--color-bg-elevated`, `--color-text-secondary`, `--color-accent-muted`, `--color-secondary` (Minimal only — Retro/Modern already define it), `--color-warning`, `--color-break`, `--color-border-strong`, `--color-text-inverse`, `--color-info`. Verified by: `grep --color-bg-elevated packages/ui/tokens/minimal.css` returns a match (repeat for each token × each file).
- AC-3: Minimal extended token values are specified in `Documentation/style-guide/minimal.md`. The implementer must reference the Minimal style guide for exact hex values. Key constraint: `--color-bg-elevated` must be lighter than `--color-surface` (elevated surfaces sit above flat surfaces in a light theme).
- AC-4: Retro extended token values are specified in `Documentation/style-guide/retro.md`. Key constraint: `--color-bg-elevated` must differ visibly from `--color-surface` (#1a1a2e) — either lighter or slightly different hue.
- AC-5: Modern extended token values are specified in `Documentation/style-guide/modern.md`. Key constraint: `--color-bg-elevated` must differ from `--color-surface` (rgba(15, 23, 42, 0.8)).
- AC-6: After token reconciliation, zero `var(--color-*)` references in `.tsx` files resolve to undefined tokens. Verified by: extract all unique `var(--color-*)` names from `.tsx` files and confirm each exists in all three theme files (or is a theme-specific token like `--color-secondary` which only needs to exist in themes that use it).

### P1-1 (Dashboard restyle)

- AC-7: Dashboard stat cards use `--color-bg-elevated` for background, `--color-border` for borders, `--font-display` for value text. Modern theme stat cards additionally apply `--shadow-md` with accent-tinted glow (defined in `pages.css` scoped to `[data-theme="modern"] .stat-card`). Stat cards grid is responsive: 2-col at ≥640px, 4-col at ≥1024px.
- AC-8: Skill card grid cards use `--color-bg-elevated` for background, `--color-border` for borders. Hover effects are gated by `--motion-scale` via `calc()`. Modern cards carry the `.card` class and inherit glassmorphism from `components.css`.
- AC-9: Activity feed is positioned as a sidebar on desktop (>1024px) and below-fold on mobile. Layout uses CSS grid or flexbox, not JS-based repositioning. Implementation: dashboard page uses a CSS grid with `grid-template-columns: 1fr` on mobile and `grid-template-columns: 1fr minmax(280px, 320px)` on desktop.
- AC-10: Quick Log bottom sheet is restyled per theme using theme tokens. Existing bottom sheet behaviour is preserved.

### P1-2 (Skills list restyle)

- AC-11: Skills list card grid cards carry the `.card` class. Modern theme cards inherit glassmorphism. Retro cards apply `--color-border` and `--shadow-md`. Minimal cards use flat styling with `--shadow-sm`.
- AC-12: Toolbar (tier filter, sort options) uses `--color-bg-elevated` for dropdown/select backgrounds, `--color-border` for borders, `--color-text` for labels. All interactive elements have `min-height: var(--tap-target-min)`.

### P1-3 (Skill detail restyle)

- AC-13: XP progress bar is rendered as the first child within the hero section, before action buttons. Hero section uses `--color-bg-elevated` background with `--radius-lg` and `--shadow-md`.
- AC-14: Gate section applies theme-scoped CSS classes from `pages.css`: `[data-theme="minimal"] .gate-section` (clean card, `--color-border`, `--color-text`), `[data-theme="retro"] .gate-section` (double border using `--color-border-strong` and `--color-secondary`, `--shadow-lg`), `[data-theme="modern"] .gate-section` (animated `--color-accent` border via CSS keyframe, `backdrop-filter: blur()`).
- AC-15: Activity history applies theme-scoped CSS classes from `pages.css`: `[data-theme="minimal"] .activity-history` (simple list, `--color-border` separators), `[data-theme="retro"] .activity-history` (styled entries with `--font-display` for headings), `[data-theme="modern"] .activity-history` (vertical timeline line using `--color-accent` with `::before` pseudo-element). Empty state text is themed: Minimal "No activity yet. Log some XP to get started.", Retro "Your chronicle awaits... Begin your journey.", Modern "No data recorded. Initiate a session to begin logging."
- AC-16: XP bar chart uses `--color-accent` for bar fill, `--color-border` for grid lines, `--color-muted` for axis labels. Chart background is `--color-surface`.

### P1-4 (Skill create restyle)

- AC-17: Step indicator labels render in `var(--font-display)`. Labels are "Identity", "Appraisal", "The Arbiter" (text content, not just styling).
- AC-18: Form inputs use `--color-surface` for background, `--color-border` for borders, `--color-text` for input text, `--color-text-secondary` for labels. Focus ring uses `--color-accent`.
- AC-19: Step indicator applies theme-scoped CSS from `pages.css`: `[data-theme="minimal"]` (numbered circles with `--color-accent` fill on active), `[data-theme="retro"]` (chapter-style markers with `--color-accent` gold, `--font-display` for step numbers), `[data-theme="modern"]` (pipeline segments with `--color-accent` cyan connecting lines).

### P1-5 (Account restyle)

- AC-20: Settings grid renders 2-col on desktop (>768px), 1-col on mobile. Cards use `--color-bg-elevated` background, `--color-border` borders.
- AC-21: Sign out button uses `--color-error` for text/border. Sub-page links use `--color-accent` for text, `--color-bg-elevated` for background.
- AC-22: Password change page form uses `--color-error` for validation messages, `--color-accent` for submit button background. API key page uses `--color-surface` for code display background, `--font-mono` for key text.

### P1-6 (Auth pages restyle)

- AC-23: Login and register pages use `--color-bg` for page background (replacing `--color-bg-base`), `--color-bg-elevated` for form card, `--color-border` for card border. Background matches the atmosphere set by the root layout.
- AC-24: Form inputs use `--color-surface` for background (replacing `--color-bg-surface`), `--color-text` for input text (replacing `--color-text-primary`), `--color-text-secondary` for labels (replacing `--color-text-secondary` — name unchanged but now defined in theme files).
- AC-25: Auth pages inherit the theme from the root layout's `data-theme` attribute (set by middleware reading the `rpgt-theme` cookie). No separate `(auth)/layout.tsx` is needed — confirmed no auth-specific layout exists. Auth pages receive Layer 2 CSS entries in `pages.css` for theme-specific background atmosphere: `[data-theme="minimal"]` auth pages use `--color-bg` (white, clean); `[data-theme="retro"]` auth pages use `--color-bg` with warm atmosphere continuing from the app layout; `[data-theme="modern"]` auth pages use `--color-bg` with the directional gradient from `components.css`. Token inheritance provides the colour values; `pages.css` adds any atmospheric pseudo-elements for dark themes.

### P1-7 (Landing page restyle)

- AC-26: Landing page renders in Minimal theme by default. No interactive theme switcher is wired in Phase 1 — the landing page always renders in the theme set by the `rpgt-theme` cookie or Minimal if absent.
- AC-27: ThemeProvider and theme CSS files (`minimal.css`, `retro.css`, `modern.css`, `components.css`) are imported in the landing app layout. The landing app's `tokens.css` (or equivalent import) mirrors the rpg-tracker import structure.
- AC-28: Landing fonts are loaded via `next/font/google` (Inter, Press Start 2P, Space Grotesk, Rajdhani) with `font-display: swap`. CSS variables (`--font-inter`, `--font-press-start`, `--font-space-grotesk`, `--font-rajdhani`) set on `<html>`.
- AC-29: Hero heading uses `var(--font-display)`, body text uses `var(--font-body)`. Feature cards use `--color-bg-elevated` background, `--color-border` borders. CTA button uses `--color-accent` background.
- AC-30: The bespoke `:root` token block in `globals.css` is **partially migrated**, not fully removed. The strategy is scoped replacement:
  - **Replaced with canonical tokens (5 overlapping names):** `--bg` → `var(--color-bg)`, `--bg-surface` → `var(--color-surface)`, `--bg-elevated` → `var(--color-bg-elevated)`, `--text-primary` → `var(--color-text)`, `--text-secondary` → `var(--color-text-secondary)`, `--text-muted` → `var(--color-muted)`. These six declarations are removed from the `:root` block and all CSS rules referencing them are updated to use the canonical `--color-*` equivalents.
  - **Retained as a landing-local `:root` block:** `--gold`, `--gold-light`, `--gold-dark`, `--gold-faint`, `--gold-border`, `--gold-border-hover`, `--gold-glow`, `--emerald`, `--emerald-faint`, `--emerald-border`, `--sage`, `--sage-faint`, `--sage-border`. These tokens have no canonical `--color-*` equivalents and are specific to the landing page's design system. They remain in a `:root` block in `globals.css`. Hardcoded `rgba()` values in CSS rules are also preserved as-is.
  - **Full landing restyle** (replacing gold/emerald/sage with theme-specific accent colours, theme-specific section animations) is deferred to Phase 7 per Non-Goals.
  - Landing-specific layout/animation CSS (flexbox, grid, keyframes, positioning, spacing) is preserved as-is.
- AC-30b: The `.font-display` CSS class in `globals.css` (which sets `font-family: var(--font-cinzel)`) is removed. Components use the `--font-display` CSS variable directly (set per-theme by the token system), not a CSS class override. The Cinzel font is no longer loaded — landing page uses the same four-font system as the main app.

### P1-8 (NutriLog placeholder restyle)

- AC-31: NutriLog placeholder page renders themed copy: Minimal displays "Coming Soon — NutriLog" with `--color-text` heading and `--color-muted` description; Retro displays "A New Chapter Approaches..." with `--color-accent` (gold) heading and `--font-display`; Modern displays "MODULE PENDING" with `--color-accent` (cyan) heading and a `box-shadow` glow using `--color-accent` at low opacity.
- AC-32: Teaser uses only CSS and text — no image assets. Copy strings are hardcoded in the page component (not pulled from an API).

### P1-9 (Navigation restyle)

- AC-33: Sidebar applies theme-scoped CSS from `pages.css`: `[data-theme="minimal"]` (light `--color-bg-elevated` background, `--color-border` right border), `[data-theme="retro"]` (`--color-bg-elevated` background, `--color-accent` gold accent on brand text, `--color-border-strong` right border), `[data-theme="modern"]` (carries `nav-panel` class for glassmorphism from `components.css`, `--color-accent` cyan accents).
- AC-34: BottomTabBar applies matching theme treatment. Active tab uses `--color-accent`, inactive uses `--color-muted`. Tab bar background uses `--color-bg-elevated`.
- AC-35: Both navigation components maintain responsive behaviour: sidebar `hidden md:flex`, tabs `flex md:hidden`.

### P1-10 (Skill edit modal)

- AC-36: `SkillEditModal` component in `packages/ui/src/` renders as a modal overlay on the skill detail page. It accepts `skillId`, `skillName`, `skillDescription`, `isOpen`, `onClose`, and `onUpdate` props.
- AC-37: Modal has accessibility attributes: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the modal heading. Focus is trapped within the modal when open. ESC key closes the modal. Focus returns to the trigger element on close. Z-index is `z-50` (matching existing overlay stack). The edit trigger is hidden/disabled while a GrindOverlay session is active.
- AC-38: Modal renders per-theme using theme tokens: `--color-bg-elevated` for background, `--color-border` for border, `--color-text` for heading, `--color-accent` for update button background. Modern theme applies glassmorphism via `.modal` class from `components.css`.
- AC-38b: On mobile (<768px), the modal renders as a full-width bottom sheet with `rounded-t-3xl`, matching the pattern used by `QuickLogSheet` and `ConfirmModal`. Update and Cancel buttons have `min-height: var(--tap-target-min)`. The modal container uses `align-items: flex-start` with top padding on mobile so buttons remain visible when the virtual keyboard is raised.
- AC-39: The dedicated edit page (`/skills/[id]/edit/page.tsx`) is removed. A Next.js `redirect()` in a replacement `page.tsx` at the same path redirects to `/skills/[id]`. Verified by: `curl -s -o /dev/null -w '%{http_code}' /skills/test-id/edit` returns 307 or 308.
- AC-40: Edit modal opens with pre-filled skill name and description. The name field is `required`; the submit button is disabled while the name is empty. If the mutation fails, an inline error message is displayed using `--color-error`. On successful update, the modal invalidates both `['skill', id]` and `['skills']` query keys and closes itself.
- AC-40b: The Edit trigger on the skill detail page is hidden when `!skill.is_custom` (preset skills are not editable). The current edit page has no UI-level guard (only API-level) — the modal conversion adds the UI guard to prevent a confusing error path.

### P1-L2 (Layer 2 CSS)

- AC-41: A `pages.css` file in `packages/ui/tokens/` contains all Layer 2 theme-scoped CSS rules for page-level treatments.
- AC-42: All Layer 2 rules are scoped to `[data-theme="<name>"]` selectors. No unscoped theme-specific styles.
- AC-43: Layer 2 CSS does not duplicate values available as Layer 1 tokens. It only adds treatments that cannot be expressed as simple property values (pseudo-elements, complex selectors, structural overrides such as double borders, animated borders, timeline lines).

### Cross-cutting

- AC-44: The app loads and renders without errors on all three themes across all pages.
- AC-45: All existing tests pass after restyling. No test regressions.
- AC-46: No hardcoded Tailwind colour classes (`bg-gray-*`, `text-slate-*`, etc.) are introduced. All colours use `var(--color-*)` tokens.
- AC-47: Mobile layout is preserved on all pages. No desktop-only regressions.
- AC-48: All interactive elements have visible focus states using `--color-accent`.
- AC-49: Colour contrast meets WCAG AA (4.5:1 for normal text, 3:1 for large text) on all three themes. Minimal `--color-muted` value is `#6b7280` on `--color-bg` (`#ffffff`) = 4.6:1 — passes AA. This value is retained unless visual review identifies readability issues, in which case it may be darkened to `#5b6570` (5.5:1).
- AC-50: `tokens.css` imports `pages.css` after `components.css`.
- AC-50b: The existing `@layer base` input colour override in `tokens.css` (lines 12–18, which force `text-gray-900 dark:text-white` on all inputs) is replaced with `color: var(--color-text)` and `background-color: var(--color-surface)`. The Tailwind colour classes conflict with theme tokens on dark themes.
- AC-51: All CSS animations and transitions introduced by this phase use `calc(duration * var(--motion-scale))` pattern or are wrapped in `@media (prefers-reduced-motion: reduce)` to honour the OS motion preference.
- AC-52: `GrindOverlay` and `PostSessionScreen` are restyled in-place (on the existing overlay mechanism). Extraction to a dedicated session route is Phase 2 scope — Phase 1 only changes their visual treatment.

## Non-Goals (deferred to later phases)

- **Primary Skill Focus / "Next Quest"** (Phase 4 — needs pinning API)
- **Quick Session button** (Phase 4 — needs session route from Phase 2)
- **Inline mini-form on skill cards** (Phase 3 — needs quick-log logic change)
- **Quick Log restructure to collapsible panel** (Phase 4 — layout + logic change; Phase 1 only restyles the existing bottom sheet per AC-10)
- **Category/tag display and filtering** (Phase 3 — needs schema)
- **XP chart rolling average trend line** (Phase 4 — chart enhancement)
- **Player Card / avatar system** (Phase 5 — needs storage infra)
- **Account stats aggregation** (Phase 5 — needs API endpoint)
- **Theme picker with visual previews** (Phase 5 — UI enhancement)
- **Social auth buttons** (Phase 7 — needs Supabase config)
- **Feature preview on registration** (Phase 7)
- **Free trial messaging** (Phase 7)
- **Landing: Suite Apps section** (Phase 7 — new content)
- **Landing: Social proof section** (Phase 7 — new content)
- **Landing: Theme switcher on hero** (Phase 7 — ThemeSwitcher wiring; Phase 1 landing page has no interactive theme switcher)
- **Landing: Theme-specific section animations** (Phase 7 — animation system; Phase 1 preserves existing animations)
- **Landing: Full bespoke token migration** (Phase 7 — replacing `--gold-*`, `--emerald-*`, `--sage-*` with theme-specific accent colours; Phase 1 only migrates the 6 overlapping tokens)
- **Hub stat placeholders** (Phase 4)
- **Empty state overhaul** (Phase 4)
- **Arbiter avatar** (Phase 6 — Layer 3 component variant, requires theme-dependent visual character; Phase 1 only restyles the AI calibration dialogue with theme tokens)
- **NutriLog preview illustration/icon** (deferred — Phase 1 uses CSS-only teaser per AC-32)
- **Session route extraction** (Phase 2 — GrindOverlay and PostSessionScreen are restyled in-place in Phase 1)

## Style Guide References

- `Documentation/style-guide/shared.md` — token categories, three-layer architecture, agent rules
- `Documentation/style-guide/minimal.md` — Minimal palette, typography, density, backgrounds
- `Documentation/style-guide/retro.md` — Retro palette, typography, density, backgrounds, scanlines
- `Documentation/style-guide/modern.md` — Modern palette, typography, density, backgrounds, glassmorphism
- `Documentation/page-guides/dashboard.md` — Dashboard theme variations
- `Documentation/page-guides/skills-list.md` — Skills list theme variations
- `Documentation/page-guides/skill-detail.md` — Skill detail theme variations, gate mood, activity history
- `Documentation/page-guides/skill-create.md` — Skill create theme variations, step indicator
- `Documentation/page-guides/account.md` — Account theme variations
- `Documentation/page-guides/auth.md` — Auth pages theme variations
- `Documentation/page-guides/landing.md` — Landing page theme variations
- `Documentation/page-guides/nutri-placeholder.md` — NutriLog placeholder theme variations
- `Documentation/page-guides/skill-edit.md` — Skill edit modal theme variations

## Decisions Referenced

- D-035: Three-theme system (architecture, three-layer approach)
- D-036: Pipeline split (this is `type: visual` work — no TDD gate)
- D-020: Tier colours are fixed across all themes (not restyled per theme)
