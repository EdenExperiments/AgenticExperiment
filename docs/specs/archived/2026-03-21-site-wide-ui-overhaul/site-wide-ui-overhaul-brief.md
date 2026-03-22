# Feature Request: Site-Wide Responsive Layout & Design System Overhaul

## Problem

Every page in the LifeQuest app (`/dashboard`, `/skills`, `/skills/[id]`, `/account`, `/skills/new`) renders as a narrow `max-w-2xl` (672px) single column on all viewports. On desktop with a `w-64` sidebar, this wastes 40-50% of the available screen space. There is no CSS Grid usage anywhere, no responsive layout adaptation beyond mobile/desktop nav swapping, and no visual cohesion across pages.

### Current state by page

| Page | Max-width | Layout | Problem |
|---|---|---|---|
| Dashboard | `max-w-2xl` (672px) | Single column, flex | Stats grid is 2x2 inside 672px. Skills are vertical stack. 500px+ wasted on desktop. |
| Skills list | `max-w-2xl` | Single column, `space-y-3` stack | Could be 2-3 column card grid on desktop. |
| Skill detail | `max-w-2xl` | Single column | Chart + history could sit side-by-side on desktop. |
| Account | `max-w-2xl` | Single column | Also has hardcoded `gray-900`/`gray-100` Tailwind classes. |
| Skill create | `max-w-lg` (512px) | Single column | Narrower than everything else. |

### Remaining colour issues

- `SkillCard` has hardcoded `orange-500/20` for streak badge
- Account page has hardcoded `gray-900`, `gray-100` classes
- Several components were already migrated to CSS variables (`BlockerGateSection`, `XPBarChart`, `GateVerdictCard`, `TierBadge`, `XPProgressBar`) — these should be left as-is

### Design system tokens (already defined)

The rpg-game theme at `packages/ui/tokens/rpg-game.css` defines a complete token system that most components now use, but the page layouts don't leverage:

- Backgrounds: `--color-bg` (#0a0a0f), `--color-bg-surface` (#12121c), `--color-bg-elevated` (#1a1a2e)
- Text: `--color-text-primary` (#f0e6d3), `--color-text-secondary` (#a89880), `--color-text-muted` (#6b5e4e)
- Accent: `--color-accent` (#d4a853), `--color-accent-hover` (#e8bb66), `--color-accent-muted` (rgba(212,168,83,0.15))
- Borders: `--color-border` (rgba(212,168,83,0.2)), `--color-border-strong` (rgba(212,168,83,0.5))
- Typography: `--font-display` (Cinzel), `--font-body` (Inter)
- XP bar: `--color-xp-fill` (gold gradient), `--color-xp-bg` (rgba(212,168,83,0.1))
- Motion: `--motion-scale` (1 on rpg-game, 0 on rpg-clean)

---

## Requirements

### 1. Responsive layout system

- Define a shared layout approach in `(app)/layout.tsx` that gives pages room on desktop. Consider `max-w-6xl` or `max-w-7xl` outer container with pages controlling their own internal grid.
- **Dashboard (md+):** Stats row should span wider (4-col grid, not 2x2 in 672px). Skills cards in a 2-3 column grid. Activity feed as a side panel or secondary column.
- **Skills list (md+):** 2 or 3 column card grid instead of vertical stack.
- **Skill detail (md+):** Two-column layout — primary (hero + gate/XP + chart) and secondary (activity history + description). Or hero-width header with content grid below.
- **Account (md+):** Settings form can be wider with sections side-by-side.
- **Skill create:** Centered form is fine but should feel proportional to the wider layout.
- **Mobile:** All pages collapse to single column. No regressions on mobile.

### 2. Colour coordination & design system consistency

- Audit and fix all remaining hardcoded Tailwind colour classes. Replace with CSS variable equivalents from rpg-game tokens.
- Establish consistent card treatments: primary cards (`--color-bg-elevated` + gold border), secondary cards (`--color-bg-surface` + subtle border), inline content (no card). Not every section should look identical.
- Action buttons consistently use `--color-accent` with glow/shadow on desktop. Outline variants use `--color-accent` border.
- Section headers consistently use Cinzel display font via `--font-display`.

### 3. Visual quality bar

- Match the landing page at `/apps/landing/` — gold palette, Cinzel headings, hover lift effects on cards, depth through shadows and subtle glows, atmospheric treatment for hero sections.
- The dashboard should feel like a command center. The skill detail should feel like a character sheet. The skills list should feel like an inventory.
- Add hover interactions to cards (lift + enhanced shadow). Use `--motion-scale` to respect reduced-motion preferences.

### 4. Shared components to update

- `SkillCard` — responsive card that works in both list and grid layouts, fix hardcoded streak colours
- `StatCard` — should adapt to wider layouts (more horizontal on desktop)
- `ActivityFeedItem` — review contrast against both surface and elevated backgrounds
- `Sidebar` — already works but may need adjustment if page layouts change
- `BottomTabBar` — mobile-only, should not change

---

## Scope

**In scope:**
- All pages under `apps/rpg-tracker/app/(app)/` — dashboard, skills list, skill detail, skill create, skill edit, account
- Shared layout at `apps/rpg-tracker/app/(app)/layout.tsx`
- Related `packages/ui/src/` components: `SkillCard`, `StatCard`, `ActivityFeedItem`, and any others needing colour/layout fixes

**Not in scope:**
- Landing page at `/apps/landing/` (already at quality bar — this is the reference)
- Auth pages (login/register)
- NutriLog/MindTrack apps (scaffolded only)
- API changes, schema changes, new backend work
- Components already migrated in the recent polish pass: `BlockerGateSection`, `XPBarChart`, `GateVerdictCard`, `TierBadge`, `XPProgressBar` — don't regress these, but they may need minor adjustments if the page layout around them changes

---

## Reference

- Landing page code: `apps/landing/app/page.tsx`, `apps/landing/app/globals.css`
- Theme tokens: `packages/ui/tokens/rpg-game.css`, `packages/ui/tokens/base.css`
- Decision log: `Documentation/decision-log.md` (D-020 colour system, D-021 gate layout, D-017 navigation)
- Previous polish pass retro: `docs/sessions/retros/skill-detail-ux-polish-retro.md`

## Prompt

Run `/plan-feature` with this file as context.
