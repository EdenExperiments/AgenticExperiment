# Spec-Draft Review: Identity & Profile (Phase 5)

**Reviewer:** reviewer agent
**Date:** 2026-03-23
**Spec:** `docs/specs/2026-03-23-identity-profile/spec.md`
**Mode:** Spec-Draft (Phase 1.5)

---

## Spec-Draft Review Findings

### ISSUE 1 — Migration number conflict [BLOCKER]

The spec proposes `000011_user_avatar.up.sql`. The most recent migration in the codebase is `000010_primary_skill.up.sql`. Migration `000011` is the correct next number — **no conflict**. However, the spec does not note that this number must be reserved before any parallel work starts, because another feature branch could claim 000011 concurrently. The Parallelisation Map (Phase 3) must explicitly assign this migration number to this feature and call out the sequencing requirement.

**Fix:** Add a note in the spec: "Migration 000011 is reserved for this feature. No other concurrent feature may claim this number — coordinate via the session zone file before branching."

---

### ISSUE 2 — `POST /api/v1/account/avatar` response shape inconsistency [BLOCKER]

The spec defines the POST response as:
```json
{ "avatar_url": "https://..." }
```
But ACL-1 asserts: "returns 200 and `avatar_url` is a non-empty string."

The existing `GET /api/v1/account` response includes the full account object (id, email, display_name, primary_skill_id, avatar_url). The spec says POST returns *only* `avatar_url`, but the summary section under "Modified: GET /api/v1/account" shows the full account shape including avatar_url. These are inconsistent.

Two problems:
1. If POST returns only `{ "avatar_url": "..." }`, the client must do a second fetch to refresh the full account state (or the TanStack Query cache for `['account']` must be manually invalidated). The spec does not specify cache invalidation strategy.
2. The existing pattern for mutation responses in this codebase is to return the affected resource or a minimal status — the spec picks neither cleanly.

**Fix:** Decide: either POST returns the full updated `Account` object (consistent with how `updateAccount` is used, allows clean cache update), or POST returns `{ "avatar_url": "..." }` and the spec must state that the frontend invalidates `['account']` query key after upload. Add this decision explicitly to the spec.

---

### ISSUE 3 — `DELETE /api/v1/account/avatar` — storage deletion is not idempotent and has no error path for "file not found" [MAJOR]

The DELETE behaviour states: "Delete file from Supabase Storage at `{user_id}/avatar.*`". The wildcard path `avatar.*` implies the handler must list files in the user's storage prefix and delete whatever it finds. This is not a simple delete-by-key operation.

Issues:
- If no avatar file exists in storage (e.g. user's `avatar_url` is already NULL), what does the handler do? The spec does not specify. Should it return 200 (idempotent) or 404?
- The wildcard pattern `{user_id}/avatar.*` assumes at most one avatar file per user. But if a previous upload left a JPEG at `{user_id}/avatar.jpg` and the new upload wrote a WebP at `{user_id}/avatar.webp`, two files exist. The DELETE spec does not address cleanup of the old extension on upload.
- `POST /api/v1/account/avatar` stores at `{user_id}/avatar.{ext}` — the extension varies per upload. There is no guarantee that the extension stored in the URL matches what the DELETE will target via wildcard.

**Fix:** Either (a) always store as `{user_id}/avatar` with no extension and set the Content-Type header on upload so the URL is deterministic, or (b) store the storage path (not just the public URL) alongside `avatar_url` in the DB so DELETE can target the exact object, or (c) on each POST upload, first delete `{user_id}/avatar.*` before writing the new file, and document DELETE as a no-op when `avatar_url` is already NULL. Pick one and state it explicitly.

---

### ISSUE 4 — Supabase Storage SDK not specified [MAJOR]

The spec says the Go API uploads to Supabase Storage and gets a public URL back. The existing Go API uses `pgx` for DB and Supabase Auth JWTs for auth — it has no Supabase Storage client. The spec does not name the Go library used to interact with Supabase Storage.

Options: the Supabase Go client (`github.com/supabase-community/storage-go`), a direct HTTP call to the Supabase Storage REST API, or the Supabase Go SDK wrapper. This is a hidden assumption. The implementation agent will have to make this choice without guidance.

**Fix:** Add to the spec's Decisions table: which Go library or approach is used for Supabase Storage interaction. If using the REST API directly with an `http.Client`, state that. If using the community client, name it.

---

### ISSUE 5 — `GET /api/v1/account/stats` — `longest_streak` computation is wrong [MAJOR]

The spec states:
```
longest_streak: MAX(skills.current_streak) WHERE user_id = $1
```

Looking at the schema, `skills.current_streak` is the *current* streak, not the *longest ever* streak. The `SkillDetail` type in `types.ts` has `streak?: SkillStreak` with fields `current` and `longest` — implying longest-ever streak is tracked separately from current streak.

If `MAX(skills.current_streak)` is used, the stat will show the user's best *current* streak across all skills — not their best *ever* streak. If a user had a 30-day streak that broke last week, their current_streak might be 2 but their longest-ever was 30. The stat is misleading.

**Fix:** Clarify whether "Longest Streak" means: (a) the longest *current* active streak across all skills (using `MAX(current_streak)`), or (b) the longest streak the user has *ever* had (which would require a `longest_streak` column on the skills table or a separate tracking mechanism). Check whether `skills` has a `longest_streak` column (not visible in the User struct but may exist on the skills table). If it does not, either add it to this migration or redefine the stat as "Best Current Streak" to avoid user-facing confusion.

---

### ISSUE 6 — `AvatarCropModal` uses `<canvas>` for 256x256 JPEG output — browser compatibility and JPEG quality not specified [MINOR]

The spec says "Uses `<canvas>` for crop — no external library dependency" and "Outputs cropped image as Blob (256x256 JPEG)". Canvas `toBlob('image/jpeg', 0.85)` is the intended mechanism based on P5-D8, but:

- The spec does not state the canvas approach explicitly in the AC. ACV-4 asserts the modal "outputs 256x256" but does not assert the format or quality.
- Safari has historically had issues with canvas JPEG blob output (fixed in modern Safari, but worth noting).
- The 85% quality from P5-D8 is a decision but it is not referenced in the component description. A developer reading only the component section would not know to apply it.

**Fix:** Add a note in the `AvatarCropModal` component description: "Output: `canvas.toBlob('image/jpeg', 0.85)` — 256×256px at 85% quality (P5-D8)." This makes the decision traceable to the component implementation without requiring the developer to cross-reference P5-D8.

---

### ISSUE 7 — `ThemePickerPreview` references `ThemeSwitcher` without stating which file it lives in [MINOR]

The spec says: "The existing `ThemeSwitcher` component is NOT removed — it's still used on the landing hero." But the spec does not say where `ThemeSwitcher` is defined (`packages/ui/src/` or within the landing app). The frontend agent needs to know this to avoid accidentally modifying or breaking it.

**Fix:** Add: "The existing `ThemeSwitcher` component lives at `packages/ui/src/ThemeSwitcher.tsx` (or similar — verify before modifying). `ThemePickerPreview` is a new component at `packages/ui/src/ThemePickerPreview.tsx`."

---

### ISSUE 8 — `PlayerCard` stats prop allows `null` but ACV-10 behaviour is underspecified [MINOR]

ACV-10 states: "Player Card shows 'Set up your profile' prompt when display name is null and no avatar." The `PlayerCard` props allow `stats: ... | null`. The spec does not state what the card renders when `stats` is null but `displayName` is present. Is a loading skeleton shown? Is it an empty state? This edge case (account loaded but stats API call still in-flight or failed) needs a decision.

**Fix:** Add an explicit note: "When `stats` is null, show skeleton placeholder rows for each stat. When both `displayName` and `avatarUrl` are null *and* `stats` is null, show the 'Set up your profile' prompt."

---

### ISSUE 9 — No decision-log entry proposed for D-042 [MINOR]

The spec header states "Resolves D-042: Supabase Storage for avatar storage" but D-042 does not appear in `Documentation/decision-log.md` — the log ends at D-041. Either D-042 already exists somewhere not visible, or it needs to be created as part of this spec's approval.

**Fix:** Add D-042 to the decision log as part of Phase 3 (architect review), or add a note in the spec that the architect agent should create D-042 entry when writing `arch-review.md`.

---

### ISSUE 10 — Shared package changes have no sequencing plan [MINOR]

Both `packages/api-client/src/` and `packages/ui/src/` are marked as touched zones (shared packages per CLAUDE.md). The spec has no Parallelisation Map section and no mention of sequencing shared package changes. Per the Spec Gate rules, "Shared package changes have a sequencing plan in Parallelisation Map." This is deferred to Phase 3 (architect), but the spec should at minimum flag that sequencing is required so the architect knows to address it.

**Fix:** Add a "Parallelisation Notes" section stating: "Both `packages/api-client` and `packages/ui` are shared zones. The architect must produce a Parallelisation Map in Phase 3 that sequences these changes before any parallel T2/T3 execution."

---

### Summary of Issues

| # | Severity | Summary |
|---|----------|---------|
| 1 | BLOCKER | Migration 000011 number must be explicitly reserved in zone file |
| 2 | BLOCKER | POST avatar response shape inconsistency — full Account vs minimal; cache invalidation strategy missing |
| 3 | MAJOR | DELETE avatar — non-idempotent wildcard path; old extension files not cleaned on re-upload |
| 4 | MAJOR | Go Supabase Storage library/approach not specified — hidden implementation assumption |
| 5 | MAJOR | `longest_streak` computed from `current_streak` — semantically wrong if longest-ever-streak is the intent |
| 6 | MINOR | AvatarCropModal canvas JPEG quality (0.85) not referenced in component description |
| 7 | MINOR | ThemeSwitcher file path not stated — risk of accidental modification |
| 8 | MINOR | PlayerCard null-stats rendering behaviour unspecified |
| 9 | MINOR | D-042 not present in decision-log.md — needs to be created |
| 10 | MINOR | No Parallelisation Notes for shared packages `api-client` and `packages/ui` |

---

## Verdict

**NO-GO on the current draft.**

Fix the 2 BLOCKERs and 3 MAJORs before resubmission. The 5 MINORs can be addressed in the same pass or deferred to arch-review if the architect is better placed to resolve them (items 9 and 10 in particular).

**Items required before resubmission:**

1. Add a migration number reservation note (Issue 1)
2. Decide and document the POST avatar response shape + cache invalidation strategy (Issue 2)
3. Resolve the storage path / extension consistency model for DELETE (Issue 3)
4. Name the Go Supabase Storage integration approach (Issue 4)
5. Clarify `longest_streak` semantics — current vs ever — and confirm DB support (Issue 5)
