# Implementation Plan: Identity & Profile (Phase 5)

**Spec:** `docs/specs/2026-03-23-identity-profile/spec.md` (APPROVED)
**Arch Review:** `docs/specs/2026-03-23-identity-profile/arch-review.md` (APPROVED)
**UX Review:** `docs/specs/2026-03-23-identity-profile/ux-review.md` (APPROVED)
**Gateway:** `docs/specs/2026-03-23-identity-profile/gateway.md` (GO)
**Work type:** mixed (TDD gate for logic; visual review for UI)

---

## Task Overview

| Task | Agent | Type | Description | Depends On |
|------|-------|------|-------------|------------|
| T1 | tester | logic | Write failing tests for avatar API + stats API | — |
| T2 | backend | logic | Schema, Go handlers, storage client | T1 |
| T3 | backend | logic | API client types + methods | T2 |
| T4 | frontend | visual | UI components (DefaultAvatar, PlayerCard, AvatarCropModal, ThemePickerPreview) | T3 (types only) |
| T5 | frontend | visual | Account page integration | T3, T4 |
| T6 | reviewer | gate | Code review + visual review | T2, T3, T4, T5 |

---

## T1 — Write Failing Tests (tester)

**Type:** logic
**Agent:** tester
**Files:**
- `apps/api/internal/handlers/account_avatar_test.go` (new)
- `apps/api/internal/handlers/account_stats_test.go` (new)

**Acceptance criteria to cover:**
- ACL-1: POST avatar with valid JPEG → 200 + avatar_url non-empty
- ACL-2: POST avatar with file >2MB → 400
- ACL-3: POST avatar with GIF → 400
- ACL-4: POST avatar without auth → 401
- ACL-5: DELETE avatar → 200, avatar_url NULL
- ACL-6: GET account includes avatar_url (null when no avatar)
- ACL-7: GET stats returns total_xp, longest_streak, skill_count, category_distribution
- ACL-8: GET stats with no skills → zeroed stats, empty distribution
- ACL-9: GET stats without auth → 401

**Testing approach:**
- Use mock `UserStore` and mock `StorageClient` interfaces (per arch Finding 1)
- Tests should compile but fail (no handler implementation yet)
- Follow existing test patterns from `account_primary_skill_test.go`

**Note on ACL-10, ACL-11:** These are API client ACs (TypeScript). They are verified by type inspection — the method signatures in `client.ts` make the assertions self-evident (e.g. `uploadAvatar(file: File): Promise<Account>` uses `multipart/form-data` by construction). No separate TypeScript test file needed for these two ACs.

**Done condition:** All test files compile. Tests fail with "handler not implemented" or similar — not with compilation errors.

---

## T2 — Backend Implementation (backend)

**Type:** logic
**Agent:** backend
**Files:**
- `apps/api/db/migrations/000011_user_avatar.up.sql` (new)
- `apps/api/db/migrations/000011_user_avatar.down.sql` (new)
- `apps/api/internal/users/service.go` (modify — add SetAvatarURL, ClearAvatarURL, GetAccountStats)
- `apps/api/internal/users/user.go` (modify — add AvatarURL field to User struct)
- `apps/api/internal/handlers/account.go` (modify — extend UserStore interface, add handlers)
- `apps/api/internal/storage/storage.go` (new — StorageClient interface + supabaseStorageClient)
- `apps/api/internal/server/server.go` (modify — register new routes)
- `apps/api/cmd/server/main.go` (modify — load SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, fail fast)

**Implementation notes (from arch review):**
1. `StorageClient` interface with `PutAvatar` and `DeleteAvatar` methods
2. `supabaseStorageClient` implementation using `net/http` + service role key
3. Always construct avatar URL from scratch (never concatenate onto stored value)
4. Treat HTTP 404 from Storage DELETE as success
5. Use `COALESCE` in stats query for SUM/MAX
6. Use `http.DetectContentType` on first 512 bytes, not request header
7. `GetOrCreateUser` query must add `avatar_url` to SELECT + Scan

**Environment variables (fail-fast at startup):**
- `SUPABASE_URL` — base URL for Storage API
- `SUPABASE_SERVICE_ROLE_KEY` — admin key for Storage operations (never log/return)

**Done condition:** All T1 tests pass (`go test ./internal/handlers/... -run Avatar -run Stats`). `GetOrCreateUser` returns `avatar_url` field.

---

## T3 — API Client Types + Methods (backend)

**Type:** logic
**Agent:** backend
**Files:**
- `packages/api-client/src/types.ts` (modify — add avatar_url to Account, add AccountStats)
- `packages/api-client/src/client.ts` (modify — add uploadAvatar, deleteAvatar, getAccountStats)

**Changes:**
```typescript
// types.ts additions:
export interface Account {
  // ... existing fields ...
  avatar_url: string | null  // NEW
}

export interface AccountStats {
  total_xp: number
  longest_streak: number
  skill_count: number
  category_distribution: { category: string; count: number }[]
}

// client.ts additions:
uploadAvatar(file: File): Promise<Account>      // POST multipart/form-data
deleteAvatar(): Promise<Account>                 // DELETE
getAccountStats(): Promise<AccountStats>         // GET
```

**Note:** Do NOT import AccountStats into packages/ui — PlayerCard uses inline props to avoid cross-package dependency.

**Done condition:** TypeScript compiles clean (`pnpm turbo run build --filter=@rpgtracker/api-client`). All three methods exported and typed correctly.

---

## T4 — UI Components (frontend)

**Type:** visual
**Agent:** frontend
**Files:**
- `packages/ui/src/DefaultAvatar.tsx` (new)
- `packages/ui/src/PlayerCard.tsx` (new)
- `packages/ui/src/AvatarCropModal.tsx` (new)
- `packages/ui/src/ThemePickerPreview.tsx` (new)
- `packages/ui/src/index.ts` (modify — export all four)

### DefaultAvatar
- CSS/SVG themed avatar — Minimal (initial circle), Retro (pixel silhouette), Modern (holographic frame)
- Props: `displayName: string | null`, `size: 'sm' | 'md' | 'lg'`
- Min 44x44px tap target when interactive

### PlayerCard
- Identity card: avatar + display name + stats
- Three theme treatments per page guide
- "Remove avatar" text button when avatarUrl non-null
- "Set up your profile" CTA when both displayName and avatarUrl null
- Display name truncation at 24/32 chars with ellipsis
- Stats: Total XP, Best Streak, Skills, top 3 category pills
- Skeleton state when stats loading, "Stats unavailable" on query error
- Avatar alt text: "{displayName}'s avatar" or "Your avatar"

### AvatarCropModal
- File input with client-side type/size validation before canvas load
- Square crop (1:1) with touch support (touchstart/touchmove/touchend)
- Canvas drawImage + toBlob('image/jpeg', 0.85) output at 256x256
- Error recovery: modal stays open on upload failure, blob retained, retry button
- Theme-aware styling (CSS custom properties)

### ThemePickerPreview
- Three cards: vertical stack on mobile (<640px), side-by-side on desktop
- Each card: theme name, description, colour palette dots, active highlight border
- role="radiogroup" with role="radio" + aria-checked per card
- Clicking switches theme immediately via setTheme()

**Done condition:** All four components exported from `index.ts`. `pnpm turbo run build` passes from repo root (catches cascading issues in nutri-log, mental-health).

---

## T5 — Account Page Integration (frontend)

**Type:** visual
**Agent:** frontend
**Files:**
- `apps/rpg-tracker/app/(app)/account/page.tsx` (modify — restructure layout)

**New layout (per page guide hierarchy):**
1. PlayerCard — avatar + stats from `getAccountStats()` query
2. ThemePickerPreview — replaces inline theme toggle
3. Settings Grid — display name (editable), email, API key link, password link
4. Sign Out button

**Queries:**
- `useQuery(['account'], getAccount)` — existing
- `useQuery(['account-stats'], getAccountStats)` — new
- `useMutation(uploadAvatar)` — invalidates ['account']
- `useMutation(deleteAvatar)` — invalidates ['account']

**State:**
- `showCropModal: boolean` — controls AvatarCropModal visibility

**Done condition:** `pnpm turbo run build` passes from repo root. Account page renders Player Card, Theme Picker, Settings Grid, Sign Out in correct order. All ACV-* visual ACs met.

---

## T6 — Code + Visual Review (reviewer)

**Type:** gate
**Agent:** reviewer
**Mode:** mixed (code gate for T1–T3, visual review for T4–T5)

**Code gate checks:**
- All T1 tests pass
- StorageClient is interface-based (arch Finding 1)
- Avatar URL constructed from scratch (arch Finding 2)
- DELETE handles 404 (arch Finding 3)
- COALESCE in stats query (arch Finding 4)
- Content-Type sniffing via http.DetectContentType (arch Finding 5)
- Service role key not logged/returned

**Visual review checks:**
- All three themes render correctly for PlayerCard, DefaultAvatar, ThemePickerPreview
- Design tokens used (no hardcoded colours) — ACV-7
- Responsive layout (mobile stack) — ACV-8, ACV-11
- Avatar alt text — ACV-12
- Remove avatar button — ACV-13
- Display name truncation — ACV-14
- Error recovery in crop modal — ACV-9

---

## Parallelisation

```
T1 (tester) ──→ T2 (backend) ──→ T3 (api-client) ──→ T4 (UI components) ──→ T5 (account page) ──→ T6 (review)
```

- T1 must complete before T2 (TDD: tests written first)
- T2 must complete before T3 (Go API contract defines client types)
- T3 must complete before T4 (T4 needs Account type with avatar_url and AccountStats type to inform component props — though props are inline, the types must exist for build to pass)
- T5 depends on T3 (client methods) and T4 (exported components)
- T6 runs after all implementation tasks complete

**Build verification:** After T3 and T4, run `pnpm turbo run build` from repo root to catch cascading issues in `apps/nutri-log` and `apps/mental-health` before proceeding to T5.

**Single zone:** All work is in one worktree. No parallel sessions needed — backend and frontend are sequential in this plan.
