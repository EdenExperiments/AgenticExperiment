DROP TRIGGER IF EXISTS goal_milestones_updated_at ON public.goal_milestones;
DROP TRIGGER IF EXISTS goals_updated_at ON public.goals;
-- Note: set_updated_at() function is shared; do not drop it here.

DROP TABLE IF EXISTS public.goal_checkins;
DROP TABLE IF EXISTS public.goal_milestones;
DROP TABLE IF EXISTS public.goals;
DROP TYPE  IF EXISTS public.goal_status;
