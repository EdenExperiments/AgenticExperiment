-- MindTrack: mood check-ins and private journal. No XP. No RLS.

CREATE TABLE public.mh_mood_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    logged_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    valence     INT NOT NULL CHECK (valence BETWEEN 1 AND 5),
    energy      INT NOT NULL CHECK (energy BETWEEN 1 AND 3),
    note        TEXT NOT NULL DEFAULT '' CHECK (char_length(note) <= 280),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mh_mood_user_logged
    ON public.mh_mood_logs (user_id, logged_at DESC);

CREATE TABLE public.mh_journal_entries (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    body        TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 8000),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mh_journal_user_updated
    ON public.mh_journal_entries (user_id, updated_at DESC);
