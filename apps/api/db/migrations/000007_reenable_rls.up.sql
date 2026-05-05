-- Re-enable RLS on application tables.
ALTER TABLE public.users                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ai_keys                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_events                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocker_gates                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_category_interests       ENABLE ROW LEVEL SECURITY;

-- Create a helper function to read the current request's user id from a GUC.
-- We use SET LOCAL app.user_id = '<uuid>' in the API per request after JWT verify.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'app_current_user_id'
  ) THEN
    CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS uuid
    LANGUAGE plpgsql STABLE AS $fn$
    DECLARE
      uid text;
    BEGIN
      uid := current_setting('app.user_id', true);
      IF uid IS NULL OR uid = '' THEN
        RETURN NULL;
      END IF;
      RETURN uid::uuid;
    END;
    $fn$;
  END IF;
END$$;

-- Policies: per-table owner checks using app_current_user_id()
-- Users: a user can see and update only their own row.
DROP POLICY IF EXISTS users_owner_all ON public.users;
CREATE POLICY users_owner_all ON public.users
  FOR ALL
  USING (id = app_current_user_id())
  WITH CHECK (id = app_current_user_id());

-- User AI keys
DROP POLICY IF EXISTS user_ai_keys_owner_all ON public.user_ai_keys;
CREATE POLICY user_ai_keys_owner_all ON public.user_ai_keys
  FOR ALL
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

-- Skills
DROP POLICY IF EXISTS skills_owner_all ON public.skills;
CREATE POLICY skills_owner_all ON public.skills
  FOR ALL
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());

-- XP events (read-only; inserts happen via API which enforces ownership)
DROP POLICY IF EXISTS xp_events_owner_select ON public.xp_events;
CREATE POLICY xp_events_owner_select ON public.xp_events
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.skills s
    WHERE s.id = public.xp_events.skill_id
      AND s.user_id = app_current_user_id()
  ));

-- Blocker gates (read-only)
DROP POLICY IF EXISTS blocker_gates_owner_select ON public.blocker_gates;
CREATE POLICY blocker_gates_owner_select ON public.blocker_gates
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.skills s
    WHERE s.id = public.blocker_gates.skill_id
      AND s.user_id = app_current_user_id()
  ));

-- user_category_interests
DROP POLICY IF EXISTS uci_owner_all ON public.user_category_interests;
CREATE POLICY uci_owner_all ON public.user_category_interests
  FOR ALL
  USING (user_id = app_current_user_id())
  WITH CHECK (user_id = app_current_user_id());
