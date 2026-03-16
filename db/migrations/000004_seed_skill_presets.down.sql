-- Deletes all preset rows. This is intentionally destructive — it is the correct
-- rollback for a seed migration. If user-submitted presets are introduced in a
-- future iteration, this down migration must be narrowed to only the seeded slugs.
DELETE FROM public.skill_presets;
DELETE FROM public.skill_categories;
