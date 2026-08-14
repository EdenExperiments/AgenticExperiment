CREATE TABLE public.wo_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at    TIMESTAMPTZ,
    status      TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wo_sessions_user_started
    ON public.wo_sessions (user_id, started_at DESC);

CREATE TABLE public.wo_exercises (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID NOT NULL REFERENCES public.wo_sessions(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL CHECK (length(btrim(name)) > 0),
    position    INT NOT NULL CHECK (position >= 0)
);

CREATE UNIQUE INDEX idx_wo_exercises_session_position
    ON public.wo_exercises (session_id, position);

CREATE TABLE public.wo_sets (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id  UUID NOT NULL REFERENCES public.wo_exercises(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reps         INT NOT NULL CHECK (reps > 0),
    load_kg      NUMERIC(6,2) CHECK (load_kg IS NULL OR load_kg > 0),
    rpe          INT CHECK (rpe IS NULL OR (rpe >= 1 AND rpe <= 10)),
    position     INT NOT NULL CHECK (position >= 0)
);

CREATE UNIQUE INDEX idx_wo_sets_exercise_position
    ON public.wo_sets (exercise_id, position);
