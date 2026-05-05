-- Wave 2 T8: Goals domain — goals, goal_milestones, goal_checkins.
--
-- Design choices:
--   • goals anchor to public.users(id) via user_id (same pattern as skills).
--   • skill_id is an OPTIONAL FK so goals can exist independently of skills;
--     cross-domain link added only when schema provides a clean anchor (it does).
--   • status is an enum column: active | completed | abandoned.
--   • measurable progress: current_value / target_value with an optional unit.
--   • target_date is nullable (open-ended goals are valid).
--   • updated_at maintained by trigger (same as existing tables).
--   • RLS enabled as defence-in-depth; primary enforcement is WHERE user_id = $1 in Go.

-- ─── Status enum ─────────────────────────────────────────────────────────────
CREATE TYPE public.goal_status AS ENUM ('active', 'completed', 'abandoned');

-- ─── goals ───────────────────────────────────────────────────────────────────
CREATE TABLE public.goals (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    skill_id        UUID        REFERENCES public.skills(id) ON DELETE SET NULL,
    -- skill_id is optional; link a goal to a skill when relevant.
    -- ON DELETE SET NULL: deleting the skill does not remove the goal.
    title           TEXT        NOT NULL,
    description     TEXT        NOT NULL DEFAULT '',
    status          public.goal_status NOT NULL DEFAULT 'active',
    target_date     DATE,
    -- Measurable progress fields (optional; both must be set together or not at all).
    current_value   NUMERIC,
    target_value    NUMERIC,
    unit            TEXT        NOT NULL DEFAULT '',
    -- sort order managed client-side via position; default 0 = unsorted.
    position        INT         NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT goals_measurable_pair CHECK (
        (current_value IS NULL) = (target_value IS NULL)
    )
);

CREATE INDEX idx_goals_user_id       ON public.goals (user_id, status);
CREATE INDEX idx_goals_skill_id      ON public.goals (skill_id) WHERE skill_id IS NOT NULL;

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY goals_owner ON public.goals
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

-- ─── goal_milestones ─────────────────────────────────────────────────────────
CREATE TABLE public.goal_milestones (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id     UUID        NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    -- user_id is denormalised here to simplify ownership checks without a JOIN.
    title       TEXT        NOT NULL,
    description TEXT        NOT NULL DEFAULT '',
    is_done     BOOL        NOT NULL DEFAULT FALSE,
    done_at     TIMESTAMPTZ,
    position    INT         NOT NULL DEFAULT 0,
    -- position drives display order; client controls sort.
    due_date    DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_goal_milestones_goal_id ON public.goal_milestones (goal_id, position);
CREATE INDEX idx_goal_milestones_user_id ON public.goal_milestones (user_id);

ALTER TABLE public.goal_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY goal_milestones_owner ON public.goal_milestones
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

-- ─── goal_checkins ───────────────────────────────────────────────────────────
-- Append-only progress notes. Users add check-ins to record progress narratively
-- or to update current_value on the parent goal.
CREATE TABLE public.goal_checkins (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id         UUID        NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    user_id         UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    note            TEXT        NOT NULL DEFAULT '',
    -- Optional progress snapshot: if provided, the handler updates goals.current_value.
    value_snapshot  NUMERIC,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    -- No updated_at: check-ins are immutable after creation (append-only).
);

CREATE INDEX idx_goal_checkins_goal_id ON public.goal_checkins (goal_id, created_at DESC);
CREATE INDEX idx_goal_checkins_user_id ON public.goal_checkins (user_id);

ALTER TABLE public.goal_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY goal_checkins_owner ON public.goal_checkins
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

-- ─── updated_at trigger (reuse pattern from existing tables) ─────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER goals_updated_at
    BEFORE UPDATE ON public.goals
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER goal_milestones_updated_at
    BEFORE UPDATE ON public.goal_milestones
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
