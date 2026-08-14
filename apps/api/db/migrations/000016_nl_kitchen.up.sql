-- NutriLog kitchen: one open fast, pantry, recipes, cooked-meal receipts.
-- No RLS. Go WHERE user_id = $1 is the ACL.

CREATE TABLE public.nl_fasts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at      TIMESTAMPTZ,
    target_hours  INT NOT NULL DEFAULT 16 CHECK (target_hours IN (12, 14, 16, 18, 20, 24, 36)),
    end_reason    TEXT CHECK (end_reason IS NULL OR end_reason IN ('completed', 'stopped')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE UNIQUE INDEX nl_fasts_one_open
    ON public.nl_fasts (user_id) WHERE ended_at IS NULL;

CREATE INDEX idx_nl_fasts_user_started
    ON public.nl_fasts (user_id, started_at DESC);

CREATE TABLE public.nl_pantry_items (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name         TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
    amount_text  TEXT NOT NULL DEFAULT '' CHECK (char_length(amount_text) <= 80),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nl_pantry_user
    ON public.nl_pantry_items (user_id, created_at DESC);

CREATE TABLE public.nl_recipes (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title            TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
    servings         INT NOT NULL DEFAULT 1 CHECK (servings BETWEEN 1 AND 99),
    ingredients_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    steps_json       JSONB NOT NULL DEFAULT '[]'::jsonb,
    calories_kcal    INT CHECK (calories_kcal IS NULL OR calories_kcal >= 0),
    protein_g        NUMERIC(8,2),
    carbs_g          NUMERIC(8,2),
    fat_g            NUMERIC(8,2),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nl_recipes_user
    ON public.nl_recipes (user_id, updated_at DESC);

CREATE TABLE public.nl_diary_entries (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    eaten_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    source        TEXT NOT NULL DEFAULT 'pantry_cook' CHECK (source IN ('pantry_cook', 'manual')),
    recipe_id     UUID REFERENCES public.nl_recipes(id) ON DELETE SET NULL,
    title         TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
    servings      NUMERIC(6,2) NOT NULL DEFAULT 1 CHECK (servings > 0),
    calories_kcal INT,
    protein_g     NUMERIC(8,2),
    carbs_g       NUMERIC(8,2),
    fat_g         NUMERIC(8,2),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nl_diary_user_eaten
    ON public.nl_diary_entries (user_id, eaten_at DESC);
