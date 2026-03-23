# UX Review: Primary Skill Focus + Quick Session (Phase 4)

**Spec:** `docs/specs/2026-03-23-primary-skill-focus/spec.md`
**Reviewer:** UX agent
**Date:** 2026-03-23
**Status:** CHANGES-NEEDED

---

## Flow Correctness

The end-to-end flow is sound. Dashboard loads → focus card appears (pinned or algorithmic) → user taps "Start Session" → navigates to `/skills/[id]/session`. The pin/unpin toggle mirrors the existing favourite toggle pattern, which is a good choice for consistency.

Two gaps in the specified flow:

**Gap 1 — Pin from outside the dashboard.** The spec places the pin/unpin icon exclusively on the focus card. A user who wants to pin a specific skill they can see in the skill grid cannot do so from where they are looking — they must wait for the algorithm to surface it or navigate away. The spec is silent on whether the pin action will also appear on `SkillCard` or the skill detail page. This does not need to be solved in Phase 4, but the spec should explicitly state "pin action is dashboard-focus-card only in Phase 4; skill detail page pin is deferred" so the frontend agent does not accidentally add it, and so the user expectation is set correctly.

**Gap 2 — "Log XP" button re-targeting is mentioned but not specified as an AC.** The spec notes (Frontend Changes) that the existing "Log XP" button should be re-targeted from `featuredSkill` (first skill) to the focus skill. This is a behaviour change with a potential regression path (what if the focus skill and `skills[0]` differ at the exact moment of a race condition or stale query?). It must be called out as an explicit AC, not just a prose note.

**No dead ends found.** Toggle unpin, deleted pinned skill (ON DELETE SET NULL + algorithm fallback), and zero-skill empty state are all accounted for.

---

## Mobile Viability

The focus card specification is broadly mobile-viable. The following items need confirmation or tightening:

**Start Session button tap target.** The spec says the "Start Session" button is a `Link` component. The shared style guide minimum is `min-h-[48px]`. The spec does not state a minimum height for the button. This must be enforced explicitly in the AC or component spec — the existing "Log XP" button in the current implementation sets `min-h-[48px]` as a pattern, but it needs to be called out for the new button too.

**Pin/unpin icon button tap target.** The spec describes this as a "small icon button". Icon-only buttons are a persistent mobile accessibility failure mode. The shared style guide requires all interactive elements to have visible focus states (accessibility section), but does not state a minimum tap target size explicitly. A small pin icon is at high risk of being implemented below 44x44px. The spec should require a minimum 44x44px tap area (padding wrapper) for the pin icon button.

**Focus card on narrow viewports.** AC-V7 says "full-width on mobile, constrained width on desktop". This is correct and sufficient. No additional concern here.

**XP progress bar on the focus card.** A compact XP bar on a full-width mobile card is fine — the current implementation already uses XP bars in SkillCard at similar widths. No issue.

**Scroll position.** The focus card sits above stats. On a small viewport the focus card alone may consume most of the initial viewport height, pushing stats below the fold. This is acceptable given the card's purpose (it is the primary CTA), but the spec should note that the card's height should be bounded (e.g., `max-h` or a compact layout) so stats remain reachable without excessive scroll. A recommendation, not a blocker.

---

## Navigation Changes

**New route consumed: `/skills/[id]/session`**
The spec references this route as the target of "Start Session". This route is listed as a spec dependency but its existence is not confirmed in scope. The spec should state whether this route already exists or is a dependency from another feature. If it does not exist, the "Start Session" button will navigate to a 404. The spec should include a dependency note: "AC-V3 requires `/skills/[id]/session` to exist as a reachable route."

**No new routes are added by this feature.**

**No bottom tab changes.** The focus card is a dashboard-internal element.

**Back navigation.** Tapping "Start Session" pushes to the session route. Back navigation from session returns to dashboard — focus card will be visible on return, which is the correct state. No issue.

---

## Theme Awareness

AC-V6 requires design tokens only — no hardcoded values. This is correct and aligns with shared style guide rules.

The spec does not address theme-specific label copy. The dashboard page guide specifies that each theme frames the primary skill differently:
- Minimal: neutral ("Focus")
- Retro: narrative ("Main Quest")
- Modern: mission language ("Active Mission")

The spec uses only "Suggested" and a pin icon. This is functionally correct but the "Suggested" label and any other copy in the focus card (e.g., the card's section heading if one exists) should be theme-aware strings or at minimum flag this as a known simplification. The spec should note: "Focus card copy uses theme-neutral labels in Phase 4; theme-flavoured copy (Main Quest / Active Mission framing) is deferred to the visual implementation phase."

The pin icon itself (filled vs. outlined toggle state) must use token-based colours, not hardcoded icon fill values — this is implied by AC-V6 but worth calling out for the icon button specifically.

No interactions are theme-dependent in a way that blocks Phase 4.

---

## Edge Cases

The following cases are either missing from the spec or need explicit coverage:

**EC-1 — Pinned skill belongs to the user but has been archived or is in an error state.** The spec handles deletion via ON DELETE SET NULL, but does not address a skill that exists in the DB but is missing from the `listSkills` response (e.g. a filter, pagination, or future soft-delete scenario). If `primary_skill_id` is set but the matching skill is not found in the skills array on the client, the algorithm silently falls back (spec step 1 → step 2). This fallback is correct behaviour, but the spec should name it explicitly: "if `primary_skill_id` is set but the skill is not present in the skills list, treat as no pin and run the algorithm."

**EC-2 — Single skill in the list.** With exactly one skill, the algorithm and pin both resolve to the same skill. The focus card and the skills grid show the same skill. The "Log XP" button targets the same skill. This is fine functionally, but the pin/unpin toggle becomes a no-op in terms of outcome (unpinning just re-selects the same skill algorithmically). No UX change needed, but the spec should confirm this is expected and acceptable.

**EC-3 — Pinned skill has no activity and zero streak.** A pinned skill with no prior sessions shows the focus card with zero streak display. AC-V2 requires streak display — the spec says "if > 0". This is handled (streak only shows when > 0). No issue, but make this conditional explicit in the component spec ("streak row omitted when current_streak is 0 or absent").

**EC-4 — Algorithmic suggestion with no favourites and all-zero streaks.** The spec covers this with the final fallback (most recently updated). Confirmed covered.

**EC-5 — Loading state for the pin/unpin mutation.** The spec specifies a loading skeleton for initial load (AC-V9) but does not describe the pin/unpin mutation loading state. When the user taps the pin icon, what happens while the PATCH is in flight? There should be an explicit statement: either the icon enters a disabled/loading state (prevents double-tap), or optimistic update is used. Without this, rapid taps could fire multiple competing requests. The spec should require the pin button to be disabled during the mutation.

**EC-6 — The explicit unpin path is toggle-only.** This is noted in the spec as an accepted design decision. However, from a UX perspective, a user who has pinned a skill may not discover that tapping the filled pin icon unpins it — the toggle direction is ambiguous to new users. The spec should add a tooltip or accessible label to the filled pin state: e.g., `aria-label="Unpin this skill"` vs `aria-label="Pin this skill"` depending on state. This does not require a new AC but should be named in the component spec.

---

## Approval

CHANGES-NEEDED

1. **Add explicit AC for "Log XP" button re-targeting** — the prose note in Frontend Changes must become a testable AC (e.g., "AC-V10: Log XP button targets the focus skill, not `skills[0]`").

2. **Add explicit AC for Start Session tap target minimum height** — `min-h-[48px]` on the Start Session Link, matching the existing Log XP pattern.

3. **Add explicit requirement for pin icon button minimum tap area** — 44x44px minimum touch target via padding wrapper, not icon size alone.

4. **Confirm or gate the `/skills/[id]/session` route dependency** — state whether the route exists. If not, AC-V3 must be conditional on that route being available, or "Start Session" must render as disabled/hidden until the session feature ships.

5. **Name the "primary_skill_id set but skill not in list" fallback explicitly** — add to the algorithm description: treat as no pin, run algorithm from step 2.

6. **Add pin mutation loading/disabled state requirement** — pin button must be disabled while the PATCH is in flight to prevent double-fire.

7. **Specify theme-neutral copy as an explicit Phase 4 constraint** — note that "Suggested" and pin icon are Phase 4 simplifications; theme-flavoured label copy is deferred to the visual implementation pass, aligning with the dashboard page guide's per-theme framing.

8. **Add accessible label requirement for pin toggle states** — `aria-label` must reflect current toggle direction ("Pin this skill" / "Unpin this skill") so the action is discoverable by assistive technology and reduces ambiguity for sighted users via tooltip.
