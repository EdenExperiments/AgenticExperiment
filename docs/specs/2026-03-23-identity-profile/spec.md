# Spec: Identity & Profile (Phase 5)

**Status:** SHIPPED
**Features:** F-036 (Avatar system), F-037 (Account stats aggregation)
**Work type:** mixed (logic: avatar upload API + stats aggregation API + schema; visual: Player Card, default avatars, avatar upload UI, theme picker upgrade)
**Date:** 2026-03-23

---

## Summary

Add a sense of identity to the account page. Users get an avatar (upload or themed default), a Player Card displaying their stats, and a visual theme picker with previews. The account page becomes an identity hub rather than a plain settings form.

**Resolves D-042:** Supabase Storage for avatar storage.

---

## Motivation

The account page is currently a utilitarian settings dump — display name, email, API key link, sign out. There's no sense of who the user is or what they've accomplished. The Player Card surfaces achievements (total XP, longest streak, skill distribution), the avatar gives visual identity, and the theme picker makes theme discovery a first-class experience rather than a hidden toggle.

---

## Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| P5-D1 | Avatar storage via Supabase Storage | Zero new providers. RLS policies for per-user access. Auth integration already wired. Resolves D-042. |
| P5-D2 | Client-side image cropping before upload | Better UX — user controls the crop area. Reduces server-side processing. Uses a lightweight crop library. |
| P5-D3 | Theme-dependent default avatars as CSS/SVG — not image files | No image assets to manage. Scales perfectly. Matches each theme's visual DNA. |
| P5-D4 | Player Card lives in `packages/ui` (shared) | May be reused on sidebar, dashboard, or future social features. Shared component, not page-local. |
| P5-D5 | Stats scope: Total XP, Best Streak (all-time per-skill record), Skill Count, Category Distribution | Lean — uses only existing data. No new schema needed for stats computation. Label "Best Streak" clarifies it's the highest single-skill streak ever, not a cross-skill metric. |
| P5-D6 | Avatar stored as public URL on `users.avatar_url` | Simple string column. Supabase Storage provides the URL. Nullable = use themed default. |
| P5-D7 | Max avatar file size: 2MB. Accepted formats: JPEG, PNG, WebP | Reasonable for profile photos. WebP for modern browsers. |
| P5-D8 | Cropped avatar output: 256x256 JPEG at 85% quality | Consistent size for all avatars. JPEG keeps file size small. Square crop enforced by the crop UI. Canvas `toBlob('image/jpeg', 0.85)` produces the output. |
| P5-D9 | Supabase Storage accessed via direct REST API (HTTP PUT/DELETE), not a Go SDK | No community Go SDK is mature enough. Supabase Storage is a thin HTTP API. Direct calls with `net/http` + service role key keeps dependencies minimal and matches the project's existing pattern of no Supabase Go SDK. |
| P5-D10 | Deterministic storage path: `{user_id}/avatar` (no extension) | One file per user, always overwritten on re-upload. No orphan files. Content-Type header set on upload determines how the browser renders it. DELETE targets exactly one path. |
| P5-D11 | POST avatar returns full `Account` object; frontend invalidates `['account']` query | Matches the existing mutation/cache pattern. `updateAccount` already returns full object. TanStack Query `invalidateQueries(['account'])` ensures Player Card and sidebar pick up the new URL. |

---

## Schema Changes

### Migration 000011_user_avatar.up.sql

```sql
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;
```

### Migration 000011_user_avatar.down.sql

```sql
ALTER TABLE public.users
  DROP COLUMN IF EXISTS avatar_url;
```

**Notes:**
- `avatar_url` is nullable. NULL = use themed default avatar.
- No index needed — only queried by user_id (PK lookup via `GET /account`).
- **Migration number 000011 is reserved** for this feature. No other in-flight feature uses 000011.
- The `timezone` column gap (handler exists, column doesn't) is a known issue but out of scope for this spec — it should be a separate bug fix.

---

## API Changes

### Modified: GET /api/v1/account

**Response adds `avatar_url` field:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "display_name": "Jane",
  "primary_skill_id": "uuid-or-null",
  "avatar_url": "https://supabase-project.supabase.co/storage/v1/object/public/avatars/user-id/avatar.jpg"
}
```

`avatar_url` is `null` when no avatar has been uploaded.

### New: POST /api/v1/account/avatar

**Content-Type:** `multipart/form-data`

**Request:**
- `avatar` (file, required) — JPEG, PNG, or WebP image. Max 2MB.

**Behaviour:**
1. Validate file type (JPEG/PNG/WebP via Content-Type sniffing) and size (<=2MB)
2. Upload to Supabase Storage bucket `avatars` at deterministic path `{user_id}/avatar` (P5-D10) via direct REST PUT with service role key (P5-D9). Set `Content-Type` header from the uploaded file. Upsert mode — always overwrites any existing file.
3. Construct public URL: `{SUPABASE_URL}/storage/v1/object/public/avatars/{user_id}/avatar`
4. Update `users.avatar_url` with the public URL
5. Append `?v={unix_timestamp}` cache-buster to the stored URL to ensure browsers fetch the new image on re-upload
6. Return the full `Account` object (P5-D11)

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "display_name": "Jane",
  "primary_skill_id": "uuid-or-null",
  "avatar_url": "https://...avatars/user-id/avatar?v=1711234567"
}
```

**Frontend cache:** After successful upload, invalidate `queryKey: ['account']` so PlayerCard and any other consumer picks up the new URL.

**Errors:**
- 400: missing file, wrong content type, file too large
- 401: unauthorized
- 500: storage or database error

### New: DELETE /api/v1/account/avatar

**Behaviour:**
1. Delete file from Supabase Storage at deterministic path `{user_id}/avatar` (single file, no wildcard — P5-D10)
2. Set `users.avatar_url = NULL`
3. Return the full `Account` object with `avatar_url: null`
4. **Idempotent:** If `avatar_url` is already NULL, still return 200 (no-op). Storage DELETE on a non-existent file is also a no-op.

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "display_name": "Jane",
  "primary_skill_id": "uuid-or-null",
  "avatar_url": null
}
```

### New: GET /api/v1/account/stats

**Response (200):**
```json
{
  "total_xp": 125000,
  "longest_streak": 14,
  "skill_count": 8,
  "category_distribution": [
    { "category": "Physical", "count": 3 },
    { "category": "Mental", "count": 2 },
    { "category": "Creative", "count": 2 },
    { "category": "Professional", "count": 1 }
  ]
}
```

**Computation (single query, no new tables):**
- `total_xp`: `SUM(skills.current_xp) WHERE user_id = $1`
- `longest_streak`: `MAX(skills.longest_streak) WHERE user_id = $1` — uses the `longest_streak` column (migration 000007), NOT `current_streak`. This is the all-time best streak across all skills, not the current active streak.
- `skill_count`: `COUNT(*) FROM skills WHERE user_id = $1`
- `category_distribution`: `COUNT(*) GROUP BY category_id` joined with `skill_categories.name`

---

## Zones Touched

| Zone | Path | Changes |
|------|------|---------|
| Go API | `apps/api/` | Migration 000011, avatar upload/delete handlers, stats handler, UserStore interface extension |
| API Client | `packages/api-client/src/` | `Account.avatar_url`, `AccountStats` type, `uploadAvatar()`, `deleteAvatar()`, `getAccountStats()` |
| Shared UI | `packages/ui/src/` | `PlayerCard`, `DefaultAvatar`, `AvatarCropModal`, `ThemePickerPreview` components |
| Next.js App | `apps/rpg-tracker/app/(app)/account/` | Rework account page layout per page guide |

---

## UI Components

### DefaultAvatar (packages/ui)

CSS/SVG-based themed default avatar. No image assets.

- **Minimal:** Neutral circle with user initial (or generic person icon). `--color-text-secondary` on `--color-surface`.
- **Retro:** Pixel-art character silhouette. Gold border (`--color-accent`). 8-bit aesthetic.
- **Modern:** Holographic frame with gradient ring. Cyan/magenta glow. Glass-effect background.

Props: `displayName: string | null`, `size: 'sm' | 'md' | 'lg'`

**Interaction:** The avatar area on the Player Card is a clickable button (min 44x44px tap target). When clicked, it opens the `AvatarCropModal`. When the user already has an uploaded avatar, the avatar area shows a small overlay icon (camera/pencil) on hover/focus. A "Remove avatar" text button appears below the avatar in the PlayerCard when `avatarUrl` is non-null — this triggers `DELETE /api/v1/account/avatar`.

### AvatarCropModal (packages/ui)

Modal overlay for client-side image cropping before upload.

- File input accepts JPEG/PNG/WebP, max 2MB. **Client-side validation:** check file type and size before loading into canvas — show inline error and keep the file picker open if invalid.
- Square crop area (1:1 aspect ratio enforced)
- Preview of cropped result
- "Upload" and "Cancel" buttons
- Outputs cropped image as Blob (256x256 JPEG)
- **Touch support:** crop area must handle `touchstart`/`touchmove`/`touchend` for drag-to-reposition on mobile
- **Theme-aware:** modal backdrop and buttons use CSS custom properties (`--color-bg-elevated`, `--color-accent`, etc.)

**Error recovery flow:**
1. If upload API call fails after crop, the modal stays open with an error banner: "Upload failed — try again"
2. The cropped blob is retained in memory — user can tap "Upload" again without re-cropping
3. "Cancel" dismisses the modal and discards the blob
4. Network timeout: 30 second limit, then show error banner

Uses `<canvas>` API for crop and resize — `drawImage()` to scale, `toBlob('image/jpeg', 0.85)` to export (P5-D8). No external library dependency.

### PlayerCard (packages/ui)

Identity card component with avatar, display name, and stats.

Props:
```typescript
interface PlayerCardProps {
  displayName: string | null
  avatarUrl: string | null
  stats: {
    total_xp: number
    longest_streak: number
    skill_count: number
    category_distribution: { category: string; count: number }[]
  } | null
  onAvatarClick?: () => void
}
```

**Theme treatments (per page guide):**
- **Minimal:** Compact info block. Bold stat numbers. Clean layout. No atmospheric effects.
- **Retro:** Game character sheet. Gold border. Stat block with chunky numbers. "Character Sheet" heading.
- **Modern:** Operator card. Glass-effect background. Holographic avatar frame. Glowing stat readouts.

Stats displayed: Total XP (formatted with locale), Best Streak (days — label "Best Streak" not "Longest Streak" to clarify it's the per-skill all-time record, not cross-skill), Skills (count), top 3 categories as small pills.

**Display name overflow:** Truncate with ellipsis at 24 characters on mobile, 32 on desktop. Use `text-overflow: ellipsis` + `overflow: hidden` + `white-space: nowrap`. The full name is visible via `title` attribute.

**Null/loading states:**
- `stats: null` (loading): show skeleton placeholders for each stat value
- `stats` with all zeroes (new user): show "0" values
- **ACV-10 "Set up your profile" prompt:** When `displayName` is null AND `avatarUrl` is null, show a call-to-action banner inside the PlayerCard: "Set up your profile" with two action links — "Add a photo" (opens AvatarCropModal) and "Set display name" (scrolls to/focuses the display name field in the settings grid below)

### ThemePickerPreview (packages/ui)

Replaces current `ThemeSwitcher` button group on the account page with visual preview cards.

- Three side-by-side cards on desktop (one per theme). **Mobile:** vertical stack (full-width cards) — three preview cards do not fit side-by-side on 375px viewports
- Each card shows: theme name, brief description, colour palette preview swatch (3-4 colour dots), mini-preview of a key UI element
- Active theme has a highlight border (`--color-accent`)
- Clicking a card switches theme immediately
- Accessible: keyboard navigation, `role="radiogroup"` with `role="radio"` + `aria-checked` per card, focus-visible ring

The existing `ThemeSwitcher` component is NOT removed — it's still used on the landing hero. `ThemePickerPreview` is a richer variant for the account page.

---

## Acceptance Criteria

### Logic ACs (TDD gate)

| ID | Assertion | Zone |
|----|-----------|------|
| ACL-1 | `POST /api/v1/account/avatar` with valid JPEG returns 200 and `avatar_url` is a non-empty string | API |
| ACL-2 | `POST /api/v1/account/avatar` with file >2MB returns 400 | API |
| ACL-3 | `POST /api/v1/account/avatar` with unsupported type (e.g. GIF) returns 400 | API |
| ACL-4 | `POST /api/v1/account/avatar` without auth returns 401 | API |
| ACL-5 | `DELETE /api/v1/account/avatar` sets `avatar_url` to NULL and returns 200 | API |
| ACL-6 | `GET /api/v1/account` includes `avatar_url` field (null when no avatar) | API |
| ACL-7 | `GET /api/v1/account/stats` returns `total_xp`, `longest_streak`, `skill_count`, `category_distribution` | API |
| ACL-8 | `GET /api/v1/account/stats` with no skills returns zeroed stats and empty distribution | API |
| ACL-9 | `GET /api/v1/account/stats` without auth returns 401 | API |
| ACL-10 | API client `uploadAvatar(file)` calls POST with multipart/form-data | Client |
| ACL-11 | API client `getAccountStats()` returns typed `AccountStats` object | Client |

### Visual ACs (reviewer gate)

| ID | Assertion | Zone |
|----|-----------|------|
| ACV-1 | Account page layout matches page guide hierarchy: Player Card → Theme Picker → Settings Grid → Sign Out | UI |
| ACV-2 | `PlayerCard` renders avatar (uploaded or themed default), display name, and stats | UI |
| ACV-3 | `DefaultAvatar` renders differently per theme (initial circle / pixel silhouette / holographic frame) | UI |
| ACV-4 | `AvatarCropModal` opens on avatar click, shows square crop area, outputs 256x256 | UI |
| ACV-5 | `ThemePickerPreview` shows three cards with colour swatches and active highlight | UI |
| ACV-6 | Clicking a theme preview card switches the theme immediately | UI |
| ACV-7 | Player Card uses CSS custom properties — no hardcoded colours | UI |
| ACV-8 | All new components are responsive (mobile-first, stack on small screens) | UI |
| ACV-9 | Avatar upload shows loading state during upload; error state retained in modal with retry | UI |
| ACV-10 | Player Card shows "Set up your profile" prompt with "Add a photo" and "Set display name" CTAs when both are null | UI |
| ACV-11 | ThemePickerPreview stacks vertically on mobile (<640px), side-by-side on desktop | UI |
| ACV-12 | Avatar image has `alt="{displayName}'s avatar"` (or "Your avatar" if no display name) | UI |
| ACV-13 | "Remove avatar" text button visible below avatar when avatarUrl is non-null | UI |
| ACV-14 | Long display name (>24 chars) truncates with ellipsis on Player Card | UI |

---

## Parallelisation Notes

**Shared packages touched:** `packages/api-client` and `packages/ui`. Both are shared across apps.

**Sequencing constraints:**
1. Migration 000011 + Go handlers (avatar + stats) must land first — they define the API contract
2. `packages/api-client` types + methods depend on the API contract from step 1
3. `packages/ui` components (`DefaultAvatar`, `PlayerCard`, `AvatarCropModal`, `ThemePickerPreview`) can be built in parallel with step 1 — they only need the TypeScript types, not a running API
4. Account page integration depends on all of the above

**Safe parallelism:**
- Backend (migration + handlers) and frontend (UI components) can develop simultaneously
- API client types should be written early as the interface contract between them

---

## Out of Scope

- Server-side image processing (resizing/compression) — handled client-side in crop modal
- Avatar moderation or content filtering
- Profile bio or description field
- Sharing Player Card externally
- Fixing the timezone column gap (separate bug fix)
- Supabase Storage bucket RLS policies (manual setup step, documented in runbook)

---

## Infrastructure Setup (manual, not in migration)

### Supabase Storage Bucket

Create bucket `avatars` in Supabase Dashboard:
- **Name:** `avatars`
- **Public:** Yes (avatars are publicly viewable via URL)
- **File size limit:** 2MB
- **Allowed MIME types:** `image/jpeg`, `image/png`, `image/webp`

### RLS Policy (optional, recommended)

```sql
-- Users can only upload/delete their own avatars
CREATE POLICY "Users manage own avatars"
ON storage.objects
FOR ALL
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
```

This is a manual setup step — document in a runbook, not in migration files.
