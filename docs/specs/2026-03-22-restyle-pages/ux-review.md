# UX Review — Restyle Existing Pages (F-023 Phase 1)

**Reviewed by:** UX Agent
**Spec:** `docs/specs/2026-03-22-restyle-pages/spec.md`
**Date:** 2026-03-22

---

## Flow Correctness

The end-to-end user flow is largely sound. Token reconciliation and per-theme restyling are purely visual and do not alter any navigation paths. However, the skill edit → modal conversion requires scrutiny.

**Edit flow conversion (dedicated page → modal):**
The current `skill-detail/page.tsx` navigates to `/skills/[id]/edit` via a plain `<Link>` (line 158: `href={`/skills/${id}/edit`}`). The spec (AC-39) removes that page and installs a `redirect()` at the same path back to `/skills/[id]`. This is correct for bookmarked URLs or back-navigation from the old route — those will land cleanly on the skill detail page.

One gap: the spec defines the modal `onClose` and `onUpdate` props (AC-36) but does not specify what happens on a successful update. The current edit page calls `qc.invalidateQueries` and `router.push('/skills/[id]')` on success. The modal must do the same cache invalidation (both `['skill', id]` and `['skills']` query keys) and close itself. This is implied by AC-40 but not made explicit. If the implementer omits query invalidation the skill name/description will be stale on the detail page after a successful modal update.

**Preset skill guard:**
AC-40 states the edit button is only available for custom skills. The current edit page has this guard at the API level (PUT returns an error for presets) but no guard at the UI level — the Edit link is always rendered on skill detail. The modal conversion is an opportunity to hide or disable the trigger for preset skills. The spec says the "preset check preserved from current edit page logic" but the current page has no UI-level check. If the trigger remains always-visible, preset users will open the modal, hit a submit error, and have no way to understand why. The spec should clarify: either hide the trigger for presets, or show a disabled trigger with an explanatory tooltip.

**Activity feed sidebar flow (AC-9):**
On desktop the activity feed moves from a below-fold section to a sidebar. Users who have bookmarked or muscle-memorised scrolling down to the feed will find it in a new location. This is a low-risk change — the feed was always secondary and the sidebar position is a UX improvement — but the spec does not mention any migration concern. No action required; noting for awareness.

**Navigation after modal close:**
When the edit modal is dismissed via Cancel or ESC (AC-37), the user returns to the skill detail page with no navigation change. The focus return requirement (AC-37: "Focus returns to the trigger element on close") correctly handles keyboard users. Flow is complete with no dead ends.

---

## Mobile Viability

**Activity feed sidebar (AC-9) — viable.**
The spec explicitly requires CSS grid (`grid-template-columns: 1fr` on mobile, `1fr minmax(280px, 320px)` on desktop at >1024px). Mobile shows a single column with feed below fold. This is a correct mobile-first approach and matches the page guide specification. No JS repositioning. Confirmed viable.

**Tablet breakpoint gap (768–1024px):**
The spec's AC-9 grid switches at `>1024px`. Between 768px and 1024px (tablet), the sidebar nav is shown (Sidebar uses `hidden md:flex`; `md` = 768px) but the activity feed remains single-column (feed is below fold). This means tablet users see the desktop sidebar nav but the mobile feed layout. This is acceptable — the feed sidebar cutoff at 1024px prevents it from becoming too cramped at tablet widths. The 280px minimum on the feed column would compress content unacceptably at 768–1024px. No action required.

**Edit modal on mobile:**
The spec does not specify modal sizing or positioning on small screens. The current `ConfirmModal` and `QuickLogSheet` use a bottom-sheet pattern on mobile (they render with `rounded-t-3xl md:rounded-3xl` sliding up from bottom). The new `SkillEditModal` has no defined mobile layout in the spec. A full-screen modal on a 375px device with two inputs and two buttons is workable, but if the modal renders centred with `max-w-md` it could overflow or clip on very small viewports.

The `QuickLogSheet` already implements the correct mobile pattern: full-width bottom sheet with `safe-area-inset` padding and `rounded-t-3xl` corners. `SkillEditModal` should follow the same responsive treatment. This is not specified in the spec.

**Touch targets:**
AC-12 requires `min-height: var(--tap-target-min)` on toolbar interactive elements. The BottomTabBar already applies `min-h-[44px]` on tabs. However, the spec does not extend the tap-target requirement to the edit modal's Update and Cancel buttons. AC-40 specifies the buttons are "functional" but does not mandate minimum touch target sizing. The Cancel button in the current edit page (`py-2`) likely renders below 44px. This should be addressed in the modal spec.

**Keyboard / virtual keyboard:**
When the edit modal opens on mobile and a text input receives focus, the virtual keyboard pushes the viewport up. If the modal uses `position: fixed` centred vertically, the Update button may scroll out of view under the keyboard. The spec does not address this. Recommended: the modal should use `position: fixed` with `align-items: flex-start` and `padding-top` rather than centred, or scroll within a fixed container so buttons remain accessible.

---

## Navigation Changes

**Removed route: `/skills/[id]/edit`**
The dedicated edit page is removed. A redirect from `/skills/[id]/edit` to `/skills/[id]` is specified (AC-39). Direct navigation to the old route will work. External links or bookmarks pointing to `/skills/[id]/edit` will redirect correctly.

The Sidebar and BottomTabBar do not include a direct link to the edit route, so no nav component needs updating. The only navigation change is the removal of the Edit link in the skill detail page header (currently `<Link href={`/skills/${id}/edit`}>`), replaced by a button that opens the modal.

**No new routes are introduced.**

**Back-navigation implication:**
After a successful modal update, the user is already on `/skills/[id]`. No back-stack issues. After the old edit page submitted successfully, `router.push('/skills/[id]')` was called — the back button from the old page would navigate to `/skills/[id]` again or further back in history. The modal avoids this back-stack pollution entirely — which is an improvement.

**Token migration in `Sidebar.tsx`:**
The current Sidebar (line 48) uses `var(--color-bg-surface)` which is an old token name. The token migration in AC-1 renames this. The spec covers this migration. After migration the "Soon" badge background will resolve correctly for the first time.

---

## Edge Cases

**1. Edit modal — preset skill trigger visibility**
As noted in Flow Correctness: if the Edit trigger is always shown (as today), preset skill owners will open the modal, attempt to save, and receive an API error with no contextual explanation. The spec must either: (a) hide the trigger when `!skill.is_custom`, or (b) show it disabled with a tooltip ("Preset skills cannot be edited"). Currently unspecified.

**2. Edit modal — empty name submission**
The current edit page has `required` on the name input. The modal spec (AC-36, AC-40) does not mention validation. If the modal allows submitting with an empty name, the API will return an error. The spec should include: client-side `required` validation on the name field, and an error state if the mutation fails (displaying `--color-error` inline message).

**3. Landing page — Minimal default with no theme switcher**
AC-26 specifies: landing always renders in `rpgt-theme` cookie value or Minimal if absent. First-time visitors (no cookie) see Minimal. The landing page guide specifies an interactive theme switcher in the hero as a key element (marked NEW, deferred to Phase 7). This means the landing page is locked to Minimal for all unauthenticated visitors until Phase 7. This is an intentional deferral, not a gap. However, the spec should note that the "Background treatment" on the landing page is Minimal (light, clean) and that auth pages will also always be Minimal for unauthenticated users — which is consistent with the Minimal theme's light background being the safe default for first impressions.

**4. Auth pages — theme inheritance for unauthenticated users**
AC-25 states auth pages inherit theme from the root layout's `data-theme` attribute set by middleware reading the `rpgt-theme` cookie. For first-time visitors (no cookie), this means `data-theme="minimal"`, i.e., a light/white auth background. This is correct and intentional.

For returning users who have chosen Retro or Modern, the auth page will display a dark atmospheric background (per the auth page guide: "Dark atmospheric background continuing from landing"). This dark background is sourced from `--color-bg` in the theme file. The spec does not explicitly confirm that the auth page's background treatment handles the full dark theme atmosphere (gradients, ambient glows for Modern) via token inheritance alone, without additional Layer 2 CSS. The auth page guide marks "Background treatment" as MODIFIED — the spec should confirm whether auth pages get Layer 2 CSS entries in `pages.css` or whether token inheritance alone achieves the described atmospheric effect.

**5. Dashboard at 768–1024px tablet (stat cards grid)**
AC-20 specifies the account settings grid as 2-col on desktop (>768px). The dashboard stat cards are not explicitly sized in the spec (AC-7 only covers colour and font treatment). The current dashboard likely stacks stat cards on mobile. The spec should specify the breakpoint and column count for the 4 stat cards (e.g., 2-col at ≥768px, 4-col at ≥1024px) to prevent the cards from rendering as a single column on tablet when the sidebar nav is already visible.

**6. Activity history — empty state**
The current skill detail page renders "No activity yet. Log some XP to start building your history." The spec restyles the activity history section per theme (AC-15) but does not specify the empty state treatment per theme. For Retro this should read in narrative tone; for Modern it may use a dim data-not-found idiom. Minor gap — the spec should extend AC-15 to cover the empty state string per theme.

**7. NutriLog placeholder — "Coming soon" in BottomTabBar**
The BottomTabBar (line 43–44) uses `var(--color-text-muted)` — this is the old token name. After the AC-1 migration to `--color-muted`, the tab bar's "Coming soon" label and inactive text must be updated. This is covered by AC-1 and AC-34, but the stale token is already present in the current `BottomTabBar.tsx` source. The implementer must catch this specific instance.

**8. Modal z-index stacking**
The skill detail page currently mounts multiple modals/overlays at `z-50` (PostSessionScreen at line 381, gateFirstHit at line 405). The new `SkillEditModal` will also need a defined z-index. If the edit modal renders while a GrindOverlay or PostSessionScreen is somehow also in the tree, there could be stacking conflicts. The spec should specify `z-index` for SkillEditModal relative to the existing overlay stack, or confirm that the edit trigger is hidden/disabled during an active session.

**9. Motion: animated gate border (AC-14) and activity timeline fade-ins (AC-15)**
AC-51 requires all CSS animations to use `calc(duration * var(--motion-scale))` or `@media (prefers-reduced-motion)`. The animated `--color-accent` gate border (Modern theme) and the Modern activity history "fade-in animation on scroll" must both comply. The spec states the rule but does not tie it explicitly to these specific animations by reference. Implementation note for frontend agent — not a spec gap, but worth flagging.

---

## Approval

CHANGES-NEEDED

**Required — must be added to spec.md before implementation:**

- **Edit trigger visibility for preset skills (P1-10):** Add an AC specifying that the Edit trigger on the skill detail page is hidden (or rendered as disabled with explanatory tooltip) when `!skill.is_custom`. The current spec says "preset check preserved from current edit page logic" but the current edit page has no UI-level guard — only an API-level guard. A silent API error on modal submit is a broken UX.

- **SkillEditModal client-side validation (P1-10):** Add to AC-40 or a new AC: the name field is `required`; submit is disabled while empty. If the mutation fails, an inline error message is displayed using `--color-error`. Without this, the modal has no feedback path for errors.

- **SkillEditModal mobile layout (P1-10):** Add an AC specifying that on mobile (< 768px) the modal renders as a full-width bottom sheet with `rounded-t-3xl`, matching the pattern used by `QuickLogSheet` and `ConfirmModal`. The Update and Cancel buttons must have `min-height: var(--tap-target-min)`.

- **Auth page Layer 2 CSS coverage (P1-6):** Clarify in AC-25 or a new AC whether auth pages receive entries in `pages.css` for dark atmospheric backgrounds (Retro/Modern). The auth page guide marks background treatment as MODIFIED — if token inheritance alone achieves the dark atmosphere, state that explicitly. If Layer 2 CSS is needed, add auth page entries to the `pages.css` file manifest.

**Recommended — consider addressing before implementation:**

- **Dashboard stat cards grid spec:** AC-7 covers colour/font only. Add a note specifying the responsive column count for the 4 stat cards (suggested: 2-col at ≥640px, 4-col at ≥1024px) so tablet rendering is intentional.

- **Activity history empty state per theme:** Extend AC-15 to include the empty state string for each theme (Minimal: existing "No activity yet" copy; Retro: narrative equivalent; Modern: data-terminal equivalent).

- **SkillEditModal z-index spec:** Add a note to AC-36 or AC-37 specifying the z-index for SkillEditModal relative to the existing overlay stack (`z-50`), and confirm the edit trigger is hidden or disabled while a GrindOverlay session is active.

- **Virtual keyboard handling for edit modal on mobile:** Note in the SkillEditModal implementation guidance that the modal container should not use vertical centering on mobile — use `align-items: flex-start` with top padding so the Update button remains visible when the virtual keyboard is raised.
