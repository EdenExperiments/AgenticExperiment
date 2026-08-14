ALTER TABLE public.nl_weight_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS nl_weight_logs_owner ON public.nl_weight_logs;
CREATE POLICY nl_weight_logs_owner ON public.nl_weight_logs
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);
