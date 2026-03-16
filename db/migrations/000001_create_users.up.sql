CREATE TABLE public.users (
    id            UUID PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    display_name  TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: aspirational scaffolding — see architecture.md section 4.2.
-- Primary access control in release 1 is WHERE user_id = $userID in the Go layer.
-- These policies are defined now to prepare the schema; they are not the active
-- access control mechanism until the app.current_user_id session variable is set.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_self_rw ON public.users
    USING (id = current_setting('app.current_user_id', TRUE)::UUID);
