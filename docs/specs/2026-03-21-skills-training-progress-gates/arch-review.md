# Architecture Review — Skills: Training Sessions, Progress Visualisation & Gate Mastery

**Spec:** `docs/specs/2026-03-21-skills-training-progress-gates/spec.md`
**Reviewer:** architect agent
**Date:** 2026-03-21

> **Second pass: APPROVED 2026-03-21.** All 9 CHANGES-NEEDED items from the first pass are resolved in the updated spec. See verification table at the bottom of this document.

---

## Schema Impact

### New tables

**`training_sessions`** (§5.3)
- Table definition is sound. Index `(skill_id, created_at DESC)` correctly supports the paginated sessions list and the monthly summary aggregate. Index `(user_id, created_at DESC)` supports cross-skill queries. No gaps found.
- `completion_ratio NUMERIC(4,3)` — CHECK constraint `CHECK (completion_ratio IS NULL OR (completion_ratio >= 0 AND completion_ratio <= 1))` is present. Correct.
- `status TEXT NOT NULL CHECK (status IN ('completed', 'partial', 'abandoned'))` is correct.
- `bonus_percentage INT NOT NULL DEFAULT 0 CHECK (bonus_percentage IN (0, 10, 25))` — CHECK constraint is present. Correct.
- RLS: aspirational policy defined; `DISABLE ROW LEVEL SECURITY` issued in same migration per §5.7 step 6. Correct.

**`gate_submissions`** (§5.5)
- No 'pending' verdict is correct given the synchronous AI path.
- `attempt_number INT NOT NULL` — spec explicitly documents MAX(attempt_number)+1 computation inside the insert transaction (§5.5 comment). No DEFAULT. Correct.
- `next_retry_at DATE CHECK (verdict != 'approved' OR next_retry_at IS NULL)` — CHECK constraint is present. Correct.
- Index `gate_submissions_user ON (user_id, submitted_at DESC)` is present.
- RLS: aspirational policy defined; `DISABLE ROW LEVEL SECURITY` issued in same migration per §5.7 step 6. Correct.

### Altered tables

**`users`** — add `timezone TEXT NOT NULL DEFAULT 'UTC'` (§5.1). Straightforward. No RLS or index impact.

**`skills`** — add five columns (§5.2): `requires_active_use`, `current_streak`, `longest_streak`, `last_log_date`, `animation_theme`. All sound.

**`xp_events`** — add `training_session_id UUID REFERENCES public.training_sessions(id) ON DELETE SET NULL` (§5.4). Migration ordering constraint documented in §5.7 (training_sessions DDL before xp_events FK alteration).

### Migration ordering

Documented in §5.7. Six-step sequence with steps 3→4 as the only hard dependency. No gaps.

---

## Service Boundaries

### `POST /api/v1/skills/{id}/sessions`

Fits the existing handler/repository pattern. New `SessionHandler` backed by a `SessionStore` interface following the `SkillHandler → SkillStore → dbSkillStore` pattern.

**Bonus XP calculation placement:** Handler layer, before `LogXP` is called. Handler computes `bonus_xp = round(xp_delta * bonus_percentage / 100)` and passes total XP to `LogXP`.

**LogXP signature change:** `LogXP` must accept `trainingSessionID *uuid.UUID`. Stated explicitly in §9 binding constraints as a repository contract change.

**Streak calculation placement:** Inside the `LogXP` transaction boundary (R-003). Reads `users.timezone`, compares to `skills.last_log_date`, updates `current_streak`, `longest_streak`, `last_log_date` atomically with the XP insert.

### `POST /api/v1/blocker-gates/{id}/submit`

New `GateHandler`. Follows same dependency-injection pattern as `CalibrateHandler`.

**Claude API reuse:** D-030 prescribes `claudeCallRaw(ctx, apiKey, systemPrompt, userPrompt string) (string, error)` — Option A from the first review. Both `CalibrateHandler` and `GateHandler` call this function and parse responses in their own handler layer. `CalibrateHandler` must be refactored to use it. No new interface type is defined.

**Gate cooldown enforcement (AC-G7):** Handler queries latest `gate_submissions` row before accepting a new submission; rejects with HTTP 429 if `next_retry_at IS NOT NULL AND next_retry_at > (now() AT TIME ZONE users.timezone)::DATE`.

**Self-report path:** Immediate DB write; `verdict = 'self_reported'`; `next_retry_at = NULL`; atomically sets `blocker_gates.is_cleared = true`.

**AI failure handling:** On Claude non-200, return HTTP 502. Do NOT insert a `gate_submissions` row. Insert is deferred until after a successful Claude response.

**OQ-4 gate:** AI path cannot be merged until D-026 prompt template is approved by user (§9 binding constraints, OQ-4 table entry).

### `GET /api/v1/skills/{id}/xp-chart`

New read-only endpoint. Go layer zero-fills missing days before returning the response. Can be served from a read replica in future.

### `PATCH /api/v1/account` (timezone update)

Validates IANA timezone string via `time.LoadLocation(tz)`; returns HTTP 422 on failure (D-029).

---

## ADR

### ADR-001: Synchronous Gate AI Assessment (no async queue)

**Context:** Gate assessment via Claude can take up to ~5 seconds. An async queue would avoid holding the HTTP connection but adds significant infrastructure (worker, job table, polling endpoint or websocket).

**Decision:** Release 1 uses synchronous assessment with a 30-second HTTP client timeout (matching the existing `calibrate.go` timeout). The connection is held open. A loading state is shown in the UI.

**Rationale:** The feature is gated on the user having their own Claude API key (D-027), meaning low volume per user. An async queue is premature optimisation at this stage. The 30-second timeout is consistent with existing infrastructure.

**Consequences:** Under slow Claude responses, users may experience a visible spinner for up to 30 seconds. The UI must show a loading state and must not allow re-submission during the in-flight request.

---

### ADR-002: Streak Denormalisation Inside LogXP Transaction

**Context:** Streak state (`current_streak`, `longest_streak`, `last_log_date`) is denormalised onto the `skills` row. It could alternatively be computed on-the-fly from `xp_events`.

**Decision:** Denormalise and update atomically within the `LogXP` transaction (R-003 extension). Reading timezone from `users` inside the transaction is acceptable — it is a single indexed lookup.

**Rationale:** On-the-fly streak computation requires scanning all `xp_events` for a skill and performing date arithmetic in application code for every read. Denormalisation makes reads O(1). The risk of drift is mitigated by keeping the update inside the same transaction that inserts the XP event.

**Consequences:** `LogXP` must join or fetch `users.timezone` inside the transaction. The R-003 reconciliation query must be extended to also recompute streak columns.

---

## Shared Package Changes

### `packages/api-client/src/`

The following type additions are required and must land before any frontend implementation task begins:

- `SkillDetail` type — add `streak: { current: number; longest: number }`, `active_gate_submission: GateSubmission | null`, `requires_active_use: boolean`, `animation_theme: string`.
- `SkillListItem` type — add `current_streak: number`, `requires_active_use: boolean`.
- New type `TrainingSession` — mirrors §6 session response shape.
- New type `GateSubmission` — mirrors §6 gate response shape.
- New API functions: `createSession(skillId, body)`, `listSessions(skillId, params)`, `getXPChart(skillId, days)`, `submitGate(gateId, body)`.
- Account type — add `timezone: string`.

### `packages/ui/src/`

Nine new components and three modified components (§7 of spec). Shared package concern because multiple apps could consume them.

**Coordination requirement:** `SkillCard.tsx` and `BlockerGateSection.tsx` are modified shared components. Any parallel frontend work touching the skills list or gate section must coordinate on these two files to avoid merge conflicts.

---

## Parallelisation Map

Tasks that CAN run in parallel:

- **[BE-1]** Migration authoring (all §5 schema changes, single migration file) — no frontend dependency.
- **[BE-2]** `GET /api/v1/skills/{id}/xp-chart` endpoint — pure read; no dependency on training session or gate work.
- **[FE-1]** `packages/api-client` type updates — can proceed immediately from spec; no backend dependency for type definitions.
- **[FE-2]** New shared UI components that are pure display (`XPBarChart`, `SkillStreakBadge`, `PersonalBests`, `MonthlySummary`, `GrindAnimation`) — can be built with mocked data.
- **[FE-3]** `GrindOverlay` and `PostSessionScreen` — can be built with mocked API responses.
- **[TEST-1]** Tester writes failing tests for bonus XP calculation (AC-C1, AC-C2) and streak logic (AC-E1–E4) — pure function tests, no backend required.

Tasks that MUST be sequenced (and why):

1. **[BE-1] migration must land before [BE-3, BE-4, BE-5]** — `POST /api/v1/skills/{id}/sessions`, `POST /api/v1/blocker-gates/{id}/submit`, and `PATCH /api/v1/account` timezone all depend on new schema columns and tables.
2. **[BE-1] within the migration, `training_sessions` DDL must precede `xp_events` FK alteration** — FK reference cannot exist before the referenced table (§5.7 step 3 before step 4).
3. **[OQ-4 resolved] before [BE-4] AI path implementation** — `POST /api/v1/blocker-gates/{id}/submit` AI path requires D-026 prompt template to be finalised. Tests may be written but the handler cannot be merged until OQ-4 is closed (§9 binding constraints).
4. **[BE-3] LogXP signature change must be reviewed before [FE-3] integration** — `PostSessionScreen` submits to `POST /api/v1/skills/{id}/sessions`; component can be built in parallel but integration is blocked until the endpoint exists.
5. **[FE-1] api-client types must land before [FE-3, FE-4] integration** — components consuming `SkillDetail.streak` or `TrainingSession` will not compile without the updated types.
6. **[BE-5] `PATCH /api/v1/account` timezone support must land before streak E2E tests are valid** — streak calendar day calculation is only meaningful once the user has a stored timezone.

---

## OQ-1 Resolution: Category Slug Verification

**Confirmed.** The 9 slugs in D-023 exactly match the `skill_categories` seed data in migration `000004_seed_skill_presets.up.sql`:

| D-023 slug | Seed slug | Match |
|---|---|---|
| `fitness` | `fitness` | yes |
| `programming` | `programming` | yes |
| `creative` | `creative` | yes |
| `wellness` | `wellness` | yes |
| `learning` | `learning` | yes |
| `social` | `social` | yes |
| `finance` | `finance` | yes |
| `nutrition` | `nutrition` | yes |
| `productivity` | `productivity` | yes |

**Join path confirmed.** `skills.preset_id` references `skill_presets.id`; `skill_presets.category_id` references `skill_categories.id`; `skill_categories.slug` is UNIQUE. The `animation_theme` lookup is a pure join at skill creation time; the resolved value is stored on `skills.animation_theme` (write-once per D-031).

---

## Timezone Handling (D-029)

`AT TIME ZONE` in PostgreSQL is correct for converting UTC timestamps to local calendar dates. Key considerations confirmed sound:

1. **DST fall-back ambiguous hours:** PostgreSQL resolves deterministically (pre-transition). No streak inflation or deflation results.
2. **DST spring-forward gap hours:** No effect — stored timestamp is UTC and conversion is applied at query time.
3. **`CURRENT_DATE AT TIME ZONE users.timezone` in streak update:** Correctly evaluates the user's calendar day at transaction time.
4. **`next_retry_at DATE` for gate cooldowns:** Raw `DATE` storage is correct; enforcement query `next_retry_at > (now() AT TIME ZONE users.timezone)::DATE` is sound.

No pitfalls require spec changes.

---

## Second Pass: Verification of All 9 CHANGES-NEEDED Items

| # | Item | Location in spec | Status |
|---|------|-----------------|--------|
| 1 | `ClaudeCaller` interface — D-030 prescribing Option A (`claudeCallRaw`) | D-030 (§4), §9 binding constraints | RESOLVED |
| 2 | `LogXP` signature change — explicitly stated as binding constraint | §9 binding constraints (R-003 extension paragraph) | RESOLVED |
| 3 | RLS disabled on `training_sessions` and `gate_submissions` | §5.3 final paragraph, §5.5 final paragraph, §5.7 step 6 | RESOLVED |
| 4 | `completion_ratio` CHECK constraint added | §5.3 DDL: `CHECK (completion_ratio IS NULL OR ...)` | RESOLVED |
| 5 | `bonus_percentage` CHECK constraint added | §5.3 DDL: `CHECK (bonus_percentage IN (0, 10, 25))` | RESOLVED |
| 6 | `attempt_number` computation strategy (max+1, not DEFAULT) | §5.5 DDL comment, explicit prose | RESOLVED |
| 7 | OQ-4 marked as implementation gate | §9 binding constraints ("cannot be merged"), OQ-4 table row | RESOLVED |
| 8 | Migration ordering documented | §5.7 dedicated section, 6-step sequence | RESOLVED |
| 9 | `preset_id` editability clarified (D-031) | D-031 (§4): not editable post-creation, write-once | RESOLVED |

---

## Approval

APPROVED

All 9 items from the first review pass are fully resolved. The spec is technically sound and ready for implementation planning.

**Remaining open item (not a blocker for planning):**
- **OQ-4** — D-026 gate AI prompt template wording awaits user approval. The self-report path and all non-AI handler work can proceed. The AI path of `POST /api/v1/blocker-gates/{id}/submit` is blocked until OQ-4 is closed, as documented in §9.
