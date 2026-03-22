# Architecture Review — Site-Wide UI Overhaul

**Verdict:** APPROVED
**Date:** 2026-03-21

---

## Schema Impact

None. The spec explicitly constrains itself to a pure frontend styling pass. No database tables, columns, migrations, or API endpoints are added or modified. The Go API layer is untouched.

---

## Service Boundaries

Zone assignments in the spec's Zones Touched table are correct and match the zone map in CLAUDE.md:

- `packages/ui/src/` changes (SkillCard, StatCard, ActivityFeedItem) are correctly attributed to the frontend agent with a shared-coordinate flag.
- `apps/rpg-tracker/app/(app)/` page changes are correctly attributed to the frontend agent.
- Sidebar (`packages/ui/src/Sidebar.tsx`) is listed as verify-only — no changes expected. This is the correct conservative posture; the `w-64` fixed-width sidebar is compatible with the proposed fluid content area because the `flex-1` on `<main>` already absorbs all remaining horizontal space.

One coordination risk: SkillCard, StatCard, and ActivityFeedItem are in `packages/ui/src/`, which is shared across all frontend apps. Changes to these components must not break NutriLog or MindTrack consumers. Since both are scaffolded-only (D-004), the risk is low, but the frontend agent must verify that no import or prop signature changes are made — only CSS class replacements and the addition of CSS custom property transitions. No new required props may be added; if hover-lift CSS cannot be achieved without a new prop, make it opt-out with a default-on boolean.

---

## Token System Consistency

The CSS variable usages proposed in the spec are fully consistent with the token files.

Verified mappings:

| Proposed usage | Token source | Resolved value (rpg-game) |
|---|---|---|
| `var(--color-bg-elevated)` | `rpg-game.css` | `#1a1a2e` |
| `var(--color-bg-surface)` | `rpg-game.css` | `#12121c` |
| `var(--color-border)` | `rpg-game.css` | `rgba(212, 168, 83, 0.2)` |
| `var(--color-accent)` | `rpg-game.css` | `#d4a853` |
| `var(--color-accent-muted)` | `rpg-game.css` | `rgba(212, 168, 83, 0.15)` |
| `var(--color-text-primary)` | `rpg-game.css` | `#f0e6d3` |
| `var(--font-display)` | `rpg-game.css` | `'Cinzel', 'Georgia', serif` |
| `var(--font-body)` | `rpg-game.css` | `'Inter', system-ui, sans-serif` |
| `var(--motion-scale)` | `rpg-game.css` | `1` (full) |

`--motion-scale` is defined in `rpg-game.css` as `1`. The spec states that `rpg-clean` sets it to `0` (instant transitions). Confirm that `rpg-clean.css` defines `--motion-scale: 0` — this token is not present in `base.css`, so it must exist in each theme file. If `rpg-clean.css` omits this token, `var(--motion-scale, 0)` would fall back to the inline default `0`, which is the correct safe default. The fallback syntax `calc(150ms * var(--motion-scale, 0))` used in the spec is the right approach.

One gap in `base.css`: the animation duration tokens (`--duration-fast: 150ms`) exist and could replace the hardcoded `150ms` in hover transitions. Recommend using `calc(var(--duration-fast) * var(--motion-scale, 0))` instead of `calc(150ms * var(--motion-scale, 0))` for consistency with the token system. This is a recommendation, not a blocker.

No new CSS tokens are required. No new token files need to be created.

---

## Binding Decision Compliance

**D-017 (Navigation):** Fully respected. The spec's non-goals explicitly exclude sidebar and navigation component changes. The layout change in `(app)/layout.tsx` only adds a container wrapper inside `<main>` — the `Sidebar` and `BottomTabBar` components remain untouched in structure and props. The `hideNav` logic for multi-step flows is unaffected.

**D-020 (Tier colours):** Fully respected. AC-24 explicitly preserves `.tier-accent-*` classes. The colour migration grep exclusion in AC-13 correctly carves out tier accent classes from the hardcoded-colour check.

**D-021 (Gate layout):** Fully respected. AC-25 and the non-goals list explicitly protect `BlockerGateSection` from modification. The gate section's position (replacing XP bar, above the fold) is not altered by page layout changes — it remains within the content flow of the page, which will now use a wider container but the gate section itself is unchanged.

**D-034 (Quick Log — time-primary input):** Explicitly noted as out of scope. No conflict.

**D-033 (Gate auto-clear):** No frontend relevance to this spec. No conflict.

No binding decisions are reopened or violated.

---

## Risks & Mitigations

**R-LAYOUT-01: Container nesting conflict.** The current `(app)/layout.tsx` has no container on `<main>` — each child page owns its width. If the container (`max-w-[1500px] w-[90%] mx-auto`) is added to `<main>` in the layout, pages that currently use `max-w-2xl` or `max-w-lg` as their own outer container will create a double-container situation (outer 90%/1500px, inner max-w-2xl). The spec acknowledges this: AC-01 requires that no child page retains its own `max-w-2xl`. The implementation must sweep all in-scope pages for their own outer max-width constraints and remove them. Risk is moderate — missing one page will produce no visible error but inconsistent layout. **Mitigation:** Add a lint check or grep for `max-w-2xl` across all in-scope page files as a post-implementation verification step.

**R-LAYOUT-02: Skill create/edit form centering.** Skill create (`/skills/new`) sets its own `max-w-lg` today. AC-08 allows this page to keep a centered form container (`max-w-xl` or `max-w-2xl`) within the new outer layout. This is the correct behaviour for forms. The implementation must apply the inner centering via `mx-auto` on the form container, not on `<main>`. No conflict with the outer layout container.

**R-HOVER-01: Hover effects on touch devices.** `translateY(-2px)` on hover does not fire on mobile touch unless the element receives `:hover` via tap. On iOS, `:hover` persists after tap until another tap elsewhere. This is generally benign for cards but can cause a "stuck lift" effect. **Mitigation:** Consider using `@media (hover: hover)` to gate the hover styles, preventing the effect from applying on touch-primary devices. This is consistent with AC-22 (44px tap target) and AC-07 (no mobile regressions). The spec does not specify this guard, so the frontend agent should add it.

**R-TOKEN-01: `--motion-scale` availability.** As noted above, `--motion-scale` is only defined in `rpg-game.css`. If it is absent from `rpg-clean.css`, the fallback `var(--motion-scale, 0)` will produce 0ms duration on rpg-clean, which matches AC-17. Verify `rpg-clean.css` before implementation — if the file defines `--motion-scale: 1`, AC-17 would fail silently.

**R-SHARED-01: Shared package barrel exports.** Any new exports from `packages/ui/src/` must be added to the package barrel (`index.ts`). Based on the retro note in memory (`session_2026-03-18-plan-b2-progress.md`), barrel exports were a known friction point in the B2 plan. This spec does not add new components — it modifies existing ones — so no new barrel entries are needed. Low risk.

---

## ADR

None required. No significant new technical decisions are being made. The container strategy (D-LAYOUT) and card hierarchy (D-CARD-TREATMENTS) are local implementation decisions within an already-approved design system. The `--motion-scale` pattern was established in the previous skill-detail polish pass and is being extended consistently.

---

## Shared Package Changes

Files in `packages/ui/src/` that must change:

- `packages/ui/src/SkillCard.tsx` — replace `orange-500/20` and `orange-400` hardcoded classes; add hover lift with `--motion-scale` transition
- `packages/ui/src/StatCard.tsx` — add hover lift with `--motion-scale` transition
- `packages/ui/src/ActivityFeedItem.tsx` — add subtle hover background highlight

Files that must NOT change (spec constraint):
- `packages/ui/src/BlockerGateSection.tsx`
- `packages/ui/src/XPBarChart.tsx`
- `packages/ui/src/GateVerdictCard.tsx`
- `packages/ui/src/TierBadge.tsx`
- `packages/ui/src/XPProgressBar.tsx`
- `packages/ui/src/Sidebar.tsx`

---

## Parallelisation Map

Tasks that CAN run in parallel:
- Dashboard page layout (`apps/rpg-tracker/app/(app)/dashboard/page.tsx`) — no dependency on other page changes
- Skills list page layout (`apps/rpg-tracker/app/(app)/skills/page.tsx`) — no dependency on other page changes
- Account page layout + colour migration (`apps/rpg-tracker/app/(app)/account/page.tsx`) — no dependency on other page changes
- Account sub-pages colour migration (`account/password/page.tsx`, `account/api-key/page.tsx`) — can run together, no shared state
- Skill create and skill edit layout (`skills/new/page.tsx`, `skills/[id]/edit/page.tsx`) — same treatment, can run in parallel with each other

Tasks that MUST be sequenced (and why):

1. **`packages/ui/src/` component changes FIRST** — SkillCard, StatCard, ActivityFeedItem must be updated before any page that renders them, because pages will depend on the components' CSS variable usage and hover behaviour being in place. Implementing the Dashboard multi-column layout before SkillCard supports fluid width would produce a working layout with a broken component inside it — an unstable intermediate state.

2. **`(app)/layout.tsx` container change SECOND** (after shared components, before or alongside pages) — All pages inherit the container. The container change is low-risk (additive only), but it must land before page-level max-width removals are tested, otherwise page tests run against the old narrow layout. Can land in the same batch as the shared component changes.

3. **Skill detail page (`skills/[id]/page.tsx`) LAST among pages** — This page depends on the UX agent's selection of Option A vs Option B (open question in spec). It should not be implemented until `ux-review.md` documents the selected layout option. All other pages are unambiguously specified and can proceed without the UX review answer.

Recommended execution order:
```
Batch 1 (parallel):
  - packages/ui/src/SkillCard.tsx
  - packages/ui/src/StatCard.tsx
  - packages/ui/src/ActivityFeedItem.tsx
  - apps/rpg-tracker/app/(app)/layout.tsx

Batch 2 (parallel, after Batch 1):
  - dashboard/page.tsx
  - skills/page.tsx
  - skills/new/page.tsx
  - skills/[id]/edit/page.tsx
  - account/page.tsx
  - account/password/page.tsx
  - account/api-key/page.tsx

Batch 3 (after UX review answer):
  - skills/[id]/page.tsx
```

---

## Notes for Implementation

1. **Container placement in layout.tsx.** The `max-w-[1500px] w-[90%] mx-auto` wrapper should wrap `{children}` inside `<main>`, not replace `<main>`. The `flex-1` class must stay on `<main>` to keep the sidebar/content flex relationship intact. The inner wrapper handles the centred max-width.

2. **Hover guard for touch.** Add `@media (hover: hover) { .card:hover { transform: translateY(-2px); } }` or equivalent Tailwind arbitrary variant `[@media(hover:hover)]:hover:` to prevent stuck-lift on iOS. This is not in the spec but is required for AC-07 (no mobile regressions).

3. **`--duration-fast` token.** Prefer `calc(var(--duration-fast) * var(--motion-scale, 0))` over `calc(150ms * var(--motion-scale, 0))`. Both resolve to the same value today, but using the token keeps the system internally consistent.

4. **Grep verification.** After implementation, run the AC-13 grep pattern `(bg|text|border)-(gray|orange|amber|red|blue|green)-\d` across all in-scope files to catch any missed instances. Exclude `.tier-accent-*` classes as specified.

5. **Verify `rpg-clean.css` defines `--motion-scale`.** Before the hover transition implementation, confirm whether `rpg-clean.css` sets `--motion-scale: 0`. If it does not, the `var(--motion-scale, 0)` fallback in the spec is already correct and AC-17 is satisfied by fallback. If it does set a non-zero value, AC-17 will fail — file a bug against `rpg-clean.css` to add `--motion-scale: 0`.

6. **Skill detail layout decision.** Do not begin `skills/[id]/page.tsx` implementation until the UX agent documents the selected option (A or B) in `ux-review.md`. The spec correctly flags this as an open question for the UX agent.
