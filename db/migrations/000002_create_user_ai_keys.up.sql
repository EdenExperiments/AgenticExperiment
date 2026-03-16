CREATE TABLE public.user_ai_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    encrypted_dek   BYTEA NOT NULL,
    encrypted_key   BYTEA NOT NULL,
    key_hint        TEXT,
    validated_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_ai_keys_user UNIQUE (user_id)
);

-- RLS: aspirational scaffolding — see architecture.md section 4.2.
-- Primary access control in release 1 is WHERE user_id = $userID in the Go layer.
ALTER TABLE public.user_ai_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_ai_keys_self_rw ON public.user_ai_keys
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);
