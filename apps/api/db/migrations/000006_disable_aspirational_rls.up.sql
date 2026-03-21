-- RLS was enabled aspirationally during schema design but is not the active
-- access-control mechanism for release 1. The Go layer enforces user isolation
-- via WHERE user_id = $userID in every query. Disabling RLS here restores
-- normal table access for the rpgtracker application role.
-- See architecture.md section 4.2 for the intended future RLS design.

ALTER TABLE public.users                DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ai_keys         DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills               DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_events            DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocker_gates        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_category_interests DISABLE ROW LEVEL SECURITY;
