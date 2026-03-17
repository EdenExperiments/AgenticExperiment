-- Extend skills with progression columns and soft-delete.
ALTER TABLE public.skills
    ADD COLUMN starting_level INT NOT NULL DEFAULT 1,
    ADD COLUMN current_xp     INT NOT NULL DEFAULT 0,
    ADD COLUMN current_level  INT NOT NULL DEFAULT 1,
    ADD COLUMN deleted_at     TIMESTAMPTZ;

CREATE INDEX skills_user_active ON public.skills (user_id) WHERE deleted_at IS NULL;

-- xp_events: immutable ledger of every XP log entry.
-- Soft-deleting a skill does NOT cascade-delete its events (preserve history).
CREATE TABLE public.xp_events (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id   UUID        NOT NULL REFERENCES public.skills(id),
    user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    xp_delta   INT         NOT NULL CHECK (xp_delta > 0),
    log_note   TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX xp_events_skill ON public.xp_events (skill_id, created_at DESC);

ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY xp_events_self_rw ON public.xp_events
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

-- blocker_gates: one row per tier boundary per skill (10 gates per skill, levels 9,19,...99).
-- Created automatically when a skill is created; descriptions are set to defaults or AI-generated.
CREATE TABLE public.blocker_gates (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id          UUID        NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    gate_level        INT         NOT NULL,
    title             TEXT        NOT NULL DEFAULT '',
    description       TEXT        NOT NULL DEFAULT '',
    first_notified_at TIMESTAMPTZ,
    is_cleared        BOOL        NOT NULL DEFAULT FALSE,
    cleared_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (skill_id, gate_level)
);

CREATE INDEX blocker_gates_skill ON public.blocker_gates (skill_id, gate_level);

ALTER TABLE public.blocker_gates ENABLE ROW LEVEL SECURITY;
-- Gates belong to skills which belong to users; access via skill ownership enforced in Go.
