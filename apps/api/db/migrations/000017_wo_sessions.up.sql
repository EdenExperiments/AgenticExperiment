-- Workout: one in-progress session per user, sets owned through the session.
-- No RLS. Do not reuse training_sessions or xp_events.

CREATE TABLE public.wo_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL DEFAULT 'Workout' CHECK (char_length(title) BETWEEN 1 AND 80),
    started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at    TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE UNIQUE INDEX wo_sessions_one_open
    ON public.wo_sessions (user_id) WHERE ended_at IS NULL;

CREATE INDEX idx_wo_sessions_user_started
    ON public.wo_sessions (user_id, started_at DESC);

CREATE TABLE public.wo_sets (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id     UUID NOT NULL REFERENCES public.wo_sessions(id) ON DELETE CASCADE,
    user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    exercise_name  TEXT NOT NULL CHECK (char_length(exercise_name) BETWEEN 1 AND 80),
    reps           INT NOT NULL CHECK (reps BETWEEN 1 AND 500),
    load_kg        NUMERIC(6,2) CHECK (load_kg IS NULL OR load_kg >= 0),
    rpe            NUMERIC(3,1) CHECK (rpe IS NULL OR (rpe >= 1 AND rpe <= 10)),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wo_sets_session
    ON public.wo_sets (session_id, created_at);
