# UX Review: Identity & Profile (Phase 5)

**Spec:** `docs/specs/2026-03-23-identity-profile/spec.md`
**Reviewer:** UX Agent
**Date:** 2026-03-23
**Verdict:** APPROVED (Iteration 2 — all CHANGES-NEEDED items resolved)

---

## Flow Correctness

The end-to-end user flow is coherent and all previously identified gaps are addressed.

**Avatar upload flow:**

The flow is now complete: DefaultAvatar is explicitly a clickable button (min 44x44px, same `onAvatarClick` handler) that opens the AvatarCropModal for first-time upload. Users with a display name but no avatar have a clear entry point. Users with neither display name nor avatar see the ACV-10 prompt with two specific action links — "Add a photo" (opens crop modal) and "Set display name" (scrolls to/focuses the display name field). No dead ends remain.

Upload error recovery is fully specified: modal stays open with error banner, blob retained in memory for retry, 30-second network timeout. Cancel discards the blob. The retry path requires no re-crop. ACV-9 covers this gate.

Remove avatar flow: a "Remove avatar" text button below the avatar in PlayerCard when `avatarUrl` is non-null. DELETE endpoint is no longer orphaned from the UI. ACV-13 covers this gate.

**Stats flow:**

One non-blocking gap remains: the spec still does not define a UI error state if `GET /api/v1/account/stats` fails (network error, 500). The Player Card would remain in skeleton state indefinitely. This was not a required fix in the previous verdict and does not block approval, but should be addressed in implementation (e.g., after a timeout or on query error, replace skeleton with a neutral "Stats unavailable" label rather than spinning forever).

**Theme picker flow:**

Immediate-switch on card click. Reversible. No confirmation needed. Flow is complete.

---

## Mobile Viability

All mobile concerns from iteration 1 are resolved.

- **ThemePickerPreview:** Vertical stack on mobile (<640px), side-by-side on desktop. ACV-11 enforces this.
- **AvatarCropModal touch events:** `touchstart`/`touchmove`/`touchend` explicitly required for drag-to-reposition. Mobile crop interaction is viable.
- **DefaultAvatar tap target:** 44px minimum explicitly documented in the interaction section.
- **Display name overflow:** Truncation at 24 chars mobile / 32 desktop with `text-overflow: ellipsis`. Player Card layout is safe on mobile. ACV-14 enforces this.
- **Sign Out scroll depth:** Still not explicitly acknowledged as intentional in the spec, but this is a layout consequence of the page guide hierarchy (Player Card → Theme Picker → Settings Grid → Sign Out) and is a documented design decision, not a spec gap. Sign Out as a destructive action benefiting from scroll friction is an acceptable tradeoff.

---

## Navigation Changes

None. No new routes. No bottom tab changes. No back-navigation implications.

`ThemeSwitcher` (landing hero) and `ThemePickerPreview` (account page) coexist without conflict.

---

## Theme Awareness

All components are theme-aware:

- `PlayerCard`: three explicit theme treatments per page guide.
- `DefaultAvatar`: three distinct CSS/SVG treatments (Minimal initial circle, Retro pixel silhouette, Modern holographic frame).
- `ThemePickerPreview`: renders the three themes — inherently theme-spanning.
- `AvatarCropModal`: explicitly specified as theme-aware via CSS custom properties (`--color-bg-elevated`, `--color-accent`, etc.). No hardcoded colours. ACV-7 covers all new components.

No interactions are theme-dependent in a way that breaks under a specific theme.

---

## Edge Cases

All CHANGES-NEEDED edge cases from iteration 1 are resolved. Remaining non-required items:

- **Stats query failure (non-blocking):** No error state defined for `GET /api/v1/account/stats` failure. Player Card remains in skeleton indefinitely. Recommend implementation-level handling (neutral error label after query error) without a spec change gate.
- **Theme switch during active upload (acceptable):** If a theme switch occurs while the crop modal is open, the modal re-renders under the new theme. This is a cosmetically jarring but functionally harmless edge case. No spec guidance needed — the CSS custom property approach means the re-render is automatic and non-breaking.
- **Zero-XP user (acceptable):** User with skills but no sessions logged shows `0` values across stats. The spec states `stats` with all zeroes shows "0" values — this is correct and graceful.
- **File type bypass via browser (resolved):** Client-side validation before canvas load is now specified (spec line 189). ACL-3 covers the API gate.

---

## Approval

APPROVED

All six MAJOR items, one BLOCKER, two MINOR items, and one NOTE from the iteration 1 review are resolved:

- Upload error recovery: modal retains blob, error banner, 30s timeout, retry path — resolved (ACV-9)
- Remove avatar UI: text button below PlayerCard avatar, DELETE endpoint wired — resolved (ACV-13)
- Display name truncation: ellipsis at 24/32 chars, `title` attribute for full name — resolved (ACV-14)
- ACV-10 dead end: two specific action links with defined targets — resolved (ACV-10)
- ThemePickerPreview mobile: vertical stack on <640px — resolved (ACV-11)
- Touch events in crop modal: `touchstart`/`touchmove`/`touchend` explicitly required — resolved
- AvatarCropModal theme-aware: CSS custom properties specified — resolved
- DefaultAvatar tap target: 44px minimum documented — resolved
- Client-side file validation: type and size checked before canvas load — resolved
- Streak label: "Best Streak" throughout, alt text AC added — resolved (ACV-12)
