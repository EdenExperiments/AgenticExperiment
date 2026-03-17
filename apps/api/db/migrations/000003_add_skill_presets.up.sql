-- skill_categories: global read-only lookup table; no user-scoped RLS needed.
-- This is the first migration to define this table (it does not exist before 000003).
CREATE TABLE public.skill_categories (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    slug       TEXT NOT NULL UNIQUE,
    emoji      TEXT NOT NULL,
    sort_order INT  NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- skill_presets: global read-only lookup table; no user-scoped RLS needed.
CREATE TABLE public.skill_presets (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id  UUID NOT NULL REFERENCES public.skill_categories(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    default_unit TEXT NOT NULL DEFAULT 'session',
    sort_order   INT  NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- user_category_interests: scaffolded for future onboarding personalisation.
CREATE TABLE public.user_category_interests (
    user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.skill_categories(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, category_id)
);

-- RLS: aspirational scaffolding — see architecture.md section 4.2.
-- Primary access control in release 1 is WHERE user_id = $userID in the Go layer.
-- These policies are defined now to prepare the schema; they are not the active
-- access control mechanism until the app.current_user_id session variable is set.
ALTER TABLE public.user_category_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_category_interests_self_rw ON public.user_category_interests
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

-- skills: the core user skill records.
-- NOTE: This migration introduces the skills table for the first time (migrations
-- 000001 and 000002 only define users and user_ai_keys). preset_id is nullable:
-- null = created from scratch, non-null = spawned from a preset.
CREATE TABLE public.skills (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    unit        TEXT NOT NULL DEFAULT 'session',
    preset_id   UUID REFERENCES public.skill_presets(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: aspirational scaffolding — see architecture.md section 4.2.
-- Primary access control in release 1 is WHERE user_id = $userID in the Go layer.
-- These policies are defined now to prepare the schema; they are not the active
-- access control mechanism until the app.current_user_id session variable is set.
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY skills_self_rw ON public.skills
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);
