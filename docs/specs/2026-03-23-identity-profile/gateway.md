# Spec Gateway Review — Identity & Profile (Phase 5)

**Spec:** `docs/specs/2026-03-23-identity-profile/spec.md`
**Features:** F-036 (Avatar system), F-037 (Account stats aggregation)
**Reviewer:** reviewer agent
**Date:** 2026-03-23
**Mode:** Phase 4 Spec Gate

---

## Checklist Results

### 1. All draft-review findings resolved?

**PASS**

The draft review raised 2 BLOCKERs, 3 MAJORs, and 5 MINORs. All are resolved in the revised spec:

- BLOCKER 1 (migration number reservation): spec now states "Migration 000011 is reserved for this feature. No other in-flight feature uses 000011." Confirmed against codebase — highest existing migration is 000010_primary_skill.
- BLOCKER 2 (POST response shape inconsistency): resolved by P5-D11 — POST avatar returns the full `Account` object. Cache invalidation strategy stated: `invalidateQueries(['account'])`.
- MAJOR 3 (DELETE wildcard path): resolved by P5-D10 — deterministic path `{user_id}/avatar` with no extension. Content-Type header carries format information. Single file per user, always overwritten. No wildcard needed.
- MAJOR 4 (Go storage SDK not specified): resolved by P5-D9 — direct HTTP REST calls with `net/http` and service role key. No SDK.
- MAJOR 5 (longest_streak semantics): resolved — spec now uses `MAX(skills.longest_streak)` (the `longest_streak` column added by migration 000007), not `MAX(current_streak)`. Confirmed against codebase: `longest_streak` column exists on the skills table (`000007_skills_training_gates.up.sql` line 9; `xp_repository.go` lines 73 and 128).
- MINOR 6 (canvas JPEG quality not referenced in component): `AvatarCropModal` spec now explicitly states `canvas.toBlob('image/jpeg', 0.85)` and cross-references P5-D8.
- MINOR 7 (ThemeSwitcher file path): `ThemePickerPreview` section clarifies the two components are distinct; existing `ThemeSwitcher` is stated as not removed.
- MINOR 8 (null stats rendering): `PlayerCard` spec now explicitly documents `stats: null` skeleton state and the ACV-10 prompt condition.
- MINOR 9 (D-042 missing from decision log): D-042 entry is present in `Documentation/decision-log.md` (verified).
- MINOR 10 (no parallelisation notes): "Parallelisation Notes" section is present in spec with explicit sequencing.

---

### 2. Architecture review verdict is APPROVED?

**PASS**

`arch-review.md` verdict: **APPROVED**. Three MAJOR findings (StorageClient interface, URL construction from scratch, DELETE 404 handling) and two MINOR findings are implementation notes for the backend agent — none require spec changes. The arch review also provides the Parallelisation Map as required.

---

### 3. UX review verdict is APPROVED?

**PASS**

`ux-review.md` verdict: **APPROVED (Iteration 2 — all CHANGES-NEEDED items resolved)**. All six MAJORs, one BLOCKER, two MINORs, and one NOTE from iteration 1 are confirmed resolved. Two non-blocking residual items (stats error state, theme-switch during upload) are acceptable and documented.

---

### 4. All acceptance criteria are verifiable assertions?

**PASS**

Logic ACs (ACL-1 through ACL-11): all are HTTP status code checks or typed response shape checks. No subjective language. Each maps to a specific request/response assertion testable in Go unit tests with a mocked `UserStore` and `StorageClient`.

Visual ACs (ACV-1 through ACV-14): all are render assertions, DOM structure checks, or observable UI behaviour (theme switch, truncation, conditional display). No "should feel fast" or other untestable subjective language. ACV-7 (CSS custom properties) is verifiable by static analysis or visual review. ACV-11 (responsive breakpoint) is verifiable by viewport-width controlled testing.

One non-blocking note: ACV-9 ("error state retained in modal with retry") is a behaviour assertion but does not specify a test mechanism. This is a visual-track AC, so it will be assessed by the reviewer in the visual review gate, not by automated test — which is appropriate for the pipeline split (D-036).

---

### 5. Schema changes are safe and reversible?

**PASS**

Migration 000011 up: `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;`
- Additive. Nullable. `IF NOT EXISTS` guard prevents double-apply errors.
- No index required (lookup is always by PK `id` — confirmed by `GetOrCreateUser` query pattern).
- Backward compatible: existing SELECT queries name columns explicitly (`SELECT id, email, display_name, primary_skill_id FROM public.users`) — adding a column does not break existing scans, only the new field will need to be added to that query.
- `GetOrCreateUser` scan in `service.go` (line 37) uses an explicit column list — the backend agent must add `avatar_url` to the SELECT and Scan call. This is a known required change, not a hidden one.

Migration 000011 down: `ALTER TABLE public.users DROP COLUMN IF EXISTS avatar_url;`
- Clean rollback. `IF EXISTS` guard.
- No cascade risk — `avatar_url` is a plain TEXT column with no FK relationships.

---

### 6. API contracts are unambiguous?

**PASS**

All four API surfaces are fully specified:

- `GET /api/v1/account`: exact response JSON with `avatar_url: string | null` shown. Backward compatible (additive nullable field).
- `POST /api/v1/account/avatar`: `multipart/form-data`, field name `avatar`, 5-step behaviour sequence, response shape (full Account), all error codes (400/401/500) listed.
- `DELETE /api/v1/account/avatar`: idempotency explicitly stated. Response shape (full Account with `avatar_url: null`). Storage 404 handling noted in arch-review Finding 3 (implementation note, not spec gap).
- `GET /api/v1/account/stats`: exact response JSON with all four fields. Computation source for each field stated. `COALESCE` requirement noted in arch-review Finding 4 (implementation note).

Cache-busting strategy (P5-D10, P5-D11) is unambiguous: URL constructed from scratch at upload time with `?v={unix_timestamp}`, stored in DB, frontend invalidates `['account']` query key.

One minor observation (non-blocking): the arch review correctly flags (Finding 2) that the implementation must always construct the URL from scratch rather than appending to the stored value — this is an implementation guard, not a spec ambiguity.

---

### 7. Shared package changes are identified and sequenced?

**PASS**

Both shared packages are identified in the Zones Touched table and the Parallelisation Notes section:

- `packages/api-client/src/`: `Account.avatar_url`, `AccountStats` type, `uploadAvatar()`, `deleteAvatar()`, `getAccountStats()` — all changes are explicitly named.
- `packages/ui/src/`: four new components — `PlayerCard`, `DefaultAvatar`, `AvatarCropModal`, `ThemePickerPreview` — with export requirement noted.

The arch-review Parallelisation Map provides a detailed 5-point sequencing constraint list:
1. `types.ts` before `client.ts` methods.
2. Migration before backend integration tests.
3. Go handlers before account page integration.
4. `packages/ui` exports before account page imports.
5. Manual Supabase Storage bucket setup before E2E tests.

The shared package coordination risk is explicitly stated: `pnpm turbo run build` required after all package changes to catch cascading issues. The `packages/ui/src/index.ts` modification note (currently in git status as modified) is flagged in the arch review — the implementer must merge cleanly.

Circular dependency risk assessed as none: `packages/ui` does not import from `packages/api-client`, and `PlayerCardProps` keeps stats typed inline.

---

### 8. Work type classification is correct?

**PASS**

Spec header: `type: mixed (logic: avatar upload API + stats aggregation API + schema; visual: Player Card, default avatars, avatar upload UI, theme picker upgrade)`

This is correct per D-036 (pipeline split):
- Logic track: Go API (migration, handlers, StorageClient, UserStore extension) + API client methods → TDD gate → code review.
- Visual track: `packages/ui` components + account page layout → visual review gate.

The split is reflected in the AC table (Logic ACs vs Visual ACs) and the parallelisation map. Both tracks have the correct gate type.

---

### 9. No unresolved decisions?

**PASS**

All decisions are documented in the spec's Decisions table (P5-D1 through P5-D11). D-042 is present in the decision log. The arch review produces ADR-P5-01 (Go API intermediary vs presigned URL — Option A chosen). No open questions remain in the spec. The timezone column gap is explicitly acknowledged as out of scope and deferred to a separate bug fix.

The one residual UX note (stats error state UI) is documented as non-blocking in ux-review and carries a recommended implementation-level fix without requiring a spec gate. This is acceptable — it is a defensive coding suggestion, not an unresolved product decision.

---

## Spec Review Findings

None.

The spec is complete, internally consistent, and all findings from prior review iterations are resolved. The arch-review and ux-review implementation notes (StorageClient interface, URL construction guard, DELETE 404 handling, COALESCE in stats query, `http.DetectContentType` for MIME sniffing, stats error UI) are correctly scoped as implementation guidance for the backend and frontend agents — they do not represent spec gaps.

---

## Verdict

GO

The spec package is approved for planning and execution. Update spec status from DRAFT to APPROVED.
