CREATE TABLE public.nl_foods (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    off_id        TEXT,
    name          TEXT NOT NULL CHECK (length(btrim(name)) > 0),
    calories      INT NOT NULL CHECK (calories >= 0),
    protein_g     NUMERIC(8,2) NOT NULL CHECK (protein_g >= 0),
    carbs_g       NUMERIC(8,2) NOT NULL CHECK (carbs_g >= 0),
    fat_g         NUMERIC(8,2) NOT NULL CHECK (fat_g >= 0),
    serving_label TEXT NOT NULL DEFAULT 'serving',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_nl_foods_user_off
    ON public.nl_foods (user_id, off_id)
    WHERE off_id IS NOT NULL;

CREATE INDEX idx_nl_foods_user_name
    ON public.nl_foods (user_id, name);

CREATE TABLE public.nl_diary_entries (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    eaten_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    serving_qty  NUMERIC(8,3) NOT NULL CHECK (serving_qty > 0),
    name         TEXT NOT NULL,
    calories     INT NOT NULL CHECK (calories >= 0),
    protein_g    NUMERIC(8,2) NOT NULL CHECK (protein_g >= 0),
    carbs_g      NUMERIC(8,2) NOT NULL CHECK (carbs_g >= 0),
    fat_g        NUMERIC(8,2) NOT NULL CHECK (fat_g >= 0),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nl_diary_user_eaten
    ON public.nl_diary_entries (user_id, eaten_at DESC);
