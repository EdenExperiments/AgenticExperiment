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

type dbFoods struct{}

func (s *dbFoods) UpsertCachedFood(ctx context.Context, userID uuid.UUID, f Food) (*Food, error) {
	if f.OffID == nil || *f.OffID == "" {
		return s.CreateCustomFood(ctx, userID, f)
	}
	out := f
	err := database.MustQuerier(ctx).QueryRow(ctx, `
		INSERT INTO public.nl_foods (user_id, off_id, name, calories, protein_g, carbs_g, fat_g, serving_label)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (user_id, off_id) WHERE off_id IS NOT NULL
		DO UPDATE SET name = EXCLUDED.name, calories = EXCLUDED.calories,
			protein_g = EXCLUDED.protein_g, carbs_g = EXCLUDED.carbs_g, fat_g = EXCLUDED.fat_g,
			serving_label = EXCLUDED.serving_label
		RETURNING id, off_id, name, calories, protein_g, carbs_g, fat_g, serving_label
	`, userID, *f.OffID, f.Name, f.Calories, f.ProteinG, f.CarbsG, f.FatG, defaultServing(f.ServingLabel)).Scan(
		&out.ID, &out.OffID, &out.Name, &out.Calories, &out.ProteinG, &out.CarbsG, &out.FatG, &out.ServingLabel,
	)
	if err != nil {
		return nil, fmt.Errorf("nutrilog: upsert food: %w", err)
	}
	return &out, nil
}

func (s *dbFoods) CreateCustomFood(ctx context.Context, userID uuid.UUID, f Food) (*Food, error) {
	out := f
	err := database.MustQuerier(ctx).QueryRow(ctx, `
		INSERT INTO public.nl_foods (user_id, off_id, name, calories, protein_g, carbs_g, fat_g, serving_label)
		VALUES ($1, NULL, $2, $3, $4, $5, $6, $7)
		RETURNING id, off_id, name, calories, protein_g, carbs_g, fat_g, serving_label
	`, userID, f.Name, f.Calories, f.ProteinG, f.CarbsG, f.FatG, defaultServing(f.ServingLabel)).Scan(
		&out.ID, &out.OffID, &out.Name, &out.Calories, &out.ProteinG, &out.CarbsG, &out.FatG, &out.ServingLabel,
	)
	if err != nil {
		return nil, fmt.Errorf("nutrilog: custom food: %w", err)
	}
	return &out, nil
}

func (s *dbFoods) SearchCachedFoods(ctx context.Context, userID uuid.UUID, query string) ([]Food, error) {
	rows, err := database.MustQuerier(ctx).Query(ctx, `
		SELECT id, off_id, name, calories, protein_g, carbs_g, fat_g, serving_label
		FROM public.nl_foods
		WHERE user_id = $1 AND name ILIKE '%' || $2 || '%'
		ORDER BY name ASC
		LIMIT 20
	`, userID, query)
	if err != nil {
		return nil, fmt.Errorf("nutrilog: search foods: %w", err)
	}
	defer rows.Close()
	out := []Food{}
	for rows.Next() {
		var f Food
		if err := rows.Scan(&f.ID, &f.OffID, &f.Name, &f.Calories, &f.ProteinG, &f.CarbsG, &f.FatG, &f.ServingLabel); err != nil {
			return nil, err
		}
		out = append(out, f)
	}
	return out, rows.Err()
}

type dbDiary struct{}

func (s *dbDiary) CreateEntry(ctx context.Context, userID uuid.UUID, e DiaryEntry) (*DiaryEntry, error) {
	out := e
	err := database.MustQuerier(ctx).QueryRow(ctx, `
		INSERT INTO public.nl_diary_entries (user_id, eaten_at, serving_qty, name, calories, protein_g, carbs_g, fat_g)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, eaten_at, serving_qty, name, calories, protein_g, carbs_g, fat_g
	`, userID, e.EatenAt, e.ServingQty, e.Name, e.Calories, e.ProteinG, e.CarbsG, e.FatG).Scan(
		&out.ID, &out.EatenAt, &out.ServingQty, &out.Name, &out.Calories, &out.ProteinG, &out.CarbsG, &out.FatG,
	)
	if err != nil {
		return nil, fmt.Errorf("nutrilog: diary insert: %w", err)
	}
	return &out, nil
}

func (s *dbDiary) ListEntriesOnDay(ctx context.Context, userID uuid.UUID, day time.Time) ([]DiaryEntry, error) {
	start := time.Date(day.UTC().Year(), day.UTC().Month(), day.UTC().Day(), 0, 0, 0, 0, time.UTC)
	end := start.Add(24 * time.Hour)
	rows, err := database.MustQuerier(ctx).Query(ctx, `
		SELECT id, eaten_at, serving_qty, name, calories, protein_g, carbs_g, fat_g
		FROM public.nl_diary_entries
		WHERE user_id = $1 AND eaten_at >= $2 AND eaten_at < $3
		ORDER BY eaten_at DESC
	`, userID, start, end)
	if err != nil {
		return nil, fmt.Errorf("nutrilog: list diary: %w", err)
	}
	defer rows.Close()
	out := []DiaryEntry{}
	for rows.Next() {
		var e DiaryEntry
		if err := rows.Scan(&e.ID, &e.EatenAt, &e.ServingQty, &e.Name, &e.Calories, &e.ProteinG, &e.CarbsG, &e.FatG); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func (s *dbDiary) DeleteEntry(ctx context.Context, userID, id uuid.UUID) error {
	tag, err := database.MustQuerier(ctx).Exec(ctx, `
		DELETE FROM public.nl_diary_entries WHERE id = $1 AND user_id = $2
	`, id, userID)
	if err != nil {
		return fmt.Errorf("nutrilog: delete diary: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func defaultServing(s string) string {
	if s == "" {
		return "serving"
	}
	return s
}
