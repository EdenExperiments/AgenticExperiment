-- skills references skill_presets, so drop it first.
-- This is safe because skills is first defined in this migration (000003).
DROP TABLE IF EXISTS public.skills;
DROP TABLE IF EXISTS public.user_category_interests;
DROP TABLE IF EXISTS public.skill_presets;
DROP TABLE IF EXISTS public.skill_categories;
