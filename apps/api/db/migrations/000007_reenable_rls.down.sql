-- Disable RLS again (rollback).
ALTER TABLE public.users                         DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ai_keys                  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills                        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_events                     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocker_gates                 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_category_interests       DISABLE ROW LEVEL SECURITY;
