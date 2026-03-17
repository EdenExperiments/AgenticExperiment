DROP TABLE IF EXISTS public.blocker_gates;
DROP TABLE IF EXISTS public.xp_events;

ALTER TABLE public.skills
    DROP COLUMN IF EXISTS deleted_at,
    DROP COLUMN IF EXISTS current_level,
    DROP COLUMN IF EXISTS current_xp,
    DROP COLUMN IF EXISTS starting_level;
