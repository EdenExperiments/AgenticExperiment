# Spec Gateway — Site-Wide UI Overhaul

**Decision:** GO
**Date:** 2026-03-21

---

## Checklist

- [x] **All ACs are verifiable assertions** — Every AC specifies a concrete, checkable condition (grep patterns, breakpoint class names, CSS property values, pixel sizes). AC-21 and AC-23 are explicitly marked "(Manual QA)" — this is acceptable because they cover visual and perceptual qualities that cannot be expressed as code assertions; the manual scope is bounded and documented.
- [x] **All open questions are resolved** — Three open questions were documented. All three are resolved: skill detail layout (Option B), StatCard orientation (vertical), dashboard activity feed position (below grid). Resolution is recorded in both the spec's "Resolved Questions" section and the ux-review.
- [x] **Arch review is APPROVED** — arch-review.md verdict is APPROVED with no CHANGES-NEEDED items.
- [x] **UX review is APPROVED** — ux-review.md verdict is APPROVED with no CHANGES-NEEDED items.
- [x] **All UX recommended spec changes have been applied** — Nine recommendations issued. All nine are present in the approved spec (Option B in layout section + AC-05; account mobile collapse explicit in Account section; chart-absent col-span-2 in skill detail section; skills list empty state; dashboard skeleton AC-13a; focus-visible in AC-14/AC-15; @media(hover:hover) guard in AC-14/AC-15; SkillCard min-h-[44px] in component section; activity feed below-grid in Dashboard section).
- [x] **All arch review risks have mitigations** — R-LAYOUT-01 (double-container): mitigated by AC-01 + post-implementation grep. R-LAYOUT-02 (form centering): mitigated by AC-08 and inner mx-auto pattern. R-HOVER-01 (iOS stuck-lift): mitigated by @media(hover:hover) guard in D-HOVER and AC-14/AC-15. R-TOKEN-01 (--motion-scale availability): mitigated by var(--motion-scale, 0) fallback and pre-implementation verification step in arch notes. R-SHARED-01 (barrel exports): low risk; no new components added, no new barrel entries required.
- [x] **Zones and shared packages are identified** — Zones Touched table in spec names all 11 paths with agents. Shared packages (packages/ui/src/) are flagged for coordination. Parallelisation Map in arch-review specifies Batch 1/2/3 sequencing with explicit rationale.
- [x] **Binding decisions are protected** — AC-24 guards D-020 (tier colours). AC-25 guards D-021 (gate layout). AC-26 guards D-017 (navigation). Arch review section "Binding Decision Compliance" independently verifies all four relevant decisions (D-017, D-020, D-021, D-034).
- [x] **Scope is contained** — Non-goals explicitly exclude landing page, auth pages, NutriLog/MindTrack, API/schema changes, and recently polished components. No open-ended language in ACs.

---

## Notes

**Implementation guidance:**

1. **Execution order.** Follow the Parallelisation Map from arch-review.md exactly. The UX review is now complete and Option B is recorded in the spec, so `skills/[id]/page.tsx` (arch-review Batch 3) can execute alongside Batch 2 — the blocking condition is satisfied. Batch 1 (shared components + layout.tsx) must still land before Batch 2.

2. **Shared package prop discipline.** The arch review requires that no new required props are added to SkillCard, StatCard, or ActivityFeedItem. If hover-lift behaviour cannot be implemented without a new prop, it must be opt-out with a default-on boolean. This constraint is stated in arch-review but not captured as a numbered AC in the spec. The frontend agent must treat this as a hard implementation constraint.

3. **`rpg-clean.css` verification.** Before implementing hover transitions, confirm whether `rpg-clean.css` defines `--motion-scale`. If it sets a non-zero value, AC-17 will silently fail. File a bug against `rpg-clean.css` before proceeding with hover implementation if the value is missing or non-zero.

4. **Post-implementation grep.** Run the AC-13 grep pattern `(bg|text|border)-(gray|orange|amber|red|blue|green)-\d` across all in-scope files after implementation. Exclude `.tier-accent-*` classes. This is the definitive colour migration verification step.

5. **Sidebar verification.** `packages/ui/src/Sidebar.tsx` must be verified for compatibility with the new `max-w-[1500px] w-[90%] mx-auto` container but must not be modified. The arch review confirms `w-64` with `flex-1` on `<main>` is compatible. Verify in a browser at 1024px and 1440px widths.

6. **Account back links.** The UX review noted that `/account/password` and `/account/api-key` may lack `← Account` back links. This is a pre-existing gap, not introduced by this spec. The frontend agent should check and add them as part of this pass — the wider layout makes the absence more visible.

7. **Dashboard empty state container.** The UX review noted the dashboard empty state uses `max-w-2xl mx-auto` today. This must be updated to use the new outer layout container (or rely on the inherited container from `(app)/layout.tsx`) after AC-01 removes child-page max-width overrides.
