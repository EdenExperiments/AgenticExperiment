# Spec: Site-Wide Responsive Layout & Design System Overhaul

**Status:** APPROVED
**Date:** 2026-03-21
**Feature slug:** site-wide-ui-overhaul
**Brief:** `docs/specs/site-wide-ui-overhaul-brief.md`

---

## Problem

Every page in the LifeQuest app renders as a narrow `max-w-2xl` (672px) single column. On desktop with a `w-64` sidebar, this wastes 40-50% of available screen space. Several components still use hardcoded Tailwind colour classes instead of CSS variable tokens. Card hover interactions are missing. The app does not match the visual quality bar set by the landing page.

## Goals

1. Responsive multi-column layouts on desktop (md+) for all pages
2. Full CSS variable migration — zero hardcoded Tailwind colour classes in scope
3. Card hover/lift effects on all interactive cards
4. Visual quality matching the landing page reference
5. No mobile regressions — all pages collapse to single column on small screens

## Non-goals

- Landing page changes (already at quality bar)
- Auth pages (login/register)
- NutriLog/MindTrack apps (scaffolded only)
- API changes, schema changes, new backend work
- Regressions to recently polished components (`BlockerGateSection`, `XPBarChart`, `GateVerdictCard`, `TierBadge`, `XPProgressBar`)
- Sidebar component (`packages/ui/src/Sidebar.tsx`) — no layout changes expected; verify compatibility during implementation
- Quick Log modal and time-primary XP input (D-034) — not in scope for this pass

---

## Design Decisions

### D-LAYOUT: Container Strategy

**Decision:** Replace `max-w-2xl` with a fluid layout that uses 80-90% of available width up to ~1500px max.

Implementation approach:
- `(app)/layout.tsx` sets an outer container with `max-w-[1500px] w-[90%] mx-auto` (or equivalent)
- Each page controls its own internal CSS Grid layout
- On mobile (<md), all pages collapse to single column with full-width padding

### D-CARD-TREATMENTS: Consistent Card Hierarchy

Three card tiers:
1. **Primary cards** — `var(--color-bg-elevated)` + `var(--color-border)` border + hover lift + enhanced shadow. Used for: SkillCard, StatCard, main content sections.
2. **Secondary cards** — `var(--color-bg-surface)` + subtle border. Used for: ActivityFeedItem containers, form sections.
3. **Inline content** — no card wrapper. Used for: form inputs, text blocks within cards.

### D-HOVER: Card Hover Effects

All primary and secondary cards get:
- `transform: translateY(-2px)` on hover (lift)
- Enhanced `box-shadow` on hover (depth)
- Hover styles gated by `@media (hover: hover)` to prevent stuck-lift on iOS touch devices
- Transition scaled by `var(--motion-scale)` to respect reduced-motion
- `transition: transform calc(var(--duration-fast) * var(--motion-scale, 0)), box-shadow calc(var(--duration-fast) * var(--motion-scale, 0))`

### D-TYPOGRAPHY: Section Headers

All page section headers use `font-family: var(--font-display)` (Cinzel on rpg-game theme). Body text uses `var(--font-body)` (Inter).

---

## Zones Touched

| Zone | Paths | Agent |
|------|-------|-------|
| Shared UI components | `packages/ui/src/SkillCard.tsx`, `packages/ui/src/StatCard.tsx`, `packages/ui/src/ActivityFeedItem.tsx` | frontend |
| App layout | `apps/rpg-tracker/app/(app)/layout.tsx` | frontend |
| Dashboard | `apps/rpg-tracker/app/(app)/dashboard/page.tsx` | frontend |
| Skills list | `apps/rpg-tracker/app/(app)/skills/page.tsx` | frontend |
| Skill detail | `apps/rpg-tracker/app/(app)/skills/[id]/page.tsx` | frontend |
| Skill create | `apps/rpg-tracker/app/(app)/skills/new/page.tsx` | frontend |
| Skill edit | `apps/rpg-tracker/app/(app)/skills/[id]/edit/page.tsx` | frontend |
| Account | `apps/rpg-tracker/app/(app)/account/page.tsx` | frontend |
| Account password | `apps/rpg-tracker/app/(app)/account/password/page.tsx` | frontend |
| Account API key | `apps/rpg-tracker/app/(app)/account/api-key/page.tsx` | frontend |
| Sidebar (verify only) | `packages/ui/src/Sidebar.tsx` | frontend (no changes expected — verify `w-64` compatibility with new container) |

**Shared packages affected:** `packages/ui/src/` (SkillCard, StatCard, ActivityFeedItem)

---

## Page-by-Page Layouts

### Shared Layout (`(app)/layout.tsx`)

**Current:** Flex container, sidebar on left (md+), content area has no max-width strategy beyond child pages.
**Target:** Content area gets `max-w-[1500px] w-[90%] mx-auto` outer container. Pages control internal grid. Mobile: full-width with `px-4` padding.

### Dashboard (`/dashboard`)

**Current:** `max-w-2xl`, 2x2 stats grid, vertical skill stack, vertical activity feed.
**Desktop (md+):**
- Stats row: 4-column grid spanning full width
- Below stats: skills card grid (2-3 columns) spanning full width
- Activity feed below the skills grid (not a sticky right column — feed is secondary/retrospective content that does not contextualise the skills grid in real time)
- Note: if a future feature adds real-time activity (e.g., live session tracking), the sticky column layout should be revisited

**Mobile:** Single column: stats (2x2 grid), skills stack, activity feed below.

### Skills List (`/skills`)

**Current:** `max-w-2xl`, vertical stack with `space-y-3`.
**Desktop (md+):**
- Filter bar spans full width
- Skills in 2 or 3 column CSS Grid (auto-fill, minmax ~320px)
- Cards use uniform height within rows
- **Empty state:** When no skills exist, render a centered full-width call-to-action within the grid container. The filter bar is not rendered when there are no skills.

**Mobile:** Single column stack (current behavior preserved).

### Skill Detail (`/skills/[id]`)

**Current:** `max-w-2xl`, all sections stacked vertically.
**Desktop (md+) — Option B selected (hero header + grid below):**
- Full-width hero section (skill name, tier badge, level, streak) + gate/XP bar + action buttons — all at full content width
- Below hero: 2-column CSS Grid (`grid-cols-[1fr_1fr]`) — XP bar chart in left column, skill description + activity history in right column
- Description moves to right column (above history) on desktop to contextualise the log entries
- Delete action remains full-width below the 2-column grid
- `BlockerGateSection` and `XPProgressBar` remain full-width in the hero block — not touched
- **Chart absent state:** If no XP chart data is available (new skill, no activity in last 30 days), the history section spans full width (`col-span-2`) instead of leaving an empty left column

**Mobile:** Single column (current behavior preserved). Source order: hero → actions → gate/XP → chart → description → history.

### Skill Create (`/skills/new`)

**Current:** `max-w-lg` (512px), centered multi-step form.
**Target:** Centered within the wider layout. May increase to `max-w-xl` or `max-w-2xl` if the wider context makes the form feel too cramped. Preserve centered alignment. Review during implementation.

### Skill Edit (`/skills/[id]/edit`)

**Current:** Similar to create. Apply same treatment as skill create.

### Account (`/account`)

**Current:** `max-w-2xl`, single column, hardcoded `gray-900`, `gray-100`.
**Desktop (md+):**
- Settings sections in 2-column grid (e.g., profile info left, theme picker right)
- Uses `grid-cols-2` on `md+`

**Mobile:** Single column (`grid-cols-1`). All sections stack vertically.

### Account Sub-pages (`/account/password`, `/account/api-key`)

**Current:** `max-w-lg`, centered forms, hardcoded `dark:bg-gray-800`, `dark:border-gray-700`.
**Target:** Migrate all hardcoded colours to CSS variables. Keep centered form layout, proportional to wider container.

---

## Component Changes

### SkillCard (`packages/ui/src/SkillCard.tsx`)

- **Fix:** Replace hardcoded `orange-500/20` streak badge background with `var(--color-accent-muted)`
- **Fix:** Replace hardcoded `orange-400` streak text with `var(--color-accent)`
- **Add:** Hover lift effect (translateY + shadow) with `--motion-scale` transition, gated by `@media (hover: hover)`
- **Add:** `:focus-visible` outline using `var(--color-accent)` at 2px offset for keyboard navigation parity
- **Layout:** Must work in both vertical stack and grid layouts (no fixed width assumptions)
- **Tap target:** The SkillCard clickable wrapper must have `min-h-[44px]`; the full card surface is the tap target. Must handle skill names up to 60 characters without breaking the card grid.

### StatCard (`packages/ui/src/StatCard.tsx`)

- Already uses CSS variables
- **Add:** Hover lift effect with `--motion-scale` transition, gated by `@media (hover: hover)`
- **Add:** `:focus-visible` outline using `var(--color-accent)` at 2px offset for keyboard navigation parity
- **Layout:** Remain vertical orientation (icon above value) in 4-column grid on desktop. Ensure internal padding does not cause overflow at narrow column widths (~300px).

### ActivityFeedItem (`packages/ui/src/ActivityFeedItem.tsx`)

- Already uses CSS variables
- **Review:** Contrast against both `--color-bg-surface` and `--color-bg-elevated` backgrounds
- **Add:** Subtle hover highlight (background shift, not full lift)

---

## Colour Migration Audit

All hardcoded Tailwind colour classes in scope files must be replaced with CSS variable equivalents.

Known instances:
| File | Hardcoded Class | Replacement |
|------|----------------|-------------|
| `SkillCard.tsx` | `orange-500/20` | `var(--color-accent-muted)` |
| `SkillCard.tsx` | `orange-400` | `var(--color-accent)` |
| `account/page.tsx` | `gray-900`, `gray-100` | `var(--color-text-primary)`, `var(--color-bg-surface)` |
| `account/page.tsx` | `gray-200`, `gray-800` border | `var(--color-border)` |
| `account/password/page.tsx` | `dark:bg-gray-800`, `dark:border-gray-700` | `var(--color-bg-elevated)`, `var(--color-border)` |
| `account/api-key/page.tsx` | `dark:bg-gray-800`, `dark:border-gray-700` | `var(--color-bg-elevated)`, `var(--color-border)` |
| `dashboard/page.tsx` | `bg-gray-700` (loading skeletons) | `var(--color-bg-elevated)` or suitable surface token |

A full grep scan during implementation will catch any additional instances.

---

## Acceptance Criteria

### Layout ACs

- **AC-01:** `(app)/layout.tsx` content area uses `max-w-[1500px]` (or equivalent ~1500px cap) with `w-[90%]` fluid width. No child page sets its own `max-w-2xl`.
- **AC-02:** Dashboard page at `md` breakpoint renders stats in a 4-column grid.
- **AC-03:** Dashboard page at `md` breakpoint renders skills in a multi-column grid (2+ columns). Activity feed renders below the skills grid (not as a sticky side column).
- **AC-04:** Skills list page at `md` breakpoint renders SkillCards in a multi-column CSS Grid (2+ columns, auto-fill with minmax).
- **AC-05:** Skill detail page at `md` breakpoint renders Option B: full-width hero header (name, tier, gate/XP, actions) followed by a two-column CSS Grid (chart left, description+history right). When no chart data exists, history spans full width (`col-span-2`).
- **AC-06:** Account page at `md` breakpoint renders settings sections in a CSS Grid with at least 2 columns, or uses a wider single-column container (`max-w-4xl`+) with side-by-side form field groups via nested grid/flex.
- **AC-07:** All pages collapse to single-column layout below `md` breakpoint with no horizontal overflow.
- **AC-08:** Skill create and skill edit pages use a centered container (`max-w-xl` or `max-w-2xl`) within the outer `max-w-[1500px]` layout, with `mx-auto` centering applied.

### Colour Migration ACs

- **AC-09:** `SkillCard.tsx` contains zero hardcoded `orange-` Tailwind classes. Streak badge uses CSS variable equivalents.
- **AC-10:** `account/page.tsx` contains zero hardcoded `gray-` Tailwind classes. All colours use CSS variables.
- **AC-11:** `account/password/page.tsx` contains zero `dark:bg-gray-*` or `dark:border-gray-*` classes.
- **AC-12:** `account/api-key/page.tsx` contains zero `dark:bg-gray-*` or `dark:border-gray-*` classes.
- **AC-13:** Full grep of all in-scope files returns zero matches for hardcoded colour Tailwind utilities (pattern: `(bg|text|border)-(gray|orange|amber|red|blue|green)-\d`). Tier accent classes (`.tier-accent-*`) are excluded from this check as they are part of the D-020 binding colour system.
- **AC-13a:** Dashboard loading skeletons use CSS variable tokens (not hardcoded `bg-gray-*`).

### Hover & Interaction ACs

- **AC-14:** SkillCard has visible hover lift effect (translateY change + shadow increase) on desktop, gated by `@media (hover: hover)`. Transition duration is gated by `var(--motion-scale)`. `:focus-visible` produces a visible outline using `var(--color-accent)` at 2px offset.
- **AC-15:** StatCard has visible hover lift effect on desktop, gated by `@media (hover: hover)` and `var(--motion-scale)`. `:focus-visible` produces a visible outline using `var(--color-accent)` at 2px offset.
- **AC-16:** ActivityFeedItem has subtle hover background highlight on desktop.
- **AC-17:** On `rpg-clean` theme (where `--motion-scale: 0`), hover transitions are instant (0ms duration) — no animation, but hover state still visually distinct.

### Visual Quality ACs

- **AC-18:** All page section headers use `font-family: var(--font-display)`.
- **AC-19:** Primary cards use `var(--color-bg-elevated)` background with `var(--color-border)` border.
- **AC-20:** No regressions on `BlockerGateSection`, `XPBarChart`, `GateVerdictCard`, `TierBadge`, `XPProgressBar` — these components are not modified.
- **AC-21:** (Manual QA) All pages on rpg-game theme visually match the landing page quality bar: gold accents, Cinzel headings, depth through shadows, atmospheric treatment.

### Accessibility ACs

- **AC-22:** All interactive card elements maintain 44px minimum tap target on mobile.
- **AC-23:** (Manual QA) Hover effects do not reduce contrast ratio below WCAG AA (4.5:1 for text). Verified by inspecting hover state in browser devtools colour picker for text-on-background contrast.

### Binding Constraint ACs

- **AC-24:** D-020 tier colour system preserved — `.tier-accent-*` classes unchanged.
- **AC-25:** D-021 gate layout preserved — `BlockerGateSection` replaces XP bar when active, not appended below.
- **AC-26:** D-017 navigation preserved — bottom tab bar on mobile, sidebar on desktop, no changes to navigation components.

---

## Resolved Questions

1. **Skill detail layout:** Option B selected (full-width hero header + 2-column grid below). See `ux-review.md` for rationale.
2. **StatCard orientation:** Remain vertical (icon above value). Horizontal orientation reduces legibility at 4-wide column widths.
3. **Dashboard activity feed:** Below skills grid (not sticky). Feed is secondary/retrospective. Revisit if real-time activity is added.

---

## Constraints

- **No API/schema changes.** This is a pure frontend styling pass.
- **Binding decisions** D-017, D-020, D-021 are not reopened.
- **Recently polished components** (`BlockerGateSection`, `XPBarChart`, `GateVerdictCard`, `TierBadge`, `XPProgressBar`) must not be modified except for minor adjustments if the surrounding page layout requires it.
- **Theme compatibility:** All changes must work on both `rpg-game` and `rpg-clean` themes. Use CSS variables, not hardcoded values.
- **Motion:** All animations gated by `var(--motion-scale)`.

---

## Reference

- Landing page (quality bar): `apps/landing/app/page.tsx`
- Theme tokens: `packages/ui/tokens/rpg-game.css`, `packages/ui/tokens/base.css`
- Decision log: `Documentation/decision-log.md` (D-017, D-020, D-021)
- Previous polish retro: `docs/sessions/retros/skill-detail-ux-polish-retro.md`
- Feature brief: `docs/specs/site-wide-ui-overhaul-brief.md`
