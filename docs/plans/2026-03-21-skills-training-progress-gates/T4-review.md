# T4 Code Gate Review

**Verdict: NO-GO**
**Date:** 2026-03-21

## Criteria Checks

### 1. bonus_xp.go — ComputeBonus thresholds

PASS — Thresholds are correct: `>= 0.95` returns fullPct, `>= 0.50` returns `math.Round(float64(fullPct) * ratio)`, `default` returns 0. fullPct is 25 for standard, 10 for active-use. bonusXP = `math.Round(baseXP * bonusPct / 100)`. All three branches match spec.

### 2. streak.go — Timezone-aware calendar date comparison

PASS — `now` is converted to `userTimezone` via `time.LoadLocation` before extracting year/month/day. `lastLogDate` is extracted in UTC (correct for a DATE column stored as UTC midnight). Both dates are normalised to UTC midnight for diff calculation. Falls back to UTC on invalid timezone. Logic matches D-029.

### 3a. xp_repository.go — LogXP signature has trainingSessionID *uuid.UUID param

FAIL (BLOCKER) — `LogXP` signature is `func LogXP(ctx context.Context, db *pgxpool.Pool, userID, skillID uuid.UUID, xpDelta int, logNote string) (*LogXPResult, error)`. There is no `trainingSessionID *uuid.UUID` parameter. The INSERT into `xp_events` does not include `training_session_id`. The spec requires xp_events rows created by a training session to carry the FK back to that session; without the param this link is impossible.

### 3b. xp_repository.go — Streak update inside same transaction as xp_events INSERT

FAIL (BLOCKER) — `LogXP` does not update streak columns (`current_streak`, `longest_streak`, `last_log_date`) on the `skills` table at all. The `UPDATE public.skills` at line 86 only sets `current_xp`, `current_level`, and `updated_at`. Streak is computed by `ComputeStreak` but never persisted inside this transaction or anywhere in xp_repository.go.

### 3c. xp_repository.go — xp_delta = base+bonus passed in (not computed inside LogXP)

PASS — `LogXP` accepts `xpDelta int` from the caller and uses it directly; it does not compute bonus internally. Responsibility for computing the combined delta sits with the caller.

### 4a. session.go (handler) — Abandoned path skips xp_events

PASS (with qualification) — The handler correctly gates `baseXP` parsing behind `status != "abandoned"` and passes `BaseXP: 0` for abandoned sessions. However, the actual "skip xp_events" enforcement must live in the `CreateSession` store implementation, which is not provided (only a stub exists — see criterion 4 notes below). The handler test's stub validates the contract (`xpEventCreated = req.Status != "abandoned"`), which is correct behaviour.

### 4b. session.go (handler) — xp_delta passed to LogXP = xpDelta + bonusXP

FAIL (BLOCKER) — The session handler calls `h.store.CreateSession(...)` passing only `BaseXP`. There is no `dbSessionStore` implementation anywhere in the codebase; the real DB implementation that should call `ComputeBonus`, add bonus to base, and pass the combined total to `LogXP` does not exist. The T2 status is "BLOCKED" and the notes explicitly state "Full DB implementation is deferred." The combined-delta requirement cannot be verified as passing.

### 5a. gate.go — Cooldown check returns 429

PASS — `GetActiveCooldown` is called before any submission logic; if `nextRetryAt != nil` the handler returns `http.StatusTooManyRequests` (429) with message "gate submission in cooldown" (lines 94-103).

### 5b. gate.go — attempt_number = MAX+1 in transaction

FAIL (BLOCKER) — `handleSelfReport` and `handleAISubmission` both hardcode `AttemptNumber: 1` in `CreateGateSubmissionRequest`. There is no query to `SELECT MAX(attempt_number)` from `gate_submissions` nor any transactional MAX+1 computation. AC-G8 ("Attempt N of ∞") requires the attempt counter to reflect actual submission history; hardcoding 1 means every submission after the first will carry the wrong attempt number.

### 5c. gate.go — Claude failure returns 502 with no DB insert

PASS — In `handleAISubmission`, if `h.claude.CallRaw` returns an error the handler calls `api.RespondError(w, http.StatusBadGateway, "ai assessment unavailable")` and returns immediately; `InsertSubmission` is never called on that path (lines 162-167).

### 5d. gate.go — claudeCallRaw / raw text helper used (not typed response)

PASS — `RawClaudeCaller` interface exposes `CallRaw(...) (string, error)`. `httpRawClaudeCaller.CallRaw` decodes the Anthropic response minimally (extracts only `.Content[0].Text`) and returns raw string. No typed domain struct is used for the Claude response.

### 6. xpchart.go — Zero-fill is in Go, not SQL

PASS — `GetXPEvents` returns raw `[]DailyXP` from the DB. The handler builds a dense N-entry slice in Go (lines 79-92) by iterating over a date range and looking up each date in `xpByDate` map, defaulting to 0 for misses. Zero-fill is entirely in Go.

### 7. claude_raw.go — Raw text helper exists

PASS — `httpRawClaudeCaller` in `claude_raw.go` implements `RawClaudeCaller.CallRaw`. It sends a request to the Anthropic messages API and returns `anthropicResp.Content[0].Text` as a raw string.

### 8a. Migration — training_sessions and gate_submissions have DISABLE ROW LEVEL SECURITY

PASS — Lines 54-55 of the migration explicitly execute `ALTER TABLE public.training_sessions DISABLE ROW LEVEL SECURITY` and `ALTER TABLE public.gate_submissions DISABLE ROW LEVEL SECURITY`.

### 8b. Migration — training_sessions created before xp_events FK alteration

PASS — `CREATE TABLE IF NOT EXISTS public.training_sessions` is Step 3; `ALTER TABLE public.xp_events ADD COLUMN IF NOT EXISTS training_session_id UUID REFERENCES public.training_sessions(id)` is Step 4. Correct ordering.

### 8c. Migration — CHECK constraints on completion_ratio and bonus_percentage

PASS — `completion_ratio NUMERIC(5,4) ... CHECK (completion_ratio >= 0 AND completion_ratio <= 1)` and `bonus_percentage INT ... CHECK (bonus_percentage IN (0, 10, 25))` are both present in the `training_sessions` DDL.

### 9. PostSessionScreen.tsx — Dismiss/Log Later does NOT call createSession

PASS — The "Dismiss / Log Later" button at line 143-148 calls `onDismiss()` only. No API call, no `createSession` invocation. The `onSubmit` callback (which is the only path to API calls) is not invoked. Test at `PostSessionScreen.test.tsx:46` (AC-D8) verifies this via mock assertion.

### 10. GateSubmissionForm.tsx — Form fields hidden when verdict=rejected

PASS — Lines 63-87 implement an early return when `previousSubmission?.verdict === 'rejected'`, rendering only the AI feedback, retry date, and disabled retry button. The `data-testid="form-fields"` div and the evidence textareas are not rendered in this path.

### Existing LogXP callers — do all pass nil for trainingSessionID?

NOT APPLICABLE (BLOCKER) — `LogXP` does not have a `trainingSessionID` parameter. All existing callers (`handlers/xp.go:37`, `skills/xp_test.go:20,44,56`) call the current 6-argument signature. No migration to the new signature has occurred. When the signature is extended, all callers must be updated; none currently pass `nil` for a non-existent param.

## Non-blocking Notes

- **T2 status is BLOCKED.** The backend agent flagged this document as BLOCKED before submission, indicating the agent itself identified incomplete work. This review confirms three of the four blocking items the agent did not resolve.
- **Failing test `TestBonusXPPartialCompletion/ratio_0.75`** — the implementation is correct (`math.Round` gives 19); the test expectation of 18 is the bug. The test must be fixed to `wantBonusPct: 19`. This is not a blocker on the implementation but must be resolved to achieve a clean test run.
- `**dbGateStore` and `dbXPChartStore` are compile-only stubs** — `GetActiveCooldown`, `InsertSubmission`, `ClearGate`, and `GetXPEvents` all return `nil, nil`. The live endpoints will silently succeed without touching the DB. This is noted as intentional deferral but means no integration test coverage is possible until implemented.
- `**dbSessionStore` is entirely absent** — there is no production implementation of `SessionStore`. The interface and stub exist but the handler will panic or fail to wire at startup if `NewSessionHandlerWithStore` is only called from tests and no `NewSessionHandler(db)` constructor exists.
- **Migration number is 000007 not 000006** — acceptable; the agent correctly detected the 000006 slot was occupied. No action needed.
- **Frontend tests: all 68 UI tests and 34 rpg-tracker tests pass** (T3 DONE). No frontend blockers.

## Blocking Issues

1. `apps/api/internal/skills/xp_repository.go:48` — `LogXP` is missing the `trainingSessionID *uuid.UUID` parameter. The `INSERT INTO public.xp_events` at line 76-79 omits `training_session_id`. Sessions cannot link XP events back to the training_sessions row without this param and column in the INSERT.
2. `apps/api/internal/skills/xp_repository.go:84-99` — Streak columns (`current_streak`, `longest_streak`, `last_log_date`) are never updated inside the transaction. `ComputeStreak` exists but is never called from `LogXP`. The UPDATE at line 86 only persists `current_xp` and `current_level`. Streak state will never advance in the DB.
3. `apps/api/internal/handlers/gate.go:127` and `:170` — `AttemptNumber: 1` is hardcoded in both `handleSelfReport` and `handleAISubmission`. The spec requires `attempt_number = MAX(attempt_number) + 1` from existing submissions for this gate, computed inside a transaction to be race-safe.
4. `apps/api/internal/handlers/session.go` / missing `dbSessionStore` — No real `CreateSession` implementation exists. The production code path for computing `completionRatio`, calling `ComputeBonus`, summing `base+bonus`, calling `LogXP` with the combined delta, updating streak, and inserting the `training_sessions` row is absent. The handler is wired only to an interface with no concrete DB-backed implementation.