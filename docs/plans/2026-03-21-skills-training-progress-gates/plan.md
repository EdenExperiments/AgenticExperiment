# Implementation Plan — Skills: Training Sessions, Progress Visualisation & Gate Mastery

**Spec:** `docs/specs/2026-03-21-skills-training-progress-gates/spec.md`
**Gateway:** GO (2026-03-21)
**Date:** 2026-03-21

---

## Parallelisation Map (from arch-review.md)

```
[T1] Tester ─────────────────────────────────────────────────────────────────┐
                                                                              │
[T2-BE1] Migration ──────────────────────────────────────────────────────┐   │
                                                                          │   │ (tests gate merge)
[T2-BE2] xp-chart endpoint (independent) ────────────────────────────┐  │   │
                                                                      │  │   │
[T3-FE1] api-client types ──────────────────────┐                    │  │   │
                                                 │                    │  │   │
[T3-FE2] Pure display components (mocked data)   │ (unblocked)       │  │   │
[T3-FE3] GrindOverlay + PostSessionScreen  ──────┘ (integrates after BE1+BE3) │
[T3-FE4] Gate submission UI ─────────────────────────────────────────────────┘
                                                                              │
[T4] Reviewer code gate ──────────────────────────────────────────────────────┘

Sequence gates:
  T2-BE1 must land before: T2-BE3, T2-BE4, T2-BE5
  T3-FE1 must land before: T3-FE3 integration, T3-FE4 integration
  OQ-4 (prompt approval) must be resolved before: T2-BE4 AI path merges
  T1 tests must exist before: T2-BE3, T2-BE4, T2-BE5 merge
```

---

## Tasks

### T1 — Tester: Write failing tests

**Owner:** tester agent
**Depends on:** Nothing (run immediately from spec ACs)
**Must complete before:** T2-BE3, T2-BE4, T2-BE5 implementation merges

**Backend tests (Go, `apps/api/`):**

| AC | Test |
|----|------|
| C1, C2 | Pure function tests for bonus XP calculation: full completion (≥0.95), partial (0.50–0.94), no-bonus (<0.50), active-use vs standard |
| C2 | Boundary cases: exactly 0.50, exactly 0.95, 0.499, 0.951 |
| C3 | `POST /api/v1/skills/{id}/sessions` with `status=abandoned`: returns 200, no `xp_events` row inserted, `training_sessions` row created with `bonus_xp=0` |
| E1–E4 | Streak logic: new streak starts at 1, increments on consecutive days, resets on gap, longest_streak never decreases |
| E4 | Streak update is inside the same transaction as XP insert (R-003): verify atomicity |
| G2 | `POST /api/v1/blocker-gates/{id}/submit` with short evidence: returns HTTP 422 with field-level error map |
| G7 | Gate submission rejected during cooldown: returns HTTP 429 |
| G3 | Gate AI failure (mocked): returns HTTP 502, no gate_submissions row created |
| G4 | Self-report path: gate_submissions row created with `verdict=self_reported`, blocker_gates.is_cleared=true |
| D-029 | `PATCH /api/v1/account` with invalid IANA timezone string: returns HTTP 422 |
| B8 API | `POST /api/v1/skills/{id}/sessions` with `status=completed` and `xp_delta=0` (abandoned recovery no-log): no xp_events row |
| F5 | `GET /api/v1/skills/{id}/xp-chart?days=30`: returns exactly 30 entries, zero-XP days present, dates in ascending order |

**Frontend tests (Vitest + RTL, `packages/ui/src/` and `apps/rpg-tracker/`):**

| AC | Test |
|----|------|
| B1 | Skill detail renders "Start Session" as primary button and "Log XP" as secondary |
| B2 | Session config overlay renders with Cancel affordance; Cancel closes overlay without starting session |
| B3 | System back during Grind View triggers end-session-early confirmation, not navigation |
| C3 | End-session-early shows three options: "Keep Going", "Claim Session", "Abandon (no XP)" |
| D4 | Action buttons sticky at viewport bottom on mobile viewport (375px) |
| D8 | "Dismiss / Log Later" closes overlay, does not call createSession API |
| E5 | Streak badge hidden when current_streak=0; motivational prompt shown |
| E6 | Streak badge shown on SkillCard only when current_streak≥2 |
| F1 | XPBarChart empty state: renders copy, not empty bars, when all values=0 |
| G1 | `BlockerGateSection` renders "Submit for Assessment" button when `first_notified_at` is set and `is_cleared=false`; button absent when `is_cleared=true` or `first_notified_at` is null |
| G2 | Inline character counter updates on keystroke; turns green at minimum threshold |
| G3 | AI loading state renders "Assessing your evidence..." with disabled submit |
| G3 | Rejected state: form hidden, feedback shown, retry button disabled, date-based retry message |
| G8 | Gate section shows attempt count label "Attempt N of ∞" using `active_gate_submission.attempt_number` |
| B6 | GrindAnimation renders `phase="work"` with tier colour ring; `phase="break"` with `--color-break` |

---

### T2-BE1 — Backend: Database migration

**Owner:** backend agent
**Depends on:** T1 (tests written)
**Blocks:** T2-BE3, T2-BE4, T2-BE5

Migration file: `apps/api/db/migrations/000006_skills_training_gates.up.sql`

Implement in this exact order (§5.7 ordering constraint):
1. `ALTER TABLE users ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC'`
2. `ALTER TABLE skills ADD COLUMN requires_active_use BOOLEAN NOT NULL DEFAULT FALSE`; add `current_streak INT NOT NULL DEFAULT 0`, `longest_streak INT NOT NULL DEFAULT 0`, `last_log_date DATE`, `animation_theme TEXT NOT NULL DEFAULT 'general'`
3. `CREATE TABLE training_sessions` — full DDL per §5.3 (including CHECK constraints on `completion_ratio` and `bonus_percentage`)
4. `ALTER TABLE xp_events ADD COLUMN training_session_id UUID REFERENCES public.training_sessions(id) ON DELETE SET NULL`
5. `CREATE TABLE gate_submissions` — full DDL per §5.5 (including attempt_number as NOT NULL with no DEFAULT; computed at insert time as MAX+1)
6. `DISABLE ROW LEVEL SECURITY` on `training_sessions` and `gate_submissions`

Also write the down migration (`000006_skills_training_gates.down.sql`).

---

### T2-BE2 — Backend: XP chart endpoint (parallel, independent)

**Owner:** backend agent
**Authored in parallel with:** T2-BE1 (no authoring dependency). Requires T2-BE1 to have landed before **integration testing** (SQL needs `users.timezone` column to exist).
**Parallel with:** T2-BE3, T2-BE4, T2-BE5 (independent of those)

- `GET /api/v1/skills/{id}/xp-chart?days=N` handler + repository function
- SQL query using `AT TIME ZONE users.timezone` (see arch-review §Service Boundaries)
- **Zero-fill in Go** (not SQL): generate a full slice of N dates, merge DB results, emit 0 for missing dates
- Default N=30, max 365; validate and clamp in handler
- Wire up route in chi router

---

### T2-BE3 — Backend: Training session endpoint + LogXP extension

**Owner:** backend agent
**Depends on:** T2-BE1, T1 tests for C1/C2/C3/E1–E4

- **`claudeCallRaw` refactor (D-030):** Extract `claudeCallRaw(ctx, apiKey, systemPrompt, userPrompt string) (string, error)` from existing `calibrate.go`. Refactor `CalibrateHandler` to use it.
- **`LogXP` signature change:** Add `trainingSessionID *uuid.UUID` parameter. Update INSERT statement to include `training_session_id` column. **This is a repository contract change** — all existing callers must pass `nil`.
- **Streak update inside LogXP transaction:** Read `users.timezone` (single indexed lookup), compute `currentDate = now() AT TIME ZONE timezone ::DATE`, compare to `last_log_date`, update `current_streak`, `longest_streak`, `last_log_date` atomically.
- **Bonus XP calculation in handler:** `bonusXP = round(xpDelta * bonusPct / 100)`. Total = `xpDelta + bonusXP`. Pass total as `xp_delta` to `LogXP` (AC-C4).
- **`POST /api/v1/skills/{id}/sessions`** handler + `SessionStore` interface:
  - Compute `completion_ratio = actual / planned` (0.000–1.000)
  - Compute `bonus_percentage` based on ratio and `requires_active_use` (C1, C2)
  - Compute `bonus_xp`
  - For `status=abandoned`: insert `training_sessions` row only, return `{session, xp_result: null, streak: null}`
  - For `status=completed|partial`: insert `training_sessions` row, call `LogXP` with session ID and total XP, return full result
- **`GET /api/v1/skills/{id}/sessions`** handler + `ListSessions` repository method:
  - Cursor-based pagination on `created_at DESC`, default limit 20, max 100
  - Query param: `?limit=N&before=<cursor>` (cursor = ISO timestamp)
  - Returns response shape per §6 (sessions array + next_cursor)
  - Wire up chi route alongside POST sessions
- Update `GET /api/v1/skills/{id}` response to include `streak`, `active_gate_submission`, `requires_active_use`, `animation_theme`
- Update `GET /api/v1/skills` list response to include `current_streak`, `requires_active_use`
- Update `toSkillDetail()` helper accordingly

---

### T2-BE4 — Backend: Gate submission endpoint

**Owner:** backend agent
**Depends on:** T2-BE1, T2-BE3 (`claudeCallRaw` refactor), T1 tests for G2/G3/G4/G7
**HARD GATE: OQ-4 (D-026 prompt template) must be approved by user before AI path can merge.**

- `POST /api/v1/blocker-gates/{id}/submit` handler:
  - Load gate + skill + user (for timezone and API key)
  - Validate character minimums (G2); return HTTP 422 with field map if failed
  - Check cooldown: `SELECT next_retry_at FROM gate_submissions WHERE gate_id=$1 ORDER BY submitted_at DESC LIMIT 1`. If `next_retry_at > (now() AT TIME ZONE users.timezone)::DATE` → HTTP 429
  - Compute `attempt_number = COALESCE(MAX(attempt_number), 0) + 1` inside transaction
  - **Self-report path (`path=self_report`):** Require `self_confirm=true`. Insert `gate_submissions` with `verdict=self_reported`. Update `blocker_gates.is_cleared=true, cleared_at=now()`.
  - **AI path (`path=ai`):** Decrypt API key (D-015). Build prompt per D-026. Call `claudeCallRaw`. Parse `{verdict, feedback}` JSON from response. On Claude error → HTTP 502, no insert. On success → insert `gate_submissions`, update gate if approved.
  - Return shape per §6.

- **`PATCH /api/v1/account` timezone:** Accept `timezone` field. Validate with `time.LoadLocation(tz)` → HTTP 422 if invalid. Update `users.timezone`.

---

### T2-BE5 — Backend: `animation_theme` at skill creation

**Owner:** backend agent
**Depends on:** T2-BE1

- In `CreateSkill` handler: when `preset_id` is provided, join `skill_presets → skill_categories` to read `category.slug`. Apply D-023 mapping to set `animation_theme`. If no preset or unknown slug → `'general'`.
- Return `animation_theme` in `SkillDetail`.

---

### T3-FE1 — Frontend: api-client type updates (must land first)

**Owner:** frontend agent
**Depends on:** Nothing (can proceed from spec alone)
**Blocks:** T3-FE3, T3-FE4 integration

In `packages/api-client/src/`:
- Update `SkillDetail`: add `streak: { current: number; longest: number }`, `active_gate_submission: GateSubmission | null`, `requires_active_use: boolean`, `animation_theme: string`
- Update `SkillListItem`: add `current_streak: number`, `requires_active_use: boolean`
- Add type `TrainingSession` (mirrors §6 sessions response)
- Add type `GateSubmission` (mirrors §6 gate response)
- Add API functions: `createSession(skillId, body)`, `listSessions(skillId, params)`, `getXPChart(skillId, days)`, `submitGate(gateId, body)`
- Update `Account` type: add `timezone: string`; add `updateAccount(data)` function

---

### T3-FE2 — Frontend: Pure display components (parallel, mocked data)

**Owner:** frontend agent
**Depends on:** T3-FE1 (for types)
**Parallel with:** T2-BE3, T2-BE4

Build these components in `packages/ui/src/` with mocked/prop-driven data (no live API calls):

| Component | Key props / contract |
|-----------|---------------------|
| `XPBarChart` | `data: {date: string, xp_total: number}[]`, `tierColor: string`; empty state; tap-to-inspect tooltip; min bar width 6px |
| `SkillStreakBadge` | `current: number`, `longest: number`; hidden when current=0 |
| `PersonalBests` | `highestSingleSession: number`, `longestStreak: number`, `totalXP: number` |
| `MonthlySummary` | `monthlyXP: number`, `trackedMinutes: number`, `daysActive: number` |
| `GrindAnimation` | `theme: string` (from D-023), `phase: "work" \| "break"`; work phase uses tier CSS var; break phase uses `--color-break: #60a5fa` at 60% speed |

---

### T3-FE3 — Frontend: GrindOverlay + PostSessionScreen

**Owner:** frontend agent
**Depends on:** T3-FE1, T3-FE2 (GrindAnimation); integrates with T2-BE3
**Shared-file ownership (coordination with T3-FE4):** T3-FE3 owns `SkillCard.tsx` modifications. T3-FE4 owns `BlockerGateSection.tsx` and `QuickLogSheet.tsx` modifications. Do not touch those files in this task.

Build in `packages/ui/src/`:

`GrindOverlay` — fullscreen on mobile, panel on desktop:
- Hides bottom tab bar (add class to layout root or use portal)
- Circular progress ring (work phase counts down)
- `GrindAnimation` child
- "End Session" button → end-session-early confirmation sheet (three options per C3)
- System back-gesture intercept → same confirmation sheet
- Break phase: auto-transition after work countdown; "Skip Break" button → post-session screen
- Persists session to `localStorage` on start (D-032); clears on dismiss/submit
- Session recovery banner (B8)

`PostSessionScreen` — continuation of same overlay:
- XP chip row (pre-selected per D-024; uses `QuickLogChips` — do not duplicate formula client-side)
- Three optional reflection textareas
- Sticky footer: "Quick Log" (primary) / "Log + Reflect" (secondary) / "Dismiss / Log Later" (low-emphasis text)
- System back → same as "Dismiss / Log Later" (D1)
- Calls `createSession()` on submit

Update `apps/rpg-tracker/app/(app)/skills/[id]/page.tsx`:
- Add "Start Session" (primary) alongside "Log XP" (secondary) — B1 layout
- Wire `GrindOverlay` with `SkillStreakBadge`, `XPBarChart`, `PersonalBests`, `MonthlySummary`

Update `apps/rpg-tracker/app/(app)/skills/new/page.tsx` and `[id]/edit/page.tsx`:
- Add "Active device use required" toggle (A1, A2)

---

### T3-FE4 — Frontend: Gate submission UI + QuickLogSheet update

**Owner:** frontend agent
**Depends on:** T3-FE1; integrates with T2-BE4
**Shared-file ownership (coordination with T3-FE3):** T3-FE4 owns `BlockerGateSection.tsx` and `QuickLogSheet.tsx` modifications. Do not touch `SkillCard.tsx` in this task — that is owned by T3-FE3.

Build in `packages/ui/src/`:

`GateSubmissionForm` — inline inside `BlockerGateSection`:
- Path selector: AI (shown only if user has API key) / Self-report
- Three textareas with inline character counters (G2)
- AI path: loading state "Assessing your evidence..." with disabled submit; 30s client timeout (G3)
- AI-unavailable error: inline message + path selector remains accessible
- Submit button

`GateVerdictCard` — rendered when `active_gate_submission` is present:
- Approved: never shown (gate clears, XP bar re-appears)
- Rejected: hide form, show AI feedback, show date-based retry message ("Retry available tomorrow" / "Retry available on [date]"), disabled Retry button; on cooldown expiry pre-fill previous evidence
- Self-reported: confirmation message

Update `BlockerGateSection` to:
- Show "Submit for Assessment" button when `first_notified_at` set and `is_cleared=false`
- Render `GateSubmissionForm` / `GateVerdictCard` based on `active_gate_submission`
- On gate cleared: XP progress bar re-appears; next gate section not shown until that gate level is reached

Update `QuickLogSheet` to add optional "Time spent (minutes)" field (D7).

---

### T4 — Reviewer: Code gate review

**Owner:** reviewer agent
**Depends on:** All T2 and T3 tasks complete
**Gate condition:** OQ-4 must be resolved before gate handler AI path is included in the review

Review criteria:
- All T1 failing tests now pass
- No new tests added to make failing tests pass (TDD discipline)
- `LogXP` signature change has no callers passing incorrect values
- `xp_events.xp_delta` = base + bonus in all code paths (no accidental base-only writes)
- `claudeCallRaw` used by both CalibrateHandler and GateHandler; no duplicate HTTP client logic
- Streak update is inside `LogXP` transaction boundary (not a separate DB call)
- `DISABLE ROW LEVEL SECURITY` present in migration for both new tables
- `attempt_number` computed as MAX+1 inside transaction (not DEFAULT 1)
- `animation_theme` written at skill creation, not at read time
- Client-side `localStorage` session recovery clears correctly on submit and dismiss

---

## OQ-4 Resolution Required

The D-026 gate AI prompt template wording must be reviewed and approved by the user **before the AI path of the gate handler can be merged**. The self-report path can be shipped independently.

**OQ-4 RESOLVED 2026-03-21.** Approved prompt template (D-026):

```
System:
You are assessing whether a user has genuinely reached {tier_name} level (level {gate_level})
in the skill "{skill_name}". At this tier, a practitioner demonstrates:
{tier_criteria}

The gate they are submitting for: "{gate_title}"
{gate_description if custom, otherwise omit this line}

Assess the user's evidence strictly but fairly. Be unconvinced by vague or generic statements.
Be convinced by specific examples, described challenges, and honest self-reflection.

If approved: respond with 1-2 sentences of genuine affirmation.
If rejected: respond with a detailed explanation (3-5+ sentences) covering what was missing,
what would constitute sufficient evidence at this tier, and what the user should focus on
before retrying. Be specific and constructive — not harsh, but not vague.

Do not ask questions back. This is a single-submission assessment, not a conversation.

Respond ONLY with valid JSON:
{"verdict": "approved" | "rejected", "feedback": "<your feedback>"}

User:
What they accomplished: {evidence_what}
How they developed the skill: {evidence_how}
How they felt about their progress: {evidence_feeling}
```

---

## Summary

| Task | Owner | Parallel with | Blocks |
|------|-------|--------------|--------|
| T1 | tester | — | T2-BE3, BE4, BE5 merge |
| T2-BE1 | backend | T3-FE1, T3-FE2 | T2-BE3, BE4, BE5 |
| T2-BE2 | backend | T2-BE3, BE4, BE5 | — |
| T2-BE3 | backend | T3-FE2, T3-FE3 (build) | T4 |
| T2-BE4 | backend | T3-FE2, T3-FE4 (build) | T4; AI path gated on OQ-4 |
| T2-BE5 | backend | T3-FE1, T3-FE2 | T4 |
| T3-FE1 | frontend | T2-BE1, BE2, BE3 | T3-FE3, FE4 (integration) |
| T3-FE2 | frontend | T2-BE3, BE4, BE5 | T3-FE3, FE4 |
| T3-FE3 | frontend | T2-BE4, BE5 | T4 |
| T3-FE4 | frontend | T2-BE3, BE5 | T4 |
| T4 | reviewer | — | Merge |
