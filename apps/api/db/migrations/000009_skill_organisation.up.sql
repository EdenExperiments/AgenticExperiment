-- 000009_skill_organisation.up.sql
-- Add category_id, is_favourite, tags, and skill_tags for Phase 3.

-- Direct category FK on skills (nullable — custom skills may not have a category)
ALTER TABLE public.skills
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.skill_categories(id) ON DELETE SET NULL;

-- Favourite flag
ALTER TABLE public.skills
  ADD COLUMN IF NOT EXISTS is_favourite BOOLEAN NOT NULL DEFAULT false;

-- User-scoped tags
CREATE TABLE IF NOT EXISTS public.tags (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, name)
);

-- Join table: skill ↔ tag (many-to-many)
CREATE TABLE IF NOT EXISTS public.skill_tags (
    skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    tag_id   UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (skill_id, tag_id)
);

-- RLS on tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY tags_self_rw ON public.tags
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

-- RLS on skill_tags (access via owning skill's user_id)
ALTER TABLE public.skill_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY skill_tags_self_rw ON public.skill_tags
    USING (EXISTS (
        SELECT 1 FROM public.skills
        WHERE skills.id = skill_tags.skill_id
          AND skills.user_id = current_setting('app.current_user_id', TRUE)::UUID
    ));

-- Backfill: set category_id for existing preset-based skills
UPDATE public.skills s
SET category_id = sp.category_id
FROM public.skill_presets sp
WHERE s.preset_id = sp.id
  AND s.category_id IS NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_skill_tags_skill_id ON public.skill_tags(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_tags_tag_id ON public.skill_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);
CREATE INDEX IF NOT EXISTS idx_skills_category_id ON public.skills(category_id);
CREATE INDEX IF NOT EXISTS idx_skills_is_favourite ON public.skills(user_id, is_favourite) WHERE is_favourite = true;
