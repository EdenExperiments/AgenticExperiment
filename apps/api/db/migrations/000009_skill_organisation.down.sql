-- 000009_skill_organisation.down.sql

DROP INDEX IF EXISTS idx_skills_is_favourite;
DROP INDEX IF EXISTS idx_skills_category_id;
DROP INDEX IF EXISTS idx_tags_user_id;
DROP INDEX IF EXISTS idx_skill_tags_tag_id;
DROP INDEX IF EXISTS idx_skill_tags_skill_id;

DROP POLICY IF EXISTS skill_tags_self_rw ON public.skill_tags;
DROP TABLE IF EXISTS public.skill_tags;

DROP POLICY IF EXISTS tags_self_rw ON public.tags;
DROP TABLE IF EXISTS public.tags;

ALTER TABLE public.skills DROP COLUMN IF EXISTS is_favourite;
ALTER TABLE public.skills DROP COLUMN IF EXISTS category_id;
