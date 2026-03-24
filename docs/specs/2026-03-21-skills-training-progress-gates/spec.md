# Spec: Skills — Training Sessions, Progress Visualisation & Gate Mastery

**Status:** SHIPPED
**Date:** 2026-03-21
**Feature slug:** `skills-training-progress-gates`
**Spec author:** Orchestrator

---

## 1. Overview

This spec extends the existing skills feature (F-007/F-008) with three interrelated pillars:

1. **Training Sessions** — Pomodoro-style focus mode that rewards commitment with bonus XP, plus optional self-reflection logging after each session.
2. **Progress Visualisation** — Streaks, XP charts, personal bests, and monthly summaries to surface a user's growth over time.
3. **Gate Mastery** — The first implementation of gate completion (previously deferred via D-010): self-report with written evidence + optional AI assessment using the user's existing Claude API key (D-015 infrastructure).

Social features (leaderboards, friends) are **out of scope** — see separate future spec.

---

## 2. User Stories

| ID | Story |
|----|-------|
| US-01 | As a user, I want to start a focused Pomodoro session for a skill so I feel fully committed to the training and earn bonus XP for staying focused. |
| US-02 | As a user, I want to claim partial credit for a session I had to cut short so I'm not penalised for real-world interruptions. |
| US-03 | As a user, I want to write a short reflection after a session so I can develop self-awareness about how the training went. |
| US-04 | As a user, I want to see my XP history as a chart so I can spot trends in my consistency. |
| US-05 | As a user, I want to see my current and longest streak so I'm motivated to log every day. |
| US-06 | As a user, I want to submit evidence for a blocker gate so I can unlock the next tier of progression. |
| US-07 | As a user with a Claude API key, I want AI to assess my gate evidence so the verdict feels objective and meaningful. |
| US-08 | As a user without an API key, I want to self-report gate completion with written evidence so I can always make progress. |
| US-09 | As a user whose skill requires active phone use (e.g. reading, watching), I want to mark that and still earn a smaller time bonus. |

---

## 3. Acceptance Criteria

### AC-Group A: Active Use Flag

- **A1** — Skill creation wizard (Step 1) includes an "Active device use required" toggle. Default: off.
- **A2** — Skill edit page exposes the same toggle.
- **A3** — `skills` table stores `requires_active_use BOOLEAN NOT NULL DEFAULT FALSE`.
- **A4** — `SkillDetail` API response includes `requires_active_use`.

### AC-Group B: Starting a Pomodoro Session

- **B1** — Skill detail page shows a "Start Session" button as the **primary action** (filled/prominent style) and the existing "Log XP" button as **secondary** (outlined/subdued). Both appear in a two-button row below the XP progress bar / gate section.
- **B2** — Tapping "Start Session" opens a session config overlay with: work duration display (25 min), break duration display (5 min), a brief note "Sessions under 50% of planned time earn no time bonus", and a "Begin" CTA. The overlay has an explicit **Cancel** affordance (✕ button top-right or swipe-down on mobile) so users can dismiss without starting.
- **B3** — Tapping "Begin" transitions to the **Grind View**:
  - Mobile: fullscreen overlay occupies the entire viewport. **The bottom tab bar is hidden** while the Grind View is active (D-017 compliance). System back-button / back-gesture intercepts to show the end-session-early confirmation (C3) instead of navigating away.
  - Desktop: animated panel within the skill detail page with an optional browser-fullscreen button.
- **B4** — The Grind View shows: themed animation, circular progress ring, elapsed time, remaining time, and a "✕ End Session" button. If `requires_active_use = true`, a label "Active use mode — phone interaction expected" is shown beneath the animation ring, accompanied by an ⓘ icon that reveals a tooltip on tap: "This skill requires active device use. A reduced bonus of +10% applies (vs. +25% for hands-free sessions)."
- **B5** — The animation theme is determined by the skill's preset category slug (see D-023 mapping table). Custom skills (no preset) display the default "General" animation.
- **B6** — Work phase and break phase are rendered by separate named animation variants in `GrindAnimation.tsx` (`phase="work"` | `phase="break"`). The work phase uses the skill's tier colour (D-020) as the progress ring accent. The break phase uses a fixed calm blue (`--color-break: #60a5fa`) regardless of tier, and the animation runs at 60% of its work-phase speed.
- **B7** — At the end of the work phase, the view transitions automatically to the break phase with a brief celebration moment. **Tapping "End Session" during the break phase skips the break immediately** and transitions to the post-session screen — the break is optional (D-028 confirmed: break is not XP-eligible, so skipping it has no XP consequence).
- **B8** — If the user has an active Pomodoro session stored in `localStorage` (session start time + planned duration) and returns to the app after closing it, the skill detail page detects this and shows a dismissible banner: "You left a session in progress — did you finish?" with options "Yes, log it" (opens post-session screen pre-filled with the full duration) and "No, discard" (clears the localStorage entry). This is the session recovery path (see D-032).

### AC-Group C: Session Completion & Bonus XP

- **C1** — On completing the full work block (`completion_ratio ≥ 0.95`), user earns the **full bonus tier**:
  - Standard skill: +25% on logged XP.
  - Active-use-flagged skill: +10% on logged XP.
- **C2** — If a user ends the session early (`completion_ratio < 0.95`):
  - `0.50 ≤ completion_ratio < 0.95`: **partial bonus** = full bonus % × `completion_ratio` — rounded to nearest whole %. The ratio used is always the actual `actual / planned` value, never capped.
  - `completion_ratio < 0.50`: **no bonus** awarded. C2 partial formula is not applied.
- **C3** — The "End Session Early" flow shows a confirmation: elapsed time, projected partial bonus (or "No bonus — minimum 50% required"), and three options: **"Keep Going"** / **"Claim Session"** / **"Abandon (no XP)"**. "Abandon" records a `training_sessions` row with `status = 'abandoned'`, `bonus_xp = 0`, and does NOT create an `xp_events` row. The user is returned to the skill detail page.
- **C4** — `xp_events.xp_delta` stores the **combined total** (`base_xp + bonus_xp`), keeping `SUM(xp_delta) = skills.current_xp` true. `training_sessions.bonus_xp` records the bonus portion separately for display and audit. "Never hidden in the base delta" means the breakdown is always surfaced to the user (AC-C5) — it does not mean they are stored in separate ledger entries.
- **C5** — The post-session log screen shows both values: "Base: 250 XP + Bonus: +62 XP (25%)" before submission.
- **C6** — Bonus XP is awarded atomically within the same `LogXP` transaction (R-003 extension).

### AC-Group D: Post-Session Log & Reflection

- **D1** — After a session (complete or partial), the Grind View transitions to the **Post-Session Screen** instead of dismissing. The Post-Session Screen is part of the same overlay stack — the bottom tab bar remains hidden. The system back-gesture (Android/iOS) while on the Post-Session Screen triggers the same behaviour as "Dismiss / Log Later" (D8): closes the overlay, returns to skill detail, no XP recorded.
- **D2** — Post-Session Screen pre-selects the nearest XP chip based on session duration × tier (formula: see D-024). User may change to any chip or enter a custom amount.
- **D3** — Post-Session Screen includes three **optional** reflection fields:
  - "What did you work on?"
  - "How did the session go?"
  - "How did you feel about it?"
- **D4** — A "Quick Log" button submits immediately with the selected XP amount and no reflection. Action buttons ("Quick Log" and "Log + Reflect") are **pinned to the bottom of the viewport** (sticky footer) on mobile, so the primary actions remain thumb-reachable regardless of scroll position.
- **D5** — A "Log + Reflect" button submits with XP + reflection content.
- **D6** — Reflection fields are stored in `training_sessions`. They appear in the XP history on the skill detail page (expandable, below the XP delta and timestamp).
- **D7** — Manual XP logs (via QuickLogSheet) retain the existing flow. An optional "Time spent (minutes)" field is added. Time is stored in the associated `training_sessions` record (session_type: 'manual'). No bonus XP for manual logs.
- **D8** — A **"Dismiss / Log Later"** link (small, low-emphasis text) appears above the action buttons on the Post-Session Screen. Tapping it closes the overlay entirely and returns to the skill detail page without recording XP or a session. The session `localStorage` entry is cleared. This path is always available — the app never forces a user to log.

### AC-Group E: Streak Tracking

- **E1** — A skill's **current streak** = the number of consecutive calendar days (in the user's timezone) on which at least one XP event was logged. A streak of 1 means the user logged today but not yesterday.
- **E2** — A streak resets to 0 if a calendar day passes with no log for that skill.
- **E3** — **Longest streak** is the historical maximum. It never decreases.
- **E4** — Streak is stored denormalised on `skills` (`current_streak`, `longest_streak`, `last_log_date`) and updated atomically within every `LogXP` transaction.
- **E5** — Skill detail page displays current streak (flame icon + count) and longest streak beneath the XP progress bar / gate section. **When `current_streak = 0`**, the streak badge is hidden and replaced with a motivational prompt: "Log today to start your streak 🔥" (shown once per skill; hides after first log).
- **E6** — Skill card (in the list view) shows the current streak if ≥ 2 days, so users are motivated to keep it alive.

### AC-Group F: Progress Visualisation

- **F1** — Skill detail page includes an **XP Chart** section: a bar chart of daily XP totals for the last 30 calendar days. Zero-XP days render as empty bars (not omitted). **Empty state (all 30 bars = 0):** the chart area shows the copy "Start logging to see your progress here" — no empty bar grid is rendered. Bars support **tap-to-inspect**: tapping a bar shows a small tooltip with the date and exact XP total for that day. Minimum bar width is 6 px with 2 px gap; zero-XP days render as a 2 px hairline stub to indicate the slot exists.
- **F2** — The chart's bar colour matches the skill's current tier colour (D-020).
- **F3** — A **Personal Bests** section shows:
  - Highest XP in a single session (all time): `SELECT MAX(xp_delta) FROM xp_events WHERE skill_id = ?`. Since `xp_events.xp_delta` stores the combined total (base + bonus per AC-C4), no join to `training_sessions` is needed.
  - Longest streak (all time) — sourced from `skills.longest_streak`.
  - Total XP (all time) — sourced from `skills.current_xp`.
- **F4** — A **Monthly Summary** card shows:
  - Total XP logged this calendar month (sum of `xp_events.xp_delta` for the current month).
  - Total tracked time this calendar month: sum of `training_sessions.actual_duration_seconds` WHERE `actual_duration_seconds IS NOT NULL` AND `created_at` is in the current month. Quick-logs with no associated session contribute 0 time; this is expected and not an error state.
  - Days active this month (distinct calendar days with at least one `xp_events` row, computed in the user's timezone).
- **F5** — The XP chart is powered by a new API endpoint: `GET /api/v1/skills/{id}/xp-chart?days=30` returning `[{date, xp_total}]`.

### AC-Group G: Gate Submission

- **G1** — `BlockerGateSection` expands to include a "Submit for Assessment" button when `first_notified_at` is set and `is_cleared = false`.
- **G2** — The gate submission form has three fields (all required for both paths). Each textarea shows an **inline character counter** ("12 / 50") that updates as the user types — green when the minimum is met. Server-side validation: field 1 and 2 must be ≥ 50 characters; field 3 must be ≥ 20 characters. If any field fails validation, the server returns HTTP 422 with `{ "error": "validation_failed", "fields": { "evidence_what": "minimum 50 characters" } }`. UI renders field-level error messages.
  - "What did you accomplish at this level?" (textarea, min 50 chars)
  - "How did you develop this skill to reach this tier?" (textarea, min 50 chars)
  - "How do you feel about your progress?" (textarea, min 20 chars)
- **G3** — **AI path** (user has a valid Claude API key). Assessment is synchronous (no async queue in release 1):
  - Evidence is sent to Claude with the gate's tier criteria as system context (prompt template: D-026).
  - While awaiting the response, the UI shows a loading state with copy: "Assessing your evidence..." and a spinner. The submit button is disabled. The client applies a 30-second timeout — if no response arrives, the UI shows the AI-unavailable error state (same as HTTP 502 path below).
  - Claude returns: verdict (`approved` | `rejected`) + feedback paragraph.
  - If approved: `blocker_gates.is_cleared = true`, `cleared_at = now()`. Level lock releases. Unlock animation plays (D-025). `BlockerGateSection` is replaced by the XP progress bar; the next gate section does not appear until the user naturally reaches that gate level.
  - If rejected: `BlockerGateSection` transitions to a **rejection state**: the submission form is hidden, the AI feedback paragraph is shown in full, and a **date-based retry message** is shown ("Retry available tomorrow" or "Retry available on [date]" — never a live countdown in hours/minutes). A disabled "Retry" button is visible. The three evidence text fields from the previous submission are **pre-filled** when the cooldown expires and the user taps Retry, so they can refine rather than rewrite.
  - If the Claude API call fails (HTTP 502, timeout, or rate limit): the UI shows an inline error: "AI assessment is unavailable right now." The **path selector remains visible** alongside the pre-filled evidence so the user can immediately switch to self-report without losing typed content. No submission is stored, no cooldown is set.
  - If the user navigates away while a gate AI request is in-flight: the request continues server-side. If it resolves, the verdict will be present in `active_gate_submission` on the next skill detail load (G6).
- **G4** — **Self-report path** (no API key, or user opts out of AI):
  - User fills the same three fields.
  - A checkbox: "I confirm I have genuinely reached this level and met the gate requirements."
  - Checking the box and submitting clears the gate immediately.
  - Self-report submissions are stored in `gate_submissions` for future audit/social verification purposes.
- **G5** — `gate_submissions` table stores: `id`, `gate_id`, `user_id`, `evidence_what`, `evidence_how`, `evidence_feeling`, `verdict` ('approved' | 'rejected' | 'self_reported' — no 'pending'; see section 5.4), `ai_feedback`, `attempt_number`, `submitted_at`, `reviewed_at`, `next_retry_at`.
- **G6** — `GET /api/v1/skills/{id}` response includes the latest `gate_submission` (verdict, feedback, next_retry_at) for the active gate.
- **G7** — A user cannot submit a new gate attempt while a cooldown is in effect (enforced server-side).
- **G8** — Attempt count is shown to the user on the gate section ("Attempt 2 of ∞").
- **G9** — **Starting-level gate auto-clear (D-033).** When a skill is created with `starting_level` above a gate boundary, the `CreateSkill` handler auto-clears all gate boundaries strictly below the highest applicable gate in the same creation transaction: `blocker_gates.is_cleared = true, cleared_at = now()`, and a `gate_submissions` row is inserted with `verdict = 'self_reported'`, `attempt_number = 1`, and a system-generated note in all three evidence fields (`"Skill created at a higher starting level — this tier's gate was auto-cleared at creation."`). Only the single highest applicable boundary gate requires a user submission. `EffectiveLevel()` is unchanged — it skips auto-cleared gates and caps at the first uncleaned gate. No cooldown is set on auto-cleared gates. Example: skill created at level 26 → gate 9 auto-cleared, gate 19 open for submission.

---

## 4. New Decisions

| ID | Decision |
|----|----------|
| D-023 | Preset skill categories (from the existing `skill_categories` table) determine Grind View animation themes. The concrete slug → animation mapping is: `fitness` → Fitness/Physical (running figure or heartbeat line), `programming` → Coding/Tech (scrolling code lines or blinking cursor), `creative` → Creative Arts (paintbrush stroke or sketch reveal), `wellness` → Mindfulness/Wellness (slow breathing circle expansion), `learning` → Reading/Study (page-turn or open book), `social` → Language/Speaking (speech waveform or conversation bubbles — not social media iconography), `finance` → General, `nutrition` → General, `productivity` → General. **"General" animation** (the default for custom skills and three mapped slugs — the most commonly seen animation): a pulsing circular ring that breathes in and out with gentle particle emission on the pulse peaks. Neutral, domain-agnostic, visually engaging. Animation themes are implemented as named CSS/SVG animation variants within `GrindAnimation.tsx`. The animation theme is resolved server-side and returned in `SkillDetail.animation_theme: string`. |
| D-024 | Post-session XP chip pre-selection formula: `suggested_xp = round(duration_minutes / 25 × chips[1])` where `chips` is the 0-indexed 4-element chip array (e.g., for Novice tier: `[50, 100, 250, 500]`, so `chips[1] = 100`). Concrete example: 25-min Novice session → `25/25 × 100 = 100` → pre-selects the 100 XP chip. 50-min Expert session (chips ≈ [80, 140, 320, 640]) → `50/25 × 140 = 280` → pre-selects the 320 chip (nearest). User always overrides. This is UI-only; it does not constrain what XP the user logs. |
| D-025 | Gate unlock animation: a brief full-screen celebration (confetti burst + tier badge flash + unlock sound effect if audio is enabled). Duration ≤ 2 seconds. Respects `--motion-scale` CSS variable (no animation if motion preference is reduced). |
| D-026 | Gate AI assessment prompt template (OQ-4 RESOLVED 2026-03-21): system context includes the gate's tier name, gate level, gate title, gate description (if custom), and the standard tier criteria for that level. User message contains the three evidence fields verbatim. Claude returns `{"verdict": "approved"\|"rejected", "feedback": string}`. Feedback length differs by verdict: **approved** = 1-2 sentences of genuine affirmation; **rejected** = detailed explanation (3-5+ sentences) covering what was missing, what would constitute sufficient evidence at this tier, and what the user should focus on before retrying. Claude must not be trivially satisfied by vague or generic statements. No back-and-forth questioning — single submission, single verdict only (conversational mode is future scope). The prompt template is stored in the Go codebase (not user-editable in release 1). |
| D-027 | Subscription system is a dependency for app-provided AI (no user key required). In release 1 of this feature, AI gate assessment requires the user's own Claude API key (D-015). Subscription infrastructure is deferred to a separate spec. A feature flag (`ai_gate_enabled`) in `users` or a config table will gate the subscription-provided AI path when ready. |
| D-028 | Pomodoro MVP is one work block + one break. Multi-cycle (classic 4×25min) is deferred. The break phase is not XP-eligible — only the work phase contributes to time tracking and bonus calculation. |
| D-029 | User timezone is stored as `timezone TEXT NOT NULL DEFAULT 'UTC'` on the `users` table (IANA timezone string, e.g. `'Europe/London'`). It is updated by the client via `PATCH /api/v1/account` on every app launch (client always sends current device timezone). All streak calculations (`last_log_date`, `current_streak` updates) and gate cooldown dates (`next_retry_at`) are computed using this stored timezone. This is authoritative — no per-request timezone header is used. The `PATCH /api/v1/account` handler must validate the timezone value using `time.LoadLocation(tz)` — return HTTP 422 if invalid. |
| D-030 | Gate AI assessment reuses the existing Claude HTTP infrastructure but via a generic helper. The existing `ClaudeCaller.Call` interface returns `*CalibrateResponse` and cannot be reused for gate assessment. Instead, the Go layer exposes a package-level function `claudeCallRaw(ctx, apiKey, systemPrompt, userPrompt string) (string, error)` that returns raw response text. Both `CalibrateHandler` and `GateHandler` call this function and parse the response in their own handler layer. No new interface type is defined. |
| D-031 | `preset_id` is not editable post-skill-creation. The existing `PUT /api/v1/skills/{id}` only accepts `name` and `description`. Therefore `animation_theme` is write-once (set at creation from the preset join, defaulting to 'general' for custom skills). If preset editability is added in a future spec, `animation_theme` must also be updated at that time. |
| D-032 | App-closed-mid-Pomodoro recovery: the Grind View saves session state to `localStorage` on session start (`{ skillId, startedAt, plannedDurationSeconds }`). On skill detail page mount, if a matching `localStorage` entry is found and `now - startedAt < plannedDurationSeconds + 60s`, the recovery banner (AC-B8) is shown. If `now - startedAt >= plannedDurationSeconds`, the banner treats the session as completed (pre-fills full duration). On "No, discard" or after successful logging, the entry is cleared. This is a client-side-only mechanism — no server-side "in-progress" session state is stored in release 1. |

---

## 5. Schema Changes

### 5.1 `users` table — new column
```sql
timezone  TEXT NOT NULL DEFAULT 'UTC'  -- IANA timezone string, e.g. 'Europe/London'
```
Updated by the client on every app launch via `PATCH /api/v1/account` (D-029).

### 5.2 `skills` table — new columns
```sql
requires_active_use  BOOLEAN NOT NULL DEFAULT FALSE
current_streak       INT     NOT NULL DEFAULT 0
longest_streak       INT     NOT NULL DEFAULT 0
last_log_date        DATE             -- calendar date in user's timezone of last XP event; NULL if no logs
animation_theme      TEXT    NOT NULL DEFAULT 'general'  -- resolved from preset category per D-023; written at skill creation, recalculated only if preset_id changes (slugs are fixed so this is effectively write-once)
```

### 5.3 New table: `training_sessions`
```sql
CREATE TABLE public.training_sessions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id                 UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  user_id                  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_type             TEXT NOT NULL CHECK (session_type IN ('pomodoro', 'manual')),
  planned_duration_seconds INT,          -- NULL for manual logs
  actual_duration_seconds  INT,          -- NULL for manual logs
  completion_ratio         NUMERIC(4,3) CHECK (completion_ratio IS NULL OR (completion_ratio >= 0 AND completion_ratio <= 1)),
  bonus_percentage         INT NOT NULL DEFAULT 0 CHECK (bonus_percentage IN (0, 10, 25)),
  bonus_xp                 INT NOT NULL DEFAULT 0,
  status                   TEXT NOT NULL CHECK (status IN ('completed', 'partial', 'abandoned')),
  reflection_what          TEXT,
  reflection_how           TEXT,
  reflection_feeling       TEXT,
  started_at               TIMESTAMPTZ,
  ended_at                 TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX training_sessions_skill ON public.training_sessions (skill_id, created_at DESC);
CREATE INDEX training_sessions_user  ON public.training_sessions (user_id, created_at DESC);
```
RLS: `training_sessions_self_rw` policy defined (aspirational, matching established pattern) but **`DISABLE ROW LEVEL SECURITY`** must be issued in the same migration, following migration 000006. Access control is enforced via `WHERE user_id = $userID` in Go handlers.

### 5.4 `xp_events` table — new column
```sql
training_session_id UUID REFERENCES public.training_sessions(id) ON DELETE SET NULL
```
Nullable. Set when XP is logged via a training session. NULL for legacy and manual quick-logs.

### 5.5 New table: `gate_submissions`
```sql
CREATE TABLE public.gate_submissions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_id          UUID NOT NULL REFERENCES public.blocker_gates(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  evidence_what    TEXT NOT NULL,
  evidence_how     TEXT NOT NULL,
  evidence_feeling TEXT NOT NULL,
  verdict          TEXT NOT NULL CHECK (verdict IN ('approved', 'rejected', 'self_reported')),
  -- No 'pending' state: AI assessment is synchronous. If AI fails → HTTP 502, row not inserted.
  ai_feedback      TEXT,
  -- attempt_number is NOT a DEFAULT — computed as MAX(attempt_number)+1 from existing rows
  -- for this gate_id+user_id inside the insert transaction. First attempt = 1.
  attempt_number   INT NOT NULL,
  submitted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at      TIMESTAMPTZ,
  next_retry_at    DATE CHECK (verdict != 'approved' OR next_retry_at IS NULL)
                              -- calendar date in user's timezone; NULL if approved or self_reported
);

CREATE INDEX gate_submissions_gate ON public.gate_submissions (gate_id, submitted_at DESC);
CREATE INDEX gate_submissions_user ON public.gate_submissions (user_id, submitted_at DESC);
```
RLS: `gate_submissions_self_rw` policy defined (aspirational) but **`DISABLE ROW LEVEL SECURITY`** must be issued in the same migration, following migration 000006 pattern.

### 5.7 Migration ordering constraints

All §5 schema changes land in migration `000006_skills_training_gates.up.sql` in this strict sequence:
1. `ALTER TABLE users` — add `timezone`
2. `ALTER TABLE skills` — add streak/active-use/animation columns
3. `CREATE TABLE training_sessions` — must precede step 4
4. `ALTER TABLE xp_events` — add `training_session_id` FK (depends on step 3)
5. `CREATE TABLE gate_submissions`
6. `DISABLE ROW LEVEL SECURITY` on `training_sessions` and `gate_submissions`

Steps 3→4 are the only hard dependency. All others are independent.

### 5.6 `blocker_gates` table — no new columns
The latest gate submission is fetched at query time (`SELECT ... FROM gate_submissions WHERE gate_id = ? ORDER BY submitted_at DESC LIMIT 1`) within the `GetSkill` handler. No denormalised `latest_submission_id` column is added — this avoids a circular foreign key between `blocker_gates` and `gate_submissions`.

---

## 6. API Changes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/skills/{id}/sessions` | Create and complete a training session; atomically awards base + bonus XP |
| GET | `/api/v1/skills/{id}/sessions` | List training sessions for a skill (paginated) |
| GET | `/api/v1/skills/{id}/xp-chart?days=N` | Daily XP totals for chart (default N=30, max 365) |
| POST | `/api/v1/blocker-gates/{id}/submit` | Submit gate evidence (AI or self-report path) |

### `POST /api/v1/skills/{id}/sessions` — request (form-urlencoded)
```
session_type           pomodoro | manual
planned_duration_sec   int (omit for manual)
actual_duration_sec    int (omit for manual)
status                 completed | partial | abandoned
xp_delta               int (required when status != 'abandoned'; omit or 0 for abandoned)
reflection_what        string (optional)
reflection_how         string (optional)
reflection_feeling     string (optional)
time_spent_minutes     int (optional; for manual type only)
```
When `status = 'abandoned'`: server stores the session row with `bonus_xp = 0`, does NOT insert an `xp_events` row, returns HTTP 200 with `{ "session": { "status": "abandoned", ... }, "xp_result": null, "streak": null }`.

### `POST /api/v1/skills/{id}/sessions` — response
```json
{
  "session": { "id": "...", "status": "completed", "bonus_percentage": 25, "bonus_xp": 62, ... },
  "xp_result": { /* same shape as existing LogXPResult */ },
  "streak": { "current": 5, "longest": 12 }
}
```

### `POST /api/v1/blocker-gates/{id}/submit` — request (form-urlencoded)
```
path                self_report | ai
evidence_what       string (required)
evidence_how        string (required)
evidence_feeling    string (required)
self_confirm        bool (required if path=self_report)
```

### `POST /api/v1/blocker-gates/{id}/submit` — response
```json
{
  "submission": { "id": "...", "verdict": "approved|rejected|self_reported", "ai_feedback": "...", "next_retry_at": "2026-03-22", "attempt_number": 2 },
  "gate_cleared": true,
  "skill": { /* updated SkillDetail */ }
}
```

### `GET /api/v1/skills/{id}/sessions` — response
```json
{
  "sessions": [
    {
      "id": "...",
      "session_type": "pomodoro",
      "status": "completed",
      "planned_duration_seconds": 1500,
      "actual_duration_seconds": 1500,
      "completion_ratio": 1.0,
      "bonus_percentage": 25,
      "bonus_xp": 62,
      "reflection_what": "...",
      "reflection_how": "...",
      "reflection_feeling": "...",
      "started_at": "2026-03-21T10:00:00Z",
      "ended_at": "2026-03-21T10:25:00Z",
      "created_at": "2026-03-21T10:25:01Z"
    }
  ],
  "next_cursor": "2026-03-20T09:00:00Z"
}
```
Pagination: cursor-based on `created_at`. Default limit: 20. Query param: `?limit=N&before=<cursor>`. `next_cursor` is null when no more pages.

### `GET /api/v1/skills/{id}/xp-chart` — response
```json
{
  "days": 30,
  "data": [
    { "date": "2026-02-20", "xp_total": 0 },
    { "date": "2026-02-21", "xp_total": 350 },
    ...
  ]
}
```

### Existing endpoint changes
- `GET /api/v1/skills/{id}` — adds to response:
  - `streak: { current, longest }`
  - `active_gate_submission: { verdict, ai_feedback, next_retry_at, attempt_number } | null`
  - `requires_active_use: bool`
  - `animation_theme: string` (resolved per D-023)
- `GET /api/v1/skills` — skill list items add: `current_streak`, `requires_active_use`
- `PATCH /api/v1/account` — adds `timezone` field (IANA string). Client sends on every app launch (D-029).
- `SkillDetail` type in `packages/api-client/src/` updated accordingly

---

## 7. Frontend Changes

### Zones touched
- `apps/rpg-tracker/app/(app)/skills/[id]/page.tsx` — add streak display, chart section, personal bests, monthly summary, gate submission UI
- `apps/rpg-tracker/app/(app)/skills/[id]/edit/page.tsx` — add active-use toggle
- `apps/rpg-tracker/app/(app)/skills/new/page.tsx` — add active-use toggle (Step 1)
- `packages/ui/src/` — new shared components (see below)
- `packages/api-client/src/` — new API functions

### New shared UI components (`packages/ui/src/`)
| Component | Purpose |
|-----------|---------|
| `GrindOverlay.tsx` | Fullscreen (mobile) / panel (desktop) Pomodoro view: animation + timer ring |
| `GrindAnimation.tsx` | Preset-category-driven SVG/CSS animation; accepts `category` prop |
| `PostSessionScreen.tsx` | XP chip selection + optional reflection fields + Quick Log / Log+Reflect buttons |
| `XPBarChart.tsx` | 30-day daily XP bar chart; tier-coloured bars; zero-day empty bars |
| `SkillStreakBadge.tsx` | Flame icon + streak count; used on detail page and optionally on card |
| `PersonalBests.tsx` | Three-stat personal bests card |
| `MonthlySummary.tsx` | Monthly XP + time + active days summary card |
| `GateSubmissionForm.tsx` | Evidence textarea × 3 + AI/self-report path selector + submit button |
| `GateVerdictCard.tsx` | AI feedback display + retry countdown |

### Starting-level gate note (AC-Group A addendum — D-033)

When the user selects a starting level above a gate boundary in the skill creation wizard (Step 2 level picker), an inline informational note appears beneath the picker:
> "Starting at level [N] means you'll need to submit one gate assessment (Level [G] — the tier boundary you're sitting above). Lower gates are auto-cleared. Your XP always keeps accruing."
The note names the specific gate and tier. It is non-blocking (no extra wizard step) and dynamically updates as the user scrolls through the level list.

### Modified shared UI components
- `SkillCard.tsx` — conditionally show `SkillStreakBadge` when `current_streak ≥ 2`
- `BlockerGateSection.tsx` — add "Submit for Assessment" button + inline `GateSubmissionForm` / `GateVerdictCard`
- `QuickLogSheet.tsx` — add optional "Time spent (minutes)" field

---

## 8. Out of Scope (this spec)

- Leaderboards, friends, social features (separate future spec — D-008 boundary)
- Multi-cycle Pomodoro (4×25 min classic) — deferred post-MVP (D-028)
- Subscription/billing system for app-provided AI — deferred (D-027)
- AI gate assessment without user-supplied API key
- Push notifications for streak reminders
- Nearby event / book / resource recommendations via AI
- Custom Pomodoro durations (duration picker is display-only in this release)
- OS-level focus mode / Screen Time integration

---

## 9. Binding Constraints

- D-003, D-009, D-015: All Claude API key usage follows existing encryption and server-side-only access patterns. Gate AI prompt is executed server-side only. Key never exposed to client.
- D-007: XP continues accruing past gate levels. Bonus XP from sessions follows the same rule.
- D-014: `xp_events.xp_delta = base_xp + bonus_xp` (handler computes total before inserting). `LevelForXP()` is called with the combined total. `training_sessions.bonus_xp` stores the bonus portion for display. The XP ledger sum invariant (`SUM(xp_delta) = skills.current_xp`) is preserved.
- D-020: XP chart bars use tier colour tokens from the existing system.
- D-030: `claudeCallRaw` generic helper is the required integration pattern. `CalibrateHandler` must be refactored to use it; `GateHandler` builds on it. No new `GateAssessCaller` interface.
- R-003: All `LogXP` extensions (bonus calculation, streak update, training_session_id) happen inside the existing transaction. **`LogXP` signature must be extended** to accept `trainingSessionID *uuid.UUID` (nullable). This is a repository contract change.
- R-004: `effective_level` computation remains server-side. Gate clearing does not change this.
- **OQ-4 implementation gate:** The gate handler (`POST /api/v1/blocker-gates/{id}/submit`) AI path **cannot be merged** until OQ-4 (D-026 prompt template wording) is reviewed and approved by the user. Tests for the AI path may be written but the handler implementation is blocked.

---

## 10. Open Questions

| # | Question | Owner | Status |
|---|----------|-------|--------|
| OQ-1 | Preset category slug mapping confirmed in D-023. Architect to verify `skill_categories.slug` values match the 9 slugs listed, and confirm the join path from `skills → skill_presets → skill_categories`. | Architect | Open |
| OQ-2 | Resolved by D-029: timezone stored on `users.timezone`, updated per-launch by client. | — | Resolved |
| OQ-3 | XP chart fixed at 30-day window for release 1 (max 365 via `?days=N` param already specified in section 6). | — | Resolved |
| OQ-4 | Gate AI prompt template wording (D-026) — user to review/approve. This is a **hard implementation gate** on the gate handler AI path. Until resolved, only the self-report path can be merged. | User | **Blocking gate handler AI path** |
