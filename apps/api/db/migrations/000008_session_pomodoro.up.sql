ALTER TABLE public.training_sessions
    ADD COLUMN IF NOT EXISTS pomodoro_work_sec INT NOT NULL DEFAULT 1500,
    ADD COLUMN IF NOT EXISTS pomodoro_break_sec INT NOT NULL DEFAULT 300,
    ADD COLUMN IF NOT EXISTS pomodoro_intervals_completed INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS pomodoro_intervals_planned INT NOT NULL DEFAULT 0;
