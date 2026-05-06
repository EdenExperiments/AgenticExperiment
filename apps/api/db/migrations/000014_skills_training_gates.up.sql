-- Step 1: Add timezone to users (D-029).
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';

-- Step 2: Extend skills with training/streak tracking columns.
ALTER TABLE public.skills
    ADD COLUMN IF NOT EXISTS requires_active_use BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS current_streak      INT     NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS longest_streak      INT     NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_log_date       DATE,
    ADD COLUMN IF NOT EXISTS animation_theme     TEXT    NOT NULL DEFAULT 'general';

-- Step 3: Create training_sessions table.
CREATE TABLE IF NOT EXISTS public.training_sessions (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id          UUID        NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    user_id           UUID        NOT NULL REFERENCES public.users(id)  ON DELETE CASCADE,
    session_type      TEXT        NOT NULL,
    planned_duration_sec INT      NOT NULL DEFAULT 0,
    actual_duration_sec  INT      NOT NULL DEFAULT 0,
    status            TEXT        NOT NULL CHECK (status IN ('completed', 'partial', 'abandoned')),
    completion_ratio  NUMERIC(5,4) NOT NULL DEFAULT 0 CHECK (completion_ratio >= 0 AND completion_ratio <= 1),
    bonus_percentage  INT         NOT NULL DEFAULT 0 CHECK (bonus_percentage IN (0, 10, 25)),
    bonus_xp          INT         NOT NULL DEFAULT 0,
    pomodoro_work_sec             INT NOT NULL DEFAULT 1500,
    pomodoro_break_sec            INT NOT NULL DEFAULT 300,
    pomodoro_intervals_completed  INT NOT NULL DEFAULT 0,
    pomodoro_intervals_planned    INT NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS training_sessions_skill ON public.training_sessions (skill_id, created_at DESC);
CREATE INDEX IF NOT EXISTS training_sessions_user  ON public.training_sessions (user_id, created_at DESC);

-- Step 4: Add training_session_id to xp_events.
ALTER TABLE public.xp_events
    ADD COLUMN IF NOT EXISTS training_session_id UUID REFERENCES public.training_sessions(id) ON DELETE SET NULL;

-- Step 5: Create gate_submissions table.
CREATE TABLE IF NOT EXISTS public.gate_submissions (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_id          UUID        NOT NULL REFERENCES public.blocker_gates(id) ON DELETE CASCADE,
    user_id          UUID        NOT NULL REFERENCES public.users(id)          ON DELETE CASCADE,
    path             TEXT        NOT NULL CHECK (path IN ('ai', 'self_report')),
    evidence_what    TEXT        NOT NULL,
    evidence_how     TEXT        NOT NULL,
    evidence_feeling TEXT        NOT NULL,
    verdict          TEXT        NOT NULL CHECK (verdict IN ('approved', 'rejected', 'self_reported')),
    attempt_number   INT         NOT NULL,
    ai_feedback      TEXT,
    next_retry_at    DATE        CHECK (next_retry_at IS NULL OR next_retry_at > CURRENT_DATE),
    submitted_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gate_submissions_gate ON public.gate_submissions (gate_id, submitted_at DESC);

-- Step 6: Disable RLS on new tables (aspirational RLS disabled per project convention).
ALTER TABLE public.training_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_submissions   DISABLE ROW LEVEL SECURITY;
