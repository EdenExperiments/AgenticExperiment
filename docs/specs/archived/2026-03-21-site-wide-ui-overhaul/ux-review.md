# UX Review — Site-Wide UI Overhaul

**Verdict:** APPROVED
**Date:** 2026-03-21

---

## Open Question Resolutions

### 1. Skill Detail Layout

**Recommendation: Option B — full-width hero header, then 2-column grid below (chart left, history right).**

Reasoning:

The skill detail page has a clear content hierarchy: the hero (name, tier, level, streak) and the gate/XP bar are the primary status surface — the first thing a user reads every time they open this page. The action buttons (Start Session, Log XP) are the primary interactive surface. Chart and history are secondary; they answer "how have I been doing?" rather than "where am I right now?"

Option A would place the chart on the same visual level as the hero and gate section by putting them in the same left column. This compresses the gate/XP bar into a narrow column, which is a problem because `BlockerGateSection` is a relatively tall component with a challenge title, description, and submission status — squeezing it into a left column at ~50% width creates pressure on that protected component without modifying it. Option A also places the activity history in the right column beside the hero, which means a user's eye lands on a list of log entries while still reading the skill name — wrong reading order.

Option B keeps the hero and gate/XP bar at full width where they can breathe, preserves the action buttons at full width immediately below (critical for tap target and visual prominence), then splits the secondary data (chart and history) into a two-column grid. This matches the F-pattern reading sequence for this page: scan the hero, understand the current state, act, then optionally review history. The desktop transition is smooth: mobile is already hero-first / actions / chart / history top-to-bottom, and Option B preserves exactly this order with the only change being that chart and history flow side by side on desktop rather than stacked.

Option A's "thematic fit" argument applies equally to Option B — the full-width hero with a gold-accented tier badge and Cinzel heading reads as a character sheet masthead. The two-column grid below reads as the "stats and log" region of that sheet. Option B is the more RPG-legible structure, not less.

**Spec change required:** Update the skill detail section of spec.md to record Option B as the selected layout and remove the option-A description. Update AC-05 to remove the "(A) or (B)" clause and specify Option B only.

**Implementation notes for Option B:**

- Desktop grid: `grid-cols-[1fr_1fr]` below the hero+actions block, with the XP bar chart in the left column and the XP history in the right column.
- The description (currently below the gate/XP bar in the current implementation) should move to the right column above the history feed on desktop — it contextualises the history. On mobile it stays in its current position (below the gate/XP card, before the chart).
- The delete action at the bottom remains full-width below the two-column grid.
- `BlockerGateSection` and `XPProgressBar` remain full-width in the hero block — they are not touched.

---

### 2. StatCard Orientation

**Recommendation: Remain vertical (icon above value) at 4-wide on desktop.**

Reasoning:

The four stat cards show: Total Skills (number), Active Gates (number), XP Today (number with thousands separator), Highest Tier (tier name string, optionally a TierBadge). The values are the primary information; the labels are secondary. In vertical orientation the value is large and prominent, the label is small below — the user scans four numbers across the row instantly.

Horizontal orientation (icon left, value right) works when the icon carries more semantic weight than the number — common in list-row contexts. Here the icons are decorative; the numbers are the point. Switching to horizontal orientation at 4-wide would shrink the value text to fit beside an icon in a narrower column, trading legibility for density. At 4-wide the cards are already relatively narrow (~25% of content width, so roughly 300-350px each at 1440px screen width with sidebar) — horizontal layout would make the value text feel cramped.

Additionally, vertical orientation is consistent with the RPG "stats panel" aesthetic. Character sheets in game UIs present stat blocks vertically (icon/name above, value below). Horizontal orientation reads more like a dashboard metrics widget, which conflicts with the design goal of matching the landing page's atmospheric quality.

The one adjustment that would help at 4-wide: ensure StatCard's internal padding scales with column width. If the current padding is `p-4` or `p-5`, that is fine; the card should not have a fixed internal min-width that causes overflow at narrow column widths.

---

### 3. Dashboard Activity Feed Position

**Recommendation: Below the skills grid (scrolled into view), not sticky right column.**

Reasoning:

The activity feed is secondary content. Its purpose is retrospective — it shows what has already happened. The skills grid is primary content — it shows the current state of all skills and is the primary navigation surface for the user's next action. Allocating a permanent 1/3 column to a retrospective feed takes horizontal space away from the skills grid, which would benefit from more room (2-column grid in a 2/3 column is meaningfully narrower than 2-column grid at full width).

The sticky column pattern is appropriate when the right panel drives or contextualises the left panel in real time — e.g., a filter panel, a detail pane for a selected item, or a cart. The activity feed does none of these. It does not update interactively as the user scrolls the skills grid, and it does not explain anything about the current skill state.

Additionally, the current dashboard already shows only 10 activity events. At 1/3 column width with `ActivityFeedItem` rows (each ~48-56px tall), 10 events occupy roughly 480-560px of height. This is a significant vertical commitment for a sticky panel that users are unlikely to consult more than once per session.

The practical scroll distance is small: a user with 5-10 skills lands on the skills grid immediately, and the activity feed is one scroll position below. On desktop with a wide layout, the skills grid is unlikely to be so tall that the activity feed is off-screen without scrolling at all.

**One exception to document:** If a future feature adds real-time activity (e.g., live session tracking visible in the feed), the sticky column should be revisited. The spec should note this as a reason to reconsider the layout when real-time activity is added.

---

## Flow Correctness

The end-to-end user flows are coherent. No dead ends were identified in the page-to-page navigation.

**Skills list to skill detail to back:** The skills list introduces a grid layout. Each card is a navigation target. The `← Skills` back link at the top of the skill detail page is already present in the current implementation and is unaffected by the layout change. No flow disruption.

**Dashboard to skill detail:** The dashboard features a primary skill card and activity feed items that both navigate to skill detail. The wider dashboard layout does not change these navigation targets; it only changes how many skills are visible without scrolling.

**Skill detail action buttons (Start Session / Log XP):** These are full-width buttons immediately below the hero and gate/XP section in the current implementation. Under Option B they remain full-width in the hero block. They must not be pushed into a column. The current implementation uses `flex gap-3` with `flex-1` on each button — this is correct and should be preserved.

**Account sub-page navigation:** Account has three routes (`/account`, `/account/password`, `/account/api-key`). The spec applies a 2-column layout to `/account` and keeps centered forms for the sub-pages. There is no back navigation from the sub-pages to `/account` specified in the spec. The current implementation should be checked to confirm whether `/account/password` and `/account/api-key` already have a back link. If they do not, this is a gap in the current app (not introduced by this spec), but the spec's wider layout makes it more visible — recommend adding a `← Account` back link on both sub-pages as part of this pass.

**Multi-step skill creation (`/skills/new`):** The spec leaves this as a centered form within the wider container. This is correct. Multi-step forms should not use wide multi-column layouts — the focused single-column form is the right pattern for data entry with a sequential step structure.

---

## Mobile Viability

The spec's mobile strategy is sound: all pages collapse to single column below `md` breakpoint, with `px-4` padding and no horizontal overflow.

**Specific concerns:**

1. **Dashboard stats grid on mobile:** The current implementation uses a 2x2 grid (`grid-cols-2`). The spec preserves this on mobile. This is correct — four stats in a 2x2 grid on a 375px screen gives each card roughly 165px width after gap and padding, which is workable for a number + label.

2. **Skills grid on mobile:** The spec correctly specifies single-column on mobile. The `auto-fill, minmax(~320px)` CSS Grid approach for desktop will naturally collapse to single column when the viewport cannot fit two 320px columns — this is a safe implementation pattern.

3. **Skill detail on mobile (Option B):** The two-column lower grid collapses to: hero+actions (full width), then XP chart (full width), then description (full width), then XP history (full width). This is a clean single-column reading order. The column-reversal concern that can arise with CSS Grid (where the "right" column appears first on mobile due to source order) does not apply here because chart and history are both secondary and their relative order on mobile (chart first, history second) is the correct reading sequence.

4. **Activity feed position on mobile:** With the recommended "below skills grid" position, mobile users see: stats, skills, activity feed — correct priority order.

5. **Touch target concern for SkillCard:** The spec adds hover lift to SkillCard. The spec correctly gates hover effects with `@media (hover: hover)`. The arch review reinforces this. The 44px minimum tap target (AC-22) applies to the card as a whole — SkillCard should have `min-h-[44px]` or equivalent. The current `SkillCard.tsx` likely meets this given it renders a name, tier badge, and XP bar, but the frontend agent should verify the card height does not drop below 44px for very short skill names with no streak.

6. **Account 2-column grid on mobile:** The spec says "settings sections in 2-column grid where sensible." On mobile this must revert to single column. The phrase "where sensible" is vague — the spec should be explicit that the account page uses `grid-cols-1` on mobile and `grid-cols-2` on `md+`.

7. **`max-w-[1500px] w-[90%]` on mobile:** At 375px, `w-[90%]` gives 337.5px of content width. Combined with the sidebar being hidden on mobile (bottom tab bar instead), this effectively gives full-width content with ~19px of horizontal padding on each side. This is appropriate.

---

## Navigation and Visual Balance

**Sidebar compatibility (D-017):** The arch review confirms `w-64` (256px) sidebar with `flex-1` on `<main>` is compatible with the new container strategy. The container (`max-w-[1500px] w-[90%] mx-auto`) lives inside `<main>`, not on `<main>` itself. At typical desktop widths (1440px), the available content width is 1440 - 256 = 1184px; 90% of that is ~1066px, which is comfortably below the 1500px cap and uses the space effectively. At narrower desktop (1024px): 1024 - 256 = 768px available; 90% = ~690px content width. This is a meaningful improvement over the current 672px max-w-2xl, and at this width a 2-column grid for skills is still viable at ~320px per column after gap.

**Visual balance at small desktop (1024px-1280px):** At 1024px the content area is ~690px wide. A 4-column stats grid gives ~160px per card — this works for vertical StatCard. A 2-column skills grid gives ~330px per card — this works for SkillCard. The dashboard right column (activity feed) at 1/3 of 690px would be ~230px, which is a viable narrow panel. However, since the recommendation is to place activity feed below the skills grid, this concern is moot for the dashboard. The skills page at 1024px will comfortably support 2-column grid; 3-column would be tight but the `minmax(320px)` auto-fill approach handles this gracefully by dropping to 2 columns.

**Bottom tab bar on mobile:** The tab bar is protected by D-017. The spec does not touch it. No visual imbalance introduced.

**Content reordering across breakpoints:** Under Option B for skill detail, the desktop column split (chart left / history right) presents no reordering issues. The CSS Grid source order matches the mobile reading order: chart appears in the DOM before history, which is the correct mobile sequence as well.

---

## Edge Cases

**Empty states:**
- Dashboard with no skills: Already handled in the current implementation with a "Begin Your Quest" call-to-action centered state. This state uses `max-w-2xl mx-auto` — after this spec, the empty state container should use the new outer layout container, not its own `max-w-2xl`. The shield illustration with `mx-auto w-24` centering will still work correctly.
- Skills list with no skills: Not explicitly specified in the spec. The spec should note that the skills list must handle an empty state gracefully — a centered empty state within the grid container. The filter bar should not render if there are no skills to filter, or it should render but be clearly inactive.
- Skill detail with no XP chart data (no activity in last 30 days): The current implementation conditionally renders the chart (`{xpChart && ...}`). Under Option B, if the chart is absent, the left column of the lower grid is empty. The spec should specify fallback behaviour: either the history section spans full width when the chart is absent, or a placeholder card occupies the left column. Leaving the left column empty on desktop produces an unbalanced layout.
- Skill detail with no activity history: The current implementation shows "No activity yet" text in the history section card. This is the correct pattern. Under Option B this appears in the right column, which is fine.

**Very long skill names:** The skill detail hero renders the skill name as `text-3xl font-bold`. Names beyond ~40 characters may wrap to a second line, which is acceptable. However, on the dashboard skill grid with a narrower column, SkillCard must handle overflow gracefully — truncation with a title attribute, or wrapping without breaking layout. The spec should note that SkillCard must handle names up to at least 60 characters without breaking the card grid.

**Many skills (50+):** The skills list with `auto-fill minmax(320px)` CSS Grid at ~1000px content width renders ~3 columns, so 50 skills produces ~17 rows. This is a long scroll but functionally correct. The filter bar (specified to span full width) helps users find skills without scrolling. No pagination is in scope.

**Few skills (1-2):** With `auto-fill` grid, 1 skill renders in the first grid cell — the remaining cells are empty. This produces blank horizontal space to the right of the single card. This is acceptable behaviour for CSS Grid, but the dashboard "Continue where you left off" featured skill card should be a special case: it should always be full-width, not placed in the skill grid (the current implementation already does this correctly).

**Loading states:** The current dashboard loading state uses hardcoded `bg-gray-700` for skeleton elements. These will be caught by the AC-13 colour grep. Loading skeletons should use `var(--color-bg-elevated)` or a dedicated `--color-skeleton` token. The spec does not mention loading state colour migration — this should be added to the colour migration audit table.

**Small desktop screens (1024px-1280px):** Addressed in Navigation and Visual Balance above. The layout is viable at these widths.

---

## Accessibility

**44px tap targets (AC-22):** The action buttons on skill detail (Start Session, Log XP) use `min-h-[48px]` — compliant. The bottom tab bar is protected and not touched. SkillCard and StatCard are interactive cards — they must ensure their clickable wrapper has a minimum height of 44px. The spec should explicitly note that the `onClick` wrapper of SkillCard must have `min-h-[44px]` and the entire card surface must be the tap target (not just a button inside the card).

**Hover and focus parity:** The spec adds hover lift effects to SkillCard and StatCard. The spec does not mention focus-visible styles for these cards. Keyboard users navigate interactive cards with Tab and activate with Enter/Space. The hover lift should have a corresponding `:focus-visible` state (visible focus ring, ideally with an outline using `var(--color-accent)` at 2px offset). AC-14 and AC-15 are hover-only — they should be extended to include focus-visible parity. The arch review does not address this either.

**Screen reader considerations:** The dashboard stats grid uses `role="region" aria-label="Stats"` in the current implementation — this is good and should be preserved after the layout change. The skill detail page's two-column layout under Option B does not change the DOM order, only the visual presentation via CSS Grid `order` property if any. Since no `order` changes are needed (chart already comes before history in DOM and in the recommended mobile-first reading order), there is no screen reader impact.

**`@media (hover: hover)` guard:** The spec specifies this guard for hover lift effects. This is correct and essential for iOS — a tap on a card should not produce a lifted state that persists until the next interaction. The arch review reinforces this. The spec (D-HOVER) mentions the guard but AC-14, AC-15, AC-16 do not explicitly require it. The ACs should specify `@media (hover: hover)` guard as a requirement, not just the spec prose.

**Motion preference:** The `var(--motion-scale)` pattern from the previous polish pass is correctly extended here. `prefers-reduced-motion` is honoured through the `rpg-clean` theme's `--motion-scale: 0`. This is an acceptable implementation if the theme selection maps to the user's motion preference. If users can select `rpg-clean` explicitly (via theme picker in account settings), the motion accommodation is user-controlled rather than system-controlled — this is intentional given the design system, but it means users who need reduced motion must know to switch themes. No new concern is raised by this spec; it was pre-existing.

---

## Recommended Spec Changes

The following changes should be applied to `spec.md` before implementation begins:

1. **Resolve skill detail option:** Update the skill detail section under "Page-by-Page Layouts" to remove Option A and specify Option B as the selected layout. Add a note that the description moves to the right column (above history) on desktop. Update AC-05 to remove the `(A) or (B)` conditional and specify Option B.

2. **Account page mobile collapse:** In the Account page description, add an explicit note: "On mobile, the 2-column settings grid collapses to single column (`grid-cols-1`)." The current spec says "2-column grid where sensible" without specifying the mobile fallback.

3. **Skill detail chart absent state:** Add to the skill detail section: "If no XP chart data is available (new skill, no activity in last 30 days), the left column of the lower grid is replaced by the history section spanning full width (`col-span-2`)."

4. **Empty state for skills list:** Add to the skills list section: "Empty state (no skills) renders a centered full-width call-to-action within the grid container. The filter bar is not rendered when there are no skills."

5. **Loading state colour migration:** Add to the Colour Migration Audit table: `dashboard/page.tsx` loading skeleton uses `bg-gray-700` — replace with `var(--color-bg-elevated)` or a suitable surface token. Add corresponding AC.

6. **Focus-visible parity for interactive cards:** Extend AC-14 and AC-15 to read: "SkillCard and StatCard have `:focus-visible` outline using `var(--color-accent)` at 2px offset, matching the hover lift state as a keyboard-accessible equivalent."

7. **`@media (hover: hover)` guard in ACs:** Extend AC-14 and AC-15 to explicitly require: "Hover lift is gated by `@media (hover: hover)` to prevent stuck-lift on iOS touch devices."

8. **SkillCard minimum tap target:** Add to the SkillCard component changes section: "The SkillCard clickable wrapper must have `min-h-[44px]`; the full card surface is the tap target."

9. **Activity feed sticky column:** Update the Dashboard section to specify "activity feed appears below the skills grid, not as a sticky right column" as the resolved layout. Remove the sticky-right-column option text.

None of these changes alter the architecture, schema, or binding decisions. They are clarifications and gap-fills that will prevent implementation ambiguity.
