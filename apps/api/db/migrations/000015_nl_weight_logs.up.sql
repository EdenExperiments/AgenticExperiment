-- NutriLog: weight measurement logs (Lane E task-01).
-- Anchors to public.users(id); isolated from LifeQuest tables.

CREATE TABLE public.nl_weight_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    weight_kg   NUMERIC(6,2) NOT NULL CHECK (weight_kg > 0),
    note        TEXT NOT NULL DEFAULT '',
    measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nl_weight_logs_user_measured
    ON public.nl_weight_logs (user_id, measured_at DESC);

ALTER TABLE public.nl_weight_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY nl_weight_logs_owner ON public.nl_weight_logs
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);
