ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS primary_skill_id UUID REFERENCES public.skills(id) ON DELETE SET NULL;
