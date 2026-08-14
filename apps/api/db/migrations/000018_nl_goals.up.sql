CREATE TABLE public.nl_goals (
    user_id           UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    calorie_goal      INT NOT NULL CHECK (calorie_goal > 0),
    protein_g         INT CHECK (protein_g IS NULL OR protein_g >= 0),
    carbs_g           INT CHECK (carbs_g IS NULL OR carbs_g >= 0),
    fat_g             INT CHECK (fat_g IS NULL OR fat_g >= 0),
    target_weight_kg  NUMERIC(6,2) CHECK (target_weight_kg IS NULL OR target_weight_kg > 0),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
