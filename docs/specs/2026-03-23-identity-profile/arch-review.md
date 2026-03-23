# Architecture Review — Identity & Profile (Phase 5)

**Spec:** `docs/specs/2026-03-23-identity-profile/spec.md`
**Features:** F-036 (Avatar system), F-037 (Account stats aggregation)
**Reviewer:** architect agent
**Date:** 2026-03-23

---

## Verdict

**APPROVED** — with three MAJOR findings that must be resolved during implementation (not spec changes). Two are handler-level design gaps; one is a security hardening requirement. No blockers.

---

## Findings

### Finding 1 — MAJOR: `UserStore` interface must be extended, not bypassed

The existing `UserHandler` uses an injected `UserStore` interface for testability (ACL-1 through ACL-6). The new avatar and stats handlers must follow the same pattern. The spec's TDD ACs (ACL-1 through ACL-11) are only achievable if:

1. `UserStore` gains `SetAvatarURL`, `ClearAvatarURL`, and `GetAccountStats` methods.
2. The new handlers accept `UserStore` (and a `StorageClient` interface for the Supabase HTTP calls) via constructor injection rather than taking a raw `*pgxpool.Pool`.

If the backend agent passes `db` directly to the avatar handler, test isolation breaks: tests would require a live Supabase Storage bucket. The handler must accept a `StorageClient` interface alongside `UserStore`.

**Required interface additions (sketch):**

```go
// In UserStore:
SetAvatarURL(ctx context.Context, userID uuid.UUID, url string) (*User, error)
ClearAvatarURL(ctx context.Context, userID uuid.UUID) (*User, error)
GetAccountStats(ctx context.Context, userID uuid.UUID) (*AccountStats, error)

// New interface (storage layer):
type StorageClient interface {
    PutAvatar(ctx context.Context, userID uuid.UUID, body io.Reader, contentType string) error
    DeleteAvatar(ctx context.Context, userID uuid.UUID) error
}
```

`SetAvatarURL` and `ClearAvatarURL` must return the full `*User` (matching P5-D11) so the handler can respond with the full `Account` object without a second query.

### Finding 2 — MAJOR: Cache-busting URL stored in DB creates stale URL risk

The spec (step 5 of POST avatar) stores `avatar_url` with a `?v={unix_timestamp}` suffix. This is correct for forcing browser re-fetch, but the Go service layer must strip any prior query string before constructing the new URL on re-upload. The deterministic path `{user_id}/avatar` (P5-D10) is correct; the concern is that if the stored URL somehow retains an old `?v=` suffix and a new suffix is appended, the URL becomes `...avatar?v=1711234567?v=1711999999` — malformed. The implementation must always construct the URL from scratch:

```
url = fmt.Sprintf("%s/storage/v1/object/public/avatars/%s/avatar?v=%d",
    supabaseURL, userID, time.Now().Unix())
```

Never concatenate onto the previously stored value. This should be caught in code review but is worth flagging explicitly here since the spec leaves room for a naive implementation.

### Finding 3 — MAJOR: DELETE avatar must handle Supabase Storage 404 gracefully

The spec says DELETE is idempotent and "storage DELETE on a non-existent file is also a no-op." This is true in intent, but the Supabase Storage REST API returns `400` or `404` when deleting a non-existent object (not `200`). The Go HTTP client must treat a `404` response from the Storage API as success on DELETE, not propagate it as a 500 to the caller. Without this guard, a user who has never uploaded (or whose storage object was manually deleted) will receive a 500 when they call DELETE.

**Required guard:**

```go
resp, err := http.DefaultClient.Do(req)
if err != nil { ... }
// 404 is acceptable on DELETE — object already absent
if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNotFound {
    return fmt.Errorf("storage delete returned %d", resp.StatusCode)
}
```

### Finding 4 — MINOR: Stats query needs NULL-safe SUM

`total_xp` is computed as `SUM(skills.current_xp) WHERE user_id = $1`. When a user has no skills, `SUM()` returns `NULL`, not `0`. The Go scan must use `COALESCE`:

```sql
SELECT
  COALESCE(SUM(current_xp), 0)     AS total_xp,
  COALESCE(MAX(longest_streak), 0) AS longest_streak,
  COUNT(*)                           AS skill_count
FROM public.skills
WHERE user_id = $1
```

ACL-8 specifically tests this case. The spec mentions it correctly ("returns zeroed stats") but does not include the `COALESCE` in the query sketch, which risks a scan error at the Go layer if a pgx `int64` field receives a SQL NULL.

### Finding 5 — MINOR: Content-Type sniffing vs. client-side crop output

The spec validates the uploaded file by Content-Type sniffing (correct). However, P5-D8 specifies that `AvatarCropModal` always outputs `image/jpeg` via `canvas.toBlob('image/jpeg', 0.85)` — meaning the browser may send `Content-Type: image/jpeg` even if the user originally selected a PNG. The server must accept `image/jpeg`, `image/png`, and `image/webp` as valid input Content-Types (matching P5-D7), which it does. However, the validation note in ACL-3 ("unsupported type e.g. GIF") should be tested with the raw multipart boundary Content-Type, not the file's declared type, because `http.DetectContentType` sniffs the first 512 bytes. The implementation must use `http.DetectContentType` on the raw bytes rather than trusting the `Content-Type` header sent by the browser to avoid a trivial bypass (rename GIF to `.jpg`, upload).

This is a correctness note for the backend agent, not a spec change.

### Finding 6 — NOTE: `GET /api/v1/account/stats` route conflicts with existing `/account/api-key` sub-routes

The server currently registers:

```
GET  /account/api-key
PUT  /account/api-key
DEL  /account/api-key
PATCH /account/primary-skill
```

Adding `GET /account/stats`, `POST /account/avatar`, and `DELETE /account/avatar` under the same chi group is clean and consistent. No conflicts. The route registration will be:

```go
r.Get("/account/stats", userHandler.HandleGetAccountStats)
r.Post("/account/avatar", userHandler.HandlePostAvatar)
r.Delete("/account/avatar", userHandler.HandleDeleteAvatar)
```

All three must be inside the existing `r.Group(...)` that applies the JWT middleware.

### Finding 7 — NOTE: No explicit `longest_streak` across skill vs. per-skill clarification in response

The spec states `longest_streak` is `MAX(skills.longest_streak) WHERE user_id = $1` — the best streak across all skills. This is semantically "the user's best streak ever" and is fine for the Player Card. The field name in the JSON response is `longest_streak` (not `longest_streak_days`). Consider whether the frontend needs the unit to be self-documenting. This is a UX call, not a blocker — note it for the page guide review.

---

## Schema Impact

**Migration 000011_user_avatar.up.sql:**

```sql
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;
```

**Assessment: Correct.** `IF NOT EXISTS` guard is present. `TEXT` (nullable) is the right type — no length constraint needed since Supabase Storage URLs are typically 100–200 characters but can vary. No index is required (lookup is always by PK `id`).

**Blast radius of changing `users` table:**

The `users` table is read in:
- `GetOrCreateUser` — SELECT query must be updated to include `avatar_url` in the scan.
- `users.User` struct — must gain `AvatarURL *string \`json:"avatar_url"\`` field.

The existing SELECT in `GetOrCreateUser` names columns explicitly:
```go
SELECT id, email, display_name, primary_skill_id FROM public.users WHERE id = $1
```
This will not break (PostgreSQL allows adding columns without breaking explicit SELECT lists), but the column must be added to the query and the Scan call to surface it in the API response. This is a safe additive change.

**No other tables are affected.** The `skills`, `skill_categories`, and `xp_events` tables are read-only for stats computation — no schema changes required there.

**Migration number 000011 is free** — confirmed by the migration glob (highest existing is 000010).

---

## Service Boundaries

### Go API — new service concern: Supabase Storage HTTP client

The Go API will make outbound HTTP calls to Supabase Storage REST API. This is a new external dependency boundary for the API service. Assessment:

- **Correct placement.** The Go API is the trust boundary. Letting the frontend PUT directly to Supabase Storage would bypass server-side validation (size, type). The Go API as intermediary enforces D-042's 2MB and MIME constraints server-side.
- **Service role key usage.** The service role key bypasses RLS — this is intentional and correct here, because the Go API is already authenticated and has verified the user's JWT. The service role key must ONLY be used for avatar operations and must never be returned to the client or logged.
- **HTTP client pattern.** Using `net/http` directly (P5-D9) is consistent with the project's minimal-dependency philosophy. A thin `StorageClient` interface wrapping these HTTP calls keeps it testable (Finding 1).
- **No SDK risk.** The Supabase Storage REST API is stable and simple (PUT object, DELETE object). Direct HTTP calls are lower risk than an immature Go SDK.

### API contract surface changes:

| Endpoint | Type | Notes |
|---|---|---|
| `GET /api/v1/account` | Modified | Adds `avatar_url` field — backward compatible (nullable, additive) |
| `POST /api/v1/account/avatar` | New | `multipart/form-data` input |
| `DELETE /api/v1/account/avatar` | New | Idempotent |
| `GET /api/v1/account/stats` | New | Read-only, no side effects |

All changes are additive or new routes. No existing contract is broken.

---

## ADR

**ADR-P5-01: Supabase Storage accessed via direct HTTP from Go API, not client-side presigned URL**

Context: Avatars must be validated (size, MIME type) before reaching storage. Two options exist: (A) Go API acts as intermediary — validates then proxies the upload; (B) Go API issues a presigned URL and the client uploads directly.

Decision: Option A (Go API intermediary) as specified in P5-D9.

Rationale:
- Option B (presigned URL) would require the Go API to specify allowed MIME types and size limits in the presigned URL parameters, which Supabase Storage presigned URLs do not support natively for PUT operations. Enforcement would fall back to RLS or post-upload validation — neither is as clean.
- Option A keeps all validation in the trust boundary (Go API), consistent with D-015 (security constraints stay in the Go layer).
- The 2MB max file size means the in-process buffer is bounded and acceptable.
- Tradeoff: the Go API handles the upload bandwidth. For an avatar (256x256 JPEG ≤ 2MB, typically ≤ 50KB after crop), this is negligible.

This ADR resolves D-042 for the avatar upload path.

---

## Shared Package Changes

### `packages/api-client/src/types.ts`

Required changes:
- Add `avatar_url: string | null` to `Account` interface.
- Add new `AccountStats` interface:
  ```typescript
  export interface AccountStats {
    total_xp: number
    longest_streak: number
    skill_count: number
    category_distribution: { category: string; count: number }[]
  }
  ```

### `packages/api-client/src/client.ts`

Required changes:
- `uploadAvatar(file: File): Promise<Account>` — POST multipart/form-data
- `deleteAvatar(): Promise<Account>` — DELETE
- `getAccountStats(): Promise<AccountStats>` — GET

**Risk of type mismatches:** Low. The `Account` interface change is additive. `AccountStats` is a new type with no intersection with existing types. No circular dependency risk — `api-client` has no imports from `packages/ui`.

### `packages/ui/src/`

New components: `PlayerCard`, `DefaultAvatar`, `AvatarCropModal`, `ThemePickerPreview`.

**Coordination constraint:** `packages/ui` components must be exported from `packages/ui/src/index.ts`. The current `index.ts` has been modified (shown in git status) — the implementer must merge cleanly and export all four new components.

**Circular dependency risk:** None. `packages/ui` does not import from `packages/api-client`. The `PlayerCardProps` interface in the spec is self-contained (stats typed inline). Recommend keeping it that way — do not import `AccountStats` from `api-client` into `packages/ui` to avoid a cross-package dependency.

---

## Environment Variables

Two new environment variables are required for the Go API:

| Variable | Purpose | Required in |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Authorises Storage REST API calls (PUT/DELETE). This is a secret — never log, never return to client. | Production + local dev |
| `SUPABASE_URL` | Base URL for constructing Storage object URLs and making REST calls. Likely already present but must be confirmed available to the Go API process (not just the frontend). | Production + local dev |

**Security note on `SUPABASE_SERVICE_ROLE_KEY`:** This key has admin-level access to the entire Supabase project. The Go API must load it from the environment at startup (consistent with D-015 pattern), validate it is non-empty, and fail fast if absent. It must be scoped in use to avatar operations only — do not pass it to other handlers.

---

## Parallelisation Map

### Tasks that CAN run in parallel:

- **Backend track** (migration + Go handlers + service layer):
  - Migration 000011 (schema)
  - `users.User` struct extension (`avatar_url` field)
  - `GetOrCreateUser` query update (add `avatar_url` to SELECT + Scan)
  - `StorageClient` interface + `supabaseStorageClient` implementation
  - `UserStore` interface extension + `dbUserStore` implementations
  - `HandlePostAvatar`, `HandleDeleteAvatar`, `HandleGetAccountStats` handlers
  - Route registration in `server.go`
  - Tests (TDD gate — ACL-1 through ACL-9)

- **API client track** (can start immediately — types define the contract):
  - `Account` interface extension in `types.ts`
  - `AccountStats` interface in `types.ts`
  - `uploadAvatar()`, `deleteAvatar()`, `getAccountStats()` in `client.ts`
  - API client tests (ACL-10, ACL-11)

- **UI components track** (can start once types.ts is written — does NOT need a running API):
  - `DefaultAvatar` component
  - `AvatarCropModal` component
  - `PlayerCard` component (accepts `AccountStats`-shaped props inline — no api-client import)
  - `ThemePickerPreview` component
  - All four exported from `packages/ui/src/index.ts`

### Tasks that MUST be sequenced (and why):

1. **`types.ts` must be written before `client.ts` methods** — client.ts imports from types.ts. Practically this is within the same file; they can be done together but types must be authored first to type-check the client methods.

2. **Migration must run before backend integration tests against a real DB** — unit tests with mocked `UserStore` and `StorageClient` can run without the migration; integration tests require it.

3. **Go handlers must be complete before account page integration** — the account page (`apps/rpg-tracker/app/(app)/account/`) calls the API; it cannot be integrated until the API contract is live or the API client methods are implemented with a mock server.

4. **`packages/ui` exports must be finalised before account page imports them** — the account page will import `PlayerCard`, `AvatarCropModal`, etc. from `@rpgtracker/ui`; these must be exported from `index.ts` before the page integration can build cleanly.

5. **Manual Supabase Storage bucket setup must happen before any end-to-end test** — bucket `avatars` (public, 2MB limit, JPEG/PNG/WebP) must be created in the Supabase dashboard before avatar upload is testable against the real storage layer.

### Shared package sequencing constraint:

`packages/api-client` and `packages/ui` are shared across all apps. Changes must not break `apps/nutri-log` or `apps/mental-health`. The `Account` interface change is additive (new nullable field) — existing consumers that destructure `Account` without `avatar_url` will not break. Run `pnpm turbo run build` after all package changes to catch cascading issues before the PR.

---

## Approval

APPROVED

Implementation may proceed with the following notes for the backend agent:

1. Implement `StorageClient` as an interface (Finding 1) — not a concrete struct passed directly.
2. Always construct the avatar URL from scratch on upload; never append to the stored value (Finding 2).
3. Treat HTTP 404 from Storage DELETE as success (Finding 3).
4. Use `COALESCE` in the stats query for `SUM` and `MAX` (Finding 4).
5. Use `http.DetectContentType` on the first 512 bytes for MIME validation, not the request header (Finding 5).
6. Load `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` at startup; fail fast if absent.
