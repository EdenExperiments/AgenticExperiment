-- Reverse migration: remove training/streak/gate-submission additions.
ALTER TABLE public.xp_events DROP COLUMN IF EXISTS training_session_id;

DROP TABLE IF EXISTS public.gate_submissions;
DROP TABLE IF EXISTS public.training_sessions;

ALTER TABLE public.skills
    DROP COLUMN IF EXISTS requires_active_use,
    DROP COLUMN IF EXISTS current_streak,
    DROP COLUMN IF EXISTS longest_streak,
    DROP COLUMN IF EXISTS last_log_date,
    DROP COLUMN IF EXISTS animation_theme;

ALTER TABLE public.users DROP COLUMN IF EXISTS timezone;
