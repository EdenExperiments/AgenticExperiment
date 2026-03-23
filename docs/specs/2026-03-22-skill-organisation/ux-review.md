# UX Review: Skill Organisation (Phase 3)

**Spec:** `docs/specs/2026-03-22-skill-organisation/spec.md`
**Reviewer:** UX Agent
**Date:** 2026-03-23
**Decision:** APPROVED (re-review after CHANGES-NEEDED)

---

## Flow Correctness

The end-to-end user flow is sound. Category and tag data flows from the API into the list and detail pages without introducing new routes, keeping the mental model flat. All previously identified flow gaps are now closed:

- Multi-filter combination is defined: AND logic, single-select per filter type (P3-D8). AC-V1, AC-V2, and AC-V4 all reference this rule, so implementation has a single source of truth.
- The tag save gesture is fully specified: Enter key or comma commits to a local buffer, blur also commits, and the buffer is only written to the server on an explicit "Save" button press (P3-D11, AC-V7). Navigation-away without saving will not create orphan tags.
- The favourite toggle has a complete async contract: optimistic update with rollback on API failure, and a dimming behaviour (not immediate disappearance) when a skill is un-favourited while the favourites filter is active (P3-D12, AC-V3, AC-V8).

No dead ends or ambiguous transitions remain.

---

## Mobile Viability

All mobile concerns from the original review are addressed.

The two-row toolbar layout is now prescribed in P3-D9: Row 1 carries the search input (flex-1) and the favourites icon button — the two highest-frequency controls, always visible; Row 2 is a scrollable pills strip carrying sort, tier, category, and tag filters. This is the correct separation for a 375px viewport and avoids the single-row overflow problem.

Minimum 44px tap targets are called out explicitly in AC-V3 for both the toolbar favourites button and the per-card favourite icon. AC-V5b clarifies that only the category emoji appears on list cards (small, inline next to skill name); tags do not appear on cards (P3-D10). Card crowding on single-column mobile layout is not a concern.

---

## Navigation Changes

None. No new routes are introduced. Tag management is embedded in the skill detail page. The Out of Scope section explicitly notes that the edit-modal migration (`SkillEditModal`) is already done and is not part of this feature, preventing scope bleed. Back-navigation depth is unchanged.

---

## Theme Awareness

P3-D13 specifies that tag and category text uses `--font-body` in all themes, not `--font-display`. Press Start 2P is correctly reserved for h1/h2 and stat values per the shared style guide. AC-V5, AC-V7, and AC-V9 all reference this rule.

P3-D14 specifies the active-state colour for the favourite icon (`--color-accent`) with per-theme values: warm amber for Retro, cyan for Modern, accent colour for Minimal. AC-V9 requires all new elements to use design tokens with no hardcoded values.

No interactions are theme-dependent in a way that would break across themes.

---

## Edge Cases

All previously unaddressed states are now covered:

- **No tags:** Tag filter pill is hidden entirely when the user has no tags (AC-V2). This is cleaner than an empty dropdown and correctly guides users to create tags from the skill detail page.
- **No favourited skills + filter active:** AC-V3 specifies "No favourited skills yet — star a skill to add it here."
- **Combined filter empty state:** AC-V4 specifies "No skills match your filters" with a "Clear filters" button that resets all filters. The button is present when multiple filters are active simultaneously.
- **Null category on detail hero:** AC-V5 specifies the section is not rendered when category is null — no placeholder, no blank space, layout is stable.
- **Max tags reached:** AC-V7 specifies the input is disabled with inline message "Maximum 5 tags reached" when 5 tags are present. Tag save failure shows an inline error and reverts to server state.
- **Favourite toggle API failure:** P3-D12 and AC-V3/AC-V8 specify rollback to previous state on PATCH failure.

---

## Approval

APPROVED
