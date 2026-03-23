# Architectural Review — Primary Skill Focus + Quick Session (Phase 4)

**Spec:** `docs/specs/2026-03-23-primary-skill-focus/spec.md`
**Reviewer:** architect agent
**Date:** 2026-03-23
**Status:** APPROVED

---

## Schema Impact

### New column

`primary_skill_id UUID REFERENCES public.skills(id) ON DELETE SET NULL` on `public.users`.

**Assessment: sound.**

- Migration number 000010 is confirmed free — latest is 000009 (`skill_organisation`).
- `ON DELETE SET NULL` is the correct referential action. Deleting a pinned skill must not orphan or block-delete the user row; NULL is the natural fallback to the algorithmic path, directly satisfying AC-L5.
- No FK edge case for the inverse direction: `skills.user_id` already references `auth.users`, not `public.users`, so there is no circular FK concern.
- No index required. The column is accessed exclusively via the user's own PK lookup (`WHERE id = $1`) — a table scan of one row. An index on `primary_skill_id` would only be useful for "find all users who pinned skill X", which is not a current query.
- `ADD COLUMN IF NOT EXISTS` is safe against re-runs, consistent with existing migration style.
- The `users.User` struct in `apps/api/internal/users/service.go` currently has three fields (`ID`, `Email`, `DisplayName`). The struct and its `SELECT` query must be extended to include `PrimarySkillID *uuid.UUID` and the `GetOrCreateUser` scan must read it. This is a **required backend change** not explicitly called out in the spec's backend task list.

### Down migration

`DROP COLUMN IF EXISTS primary_skill_id` is correct and safe.

---

## Service Boundaries

### Endpoint placement: PATCH /api/v1/account/primary-skill

The spec correctly routes this to the `UserHandler` in `apps/api/internal/handlers/account.go`. Rationale is sound: this is a user-level setting, not a per-skill mutation. The endpoint sits alongside `PATCH /api/v1/account` (timezone) and `PUT/DELETE /api/v1/account/api-key`, all of which are already in the account handler.

**No cross-zone concerns.** The skill ownership check (`WHERE id = $1 AND user_id = $2`) is a standard guard already used in skill handlers and is straightforward to replicate in the account handler with a single DB query.

### GET /api/v1/account — additive change

Adding `primary_skill_id` to the existing response is a backwards-compatible additive change. All existing clients that destructure the `Account` type will simply ignore the new field until they are updated. This is low blast-radius, as the spec argues via P4-D6.

**One issue to note:** `updateAccount` in `client.ts` (line 179) sends a PATCH to `/api/v1/account` with a JSON body, while the new `PATCH /api/v1/account/primary-skill` uses `application/x-www-form-urlencoded`. This inconsistency is pre-existing (the account handler already mixes form parsing and JSON parsing across its methods). The spec is internally consistent — the new endpoint matches the form-body pattern used for favourite toggle and other skill mutations. No change required here.

### users.User struct and GetOrCreateUser — missing in spec task list

The spec's backend task list describes adding a handler and service function but does not explicitly list updating the `users.User` struct, its `SELECT` query, or the JSON serialization tag. This is a real gap. The `HandleGetAccount` handler calls `GetOrCreateUser` and returns `u` directly. If the struct does not include `PrimarySkillID`, the `GET /api/v1/account` response will silently omit the field even after migration. The backend agent must:

1. Add `PrimarySkillID *uuid.UUID \`json:"primary_skill_id"\`` to `users.User`.
2. Extend the `SELECT` in `GetOrCreateUser` to read `primary_skill_id`.
3. Update the `Scan` call accordingly.

---

## ADR

**No new ADR required.** Decisions P4-D1 through P4-D6 are documented inline in the spec and are consistent with existing patterns (favourite toggle precedent for P4-D5, account endpoint contract for P4-D6). These decisions are feature-scoped and do not warrant a decision-log entry at D-0xx level unless the user chooses to promote them.

One note for the decision log: D-041 is referenced in the spec ("Resolves D-041: Single pin only") but D-041 does not appear in `Documentation/decision-log.md`. The decision log currently ends at D-037. If D-041 was added elsewhere or is pending, it should be confirmed or the spec reference updated.

---

## Shared Package Changes

### packages/api-client/src/types.ts

- `Account` interface: add `primary_skill_id: string | null`. The existing `timezone` field uses `timezone?: string` (optional). `primary_skill_id` should be `primary_skill_id: string | null` (nullable, always present) to match the API contract.
- `SkillDetail` interface: `current_streak?: number` (optional) must become `current_streak: number` (non-optional, always present). The spec identifies this type inaccuracy at line 119 and mandates the fix as part of this work. This is a **breaking change to the type** — all consumers of `SkillDetail.current_streak` that guard against `undefined` must be updated, but since the DB column is `INT NOT NULL DEFAULT 0` it is always present.

### packages/api-client/src/client.ts

- Add `setPrimarySkill(skillId: string): Promise<{ primary_skill_id: string | null }>` using `PATCH /api/v1/account/primary-skill` with `application/x-www-form-urlencoded` body.

### packages/ui/src/

- New file: `PrimarySkillCard.tsx` — the shared focus card component.

---

## Parallelisation Map

Tasks that CAN run in parallel:

- **Backend: migration + handler** (T-B1) — write `000010_primary_skill.up/down.sql`, extend `users.User` struct and `GetOrCreateUser`, add `SetPrimarySkill` service function, add `HandlePatchPrimarySkill` handler, register route. No frontend dependency.
- **API client + types** (T-C1) — update `Account` type, fix `current_streak` type, add `setPrimarySkill()` function. Depends only on the agreed API contract (already fully specified); can proceed without waiting for the backend to be deployed.
- **Tester: logic tests** (T-T1) — write failing Go tests for AC-L1 through AC-L5 against the handler. Can run in parallel with T-B1 (TDD-first pattern: tests written before implementation).
- **Tester: algorithm unit tests** (T-T2) — write failing TypeScript unit tests for AC-L6 (the pure algorithmic fallback function). Can run in parallel with all other tasks.

Tasks that MUST be sequenced (and why):

- **T-C1 before T-F1 (PrimarySkillCard component)** — the card component imports `setPrimarySkill` and the updated `Account` type from `packages/api-client`. The component cannot be written against a type that does not yet exist. In practice the types file can be updated in isolation first (5-minute task), unblocking the frontend.
- **T-B1 (migration applied) before integration testing** — the handler will fail at runtime until the column exists. Unit tests using mocks can proceed without the migration being applied, but end-to-end verification requires T-B1 complete.
- **T-F1 (PrimarySkillCard) before T-F2 (dashboard integration)** — `dashboard/page.tsx` imports and renders `PrimarySkillCard`. The dashboard wiring must happen after the card component exists.
- **T-T1 tests must be written before T-B1 handler implementation** — TDD gate per D-036. Tests first, then implement to make them pass.

---

## Approval

APPROVED

The spec is technically sound. The migration is correct, the ON DELETE SET NULL behaviour is appropriate, the endpoint placement is consistent with existing handler conventions, and the client-side algorithm approach is valid given all required data is already present in the `listSkills` response.

Two items must be addressed during implementation (not blockers to approval, but must not be skipped):

1. **users.User struct gap** — the spec's backend task list does not mention updating the struct and SELECT query. The backend agent must add `PrimarySkillID *uuid.UUID \`json:"primary_skill_id"\`` and extend `GetOrCreateUser` accordingly, or `GET /api/v1/account` will silently omit the field.
2. **D-041 reference** — the spec cites "Resolves D-041" but D-041 is absent from the decision log (last entry is D-037). Either the reference should be updated to an existing decision ID, or D-041 should be added to the log before implementation begins.
