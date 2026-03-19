# Real Dashboard — Spec

**Status:** DRAFT
**Date:** 2026-03-19
**Feature:** Replace the duplicate-skills-list dashboard with a genuine overview screen

## Summary

The current `/dashboard` page is a near-duplicate of `/skills` (lists SkillCards, supports QuickLogSheet). Replace it with a real dashboard that shows aggregated stats, a featured skill, a cross-skill activity feed, and a prominent "Log XP" action. Must work well in both `rpg-game` and `rpg-clean` themes.

## Zones Touched

| Zone | Paths | Changes |
|------|-------|---------|
| Go API | `apps/api/internal/handlers/`, `apps/api/internal/skills/`, `apps/api/internal/server/` | New activity endpoint, extend XPEvent with created_at + skill_name |
| Go API migrations | `apps/api/db/migrations/` | No schema change needed (xp_events.created_at already exists) |
| API client | `packages/api-client/src/` | New `getActivity()` function, new `ActivityEvent` type |
| Shared UI | `packages/ui/src/` | New `StatCard` component, new `ActivityFeedItem` component |
| Next.js UI | `apps/rpg-tracker/app/(app)/dashboard/` | Complete rewrite of `page.tsx` |

## Shared Package Changes

- `packages/api-client/src/types.ts`: Add `ActivityEvent` interface
- `packages/api-client/src/client.ts`: Add `getActivity()` function
- `packages/api-client/src/index.ts`: Export new type and function
- `packages/ui/src/StatCard.tsx`: New component for stats row
- `packages/ui/src/ActivityFeedItem.tsx`: New component for activity entries
- `packages/ui/src/index.ts`: Export new components

## API Changes

### New Endpoint: `GET /api/v1/activity?limit=N`

Returns the most recent XP log events across all of the authenticated user's skills, enriched with skill name and timestamp.

**Request:**
- Auth: session cookie (existing middleware)
- Query param: `limit` (optional, default 10, max 50)

**Response (200):**
```json
[
  {
    "id": "uuid",
    "skill_id": "uuid",
    "skill_name": "Guitar",
    "xp_delta": 25,
    "log_note": "Practiced scales",
    "created_at": "2026-03-19T14:30:00Z"
  }
]
```

**Response (401):** `{ "error": "unauthorized" }`

### Modified: Go XPEvent struct

Add `created_at` (time.Time) and `skill_name` (string) fields to support the activity feed response. The existing `GetRecentLogs` per-skill function is unchanged; a new `GetRecentActivity` function queries across all user skills.

## UI Components

### StatCard (packages/ui/src/StatCard.tsx)

A compact metric display card.

**Props:**
- `label: string` -- metric name (e.g., "Total Skills")
- `value: string | number` -- metric value
- `icon?: ReactNode` -- optional icon/emoji
- `className?: string`

**Theme behavior:**
- rpg-game: `--color-bg-elevated` background, `--color-border` gold border, value rendered in `--font-display` (Cinzel) at `--text-2xl`, `--color-accent` gold color for value
- rpg-clean: `--color-bg-surface` background, `--color-border` subtle border, value in `--font-body` (Inter) at `--text-2xl`, `--color-text-primary` color

### ActivityFeedItem (packages/ui/src/ActivityFeedItem.tsx)

A single activity log entry row.

**Props:**
- `skillName: string`
- `xpDelta: number`
- `logNote?: string`
- `createdAt: string` -- ISO timestamp
- `onClick?: () => void`

**Display:**
- Skill name as primary text
- `+{xpDelta} XP` as badge/accent text
- Log note as secondary text (if present)
- Relative timestamp ("2m ago", "1h ago", "Yesterday")

### Dashboard Page Layout

```
[Stats Row: 4 cards in 2x2 grid on mobile, 4-col on desktop]
  - Total Skills (count)
  - Active Gates (count of uncleared gates at or below current level)
  - XP Today (sum of xp_delta from today's activity, computed client-side from activity feed)
  - Highest Tier (TierBadge of highest-tier skill)

[Featured Skill Card]
  - Most recently updated skill (first in skills list, already sorted by updated_at DESC)
  - Shows SkillCard + embedded QuickLogSheet trigger
  - Section header: "Continue where you left off" (rpg-game: Cinzel font)

[Quick Action: "Log XP" button]
  - Primary accent-colored button, full width on mobile
  - Opens skill picker then QuickLogSheet

[Recent Activity Feed]
  - Section header: "Recent Activity" (rpg-game: Cinzel font)
  - Last 10 ActivityFeedItem entries
  - Each entry clickable -> navigates to skill detail

[Empty State]
  - Shown when skills.length === 0
  - Hero illustration (CSS-based shield/sword icon using borders + transforms)
  - "Begin Your Quest" (rpg-game) / "Start Tracking" (rpg-clean) heading
  - Subtext explaining the app
  - CTA button -> /skills/new
```

## Acceptance Criteria

- **AC-1:** `GET /api/v1/activity` returns 200 with array of activity events including `skill_name` and `created_at` fields for the authenticated user
- **AC-2:** `GET /api/v1/activity` returns 401 for unauthenticated requests
- **AC-3:** `GET /api/v1/activity?limit=5` returns at most 5 events; default limit is 10; maximum is 50
- **AC-4:** Dashboard page renders a stats row with exactly 4 stat cards: Total Skills, Active Gates, XP Today, Highest Tier
- **AC-5:** Dashboard stats row shows correct count values derived from the skills list data
- **AC-6:** Featured skill section shows the most recently updated skill with its SkillCard and a working QuickLogSheet trigger
- **AC-7:** Activity feed section renders up to 10 recent XP events across all skills with skill name, XP amount, note (if present), and relative timestamp
- **AC-8:** Each activity feed item is clickable and navigates to `/skills/{id}`
- **AC-9:** Empty state is shown when user has zero skills, with CTA linking to `/skills/new`
- **AC-10:** rpg-game theme: section headers use `font-family: var(--font-display)`, stat values use `color: var(--color-accent)`, cards use `border-color: var(--color-border)` with `--color-bg-elevated` background
- **AC-11:** rpg-clean theme: section headers use `font-family: var(--font-body)`, stat values use `color: var(--color-text-primary)`, cards use `--color-bg-surface` background
- **AC-12:** StatCard component renders label and value, applies theme-appropriate styling via CSS custom properties
- **AC-13:** ActivityFeedItem component renders skill name, XP delta, optional note, and relative time from `createdAt` prop
- **AC-14:** All new components have corresponding test files with at least render and prop tests
- **AC-15:** QuickLogSheet from featured skill correctly invalidates both `['skills']` and `['activity']` query keys on success

## Out of Scope

- Animated stat counters (deferred to Feature 2 animation work)
- Dashboard customization / widget reordering
- XP charts / graphs
- Blocker gate completion from dashboard
