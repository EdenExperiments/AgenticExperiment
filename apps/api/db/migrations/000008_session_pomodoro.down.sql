ALTER TABLE public.training_sessions
    DROP COLUMN IF EXISTS pomodoro_work_sec,
    DROP COLUMN IF EXISTS pomodoro_break_sec,
    DROP COLUMN IF EXISTS pomodoro_intervals_completed,
    DROP COLUMN IF EXISTS pomodoro_intervals_planned;
