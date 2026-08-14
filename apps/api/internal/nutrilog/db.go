package nutrilog

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/meden/rpgtracker/internal/database"
)

type dbWeights struct{}

func (s *dbWeights) CreateWeightLog(ctx context.Context, userID uuid.UUID, weightKg float64, note string, measuredAt time.Time) (*WeightLog, error) {
	return CreateWeightLog(ctx, database.MustQuerier(ctx), userID, weightKg, note, measuredAt)
}

func (s *dbWeights) ListWeightLogs(ctx context.Context, userID uuid.UUID, limit int) ([]WeightLog, error) {
	return ListWeightLogs(ctx, database.MustQuerier(ctx), userID, limit)
}

func (s *dbWeights) GetWeightLogsInRange(ctx context.Context, userID uuid.UUID, days int) ([]WeightLog, error) {
	return GetWeightLogsInRange(ctx, database.MustQuerier(ctx), userID, days)
}

func (s *dbWeights) DeleteWeightLog(ctx context.Context, userID, logID uuid.UUID) error {
	return DeleteWeightLog(ctx, database.MustQuerier(ctx), userID, logID)
}

type dbGoals struct{}

func (s *dbGoals) UpsertGoals(ctx context.Context, userID uuid.UUID, g Goals) (*Goals, error) {
	out := &Goals{UserID: userID}
	err := database.MustQuerier(ctx).QueryRow(ctx, `
		INSERT INTO public.nl_goals (user_id, calorie_goal, protein_g, carbs_g, fat_g, target_weight_kg, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, now())
		ON CONFLICT (user_id) DO UPDATE SET
			calorie_goal = EXCLUDED.calorie_goal,
			protein_g = EXCLUDED.protein_g,
			carbs_g = EXCLUDED.carbs_g,
			fat_g = EXCLUDED.fat_g,
			target_weight_kg = EXCLUDED.target_weight_kg,
			updated_at = now()
		RETURNING user_id, calorie_goal, protein_g, carbs_g, fat_g, target_weight_kg, updated_at
	`, userID, g.CalorieGoal, g.ProteinG, g.CarbsG, g.FatG, g.TargetWeightKg).Scan(
		&out.UserID, &out.CalorieGoal, &out.ProteinG, &out.CarbsG, &out.FatG, &out.TargetWeightKg, &out.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("nutrilog: upsert goals: %w", err)
	}
	return out, nil
}

func (s *dbGoals) GetGoals(ctx context.Context, userID uuid.UUID) (*Goals, error) {
	out := &Goals{}
	var protein, carbs, fat sql.NullInt32
	var tw sql.NullFloat64
	err := database.MustQuerier(ctx).QueryRow(ctx, `
		SELECT user_id, calorie_goal, protein_g, carbs_g, fat_g, target_weight_kg, updated_at
		FROM public.nl_goals
		WHERE user_id = $1
	`, userID).Scan(&out.UserID, &out.CalorieGoal, &protein, &carbs, &fat, &tw, &out.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("nutrilog: get goals: %w", err)
	}
	if protein.Valid {
		v := int(protein.Int32)
		out.ProteinG = &v
	}
	if carbs.Valid {
		v := int(carbs.Int32)
		out.CarbsG = &v
	}
	if fat.Valid {
		v := int(fat.Int32)
		out.FatG = &v
	}
	if tw.Valid {
		v := tw.Float64
		out.TargetWeightKg = &v
	}
	return out, nil
}
