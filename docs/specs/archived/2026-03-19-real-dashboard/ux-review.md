# UX Review — Real Dashboard

## Flow Correctness

The dashboard flow is sound:
- User lands on `/dashboard` (default after login) -> sees overview stats, featured skill, activity feed
- "Log XP" quick action: user selects a skill -> QuickLogSheet opens -> logs XP -> both skills and activity queries invalidate -> dashboard updates
- Featured skill card: click navigates to `/skills/{id}` detail page
- Activity feed items: click navigates to `/skills/{id}` detail page
- Empty state: clear CTA to `/skills/new`

No dead ends. Back-navigation from skill detail returns to dashboard via existing "Skills" breadcrumb (already exists). The sidebar/bottom tab already has a Dashboard link.

## Mobile Viability

- Stats row: 2x2 grid on mobile is correct (4 cards in a row would be too cramped on 375px screens)
- Featured skill card: full-width, existing SkillCard is already mobile-optimized
- Activity feed: vertical list, scrollable, no horizontal overflow concerns
- "Log XP" button: full-width on mobile, above the fold per spec
- Touch targets: all interactive elements (buttons, feed items, stat cards) should be >= 44px (`--tap-target-min`)

One note: the "Quick Action" Log XP button needs a skill picker before opening QuickLogSheet. On mobile, this could be a simple scrollable list in a bottom sheet. The spec mentions "Opens skill picker then QuickLogSheet" but does not detail the picker UI. **Recommendation:** Use a simple select/list overlay that shows skill names, or default to the featured skill (most recently updated) to skip the picker step when only one action is needed.

## Navigation Changes

No new routes. The `/dashboard` route already exists and is registered in the sidebar/bottom tab. This is a content replacement, not a route change.

## Edge Cases

- **Zero skills:** Empty state covered in spec (AC-9)
- **One skill:** Featured skill section shows that skill; activity feed may be empty if no XP logged yet. The spec should handle the case where there is activity data but no "today" XP (XP Today shows 0).
- **Activity feed empty but skills exist:** User has skills but never logged XP. Should show a subtle empty state in the activity section (e.g., "No activity yet. Log some XP to see your progress here.")
- **Network error loading activity:** The skills query and activity query are separate. If activity fails, dashboard should still render stats from skills data. Activity section can show a retry prompt.
- **Loading states:** Spec does not mention loading/skeleton states. Both the skills list query and activity query should show placeholder skeletons while loading.

## Approval

APPROVED

Minor recommendations (non-blocking):
- Add a loading skeleton state to the dashboard spec (or handle it in implementation as a standard pattern)
- Add an empty-activity-with-skills edge case message
- Clarify the skill picker UX for the "Log XP" quick action (can default to featured skill)
