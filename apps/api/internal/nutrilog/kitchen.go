package nutrilog

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/meden/rpgtracker/internal/database"
)

var (
	ErrEmptyPantry    = errors.New("empty pantry")
	ErrInvalidTarget  = errors.New("invalid target hours")
	ErrRecipeNotFound = errors.New("recipe not found")
)

var allowedFastHours = map[int]struct{}{
	12: {}, 14: {}, 16: {}, 18: {}, 20: {}, 24: {}, 36: {},
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

type Fast struct {
	ID          uuid.UUID  `json:"id"`
	StartedAt   time.Time  `json:"started_at"`
	EndedAt     *time.Time `json:"ended_at,omitempty"`
	TargetHours int        `json:"target_hours"`
	EndReason   *string    `json:"end_reason,omitempty"`
	DurationMin *int       `json:"duration_min,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

type PantryItem struct {
	ID         uuid.UUID `json:"id"`
	Name       string    `json:"name"`
	AmountText string    `json:"amount_text"`
	CreatedAt  time.Time `json:"created_at"`
}

type Ingredient struct {
	Name       string `json:"name"`
	AmountText string `json:"amount_text"`
}

type Recipe struct {
	ID           uuid.UUID    `json:"id"`
	Title        string       `json:"title"`
	Servings     int          `json:"servings"`
	Ingredients  []Ingredient `json:"ingredients"`
	Steps        []string     `json:"steps"`
	CaloriesKcal *int         `json:"calories_kcal,omitempty"`
	ProteinG     *float64     `json:"protein_g,omitempty"`
	CarbsG       *float64     `json:"carbs_g,omitempty"`
	FatG         *float64     `json:"fat_g,omitempty"`
	CreatedAt    time.Time    `json:"created_at"`
	UpdatedAt    time.Time    `json:"updated_at"`
}

type DiaryEntry struct {
	ID           uuid.UUID `json:"id"`
	EatenAt      time.Time `json:"eaten_at"`
	Source       string    `json:"source"`
	RecipeID     *uuid.UUID `json:"recipe_id,omitempty"`
	Title        string    `json:"title"`
	Servings     float64   `json:"servings"`
	CaloriesKcal *int      `json:"calories_kcal,omitempty"`
	ProteinG     *float64  `json:"protein_g,omitempty"`
	CarbsG       *float64  `json:"carbs_g,omitempty"`
	FatG         *float64  `json:"fat_g,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

func OpenFast(ctx context.Context, db database.Querier, userID uuid.UUID, targetHours int) (*Fast, error) {
	if _, ok := allowedFastHours[targetHours]; !ok {
		return nil, ErrInvalidTarget
	}
	var f Fast
	err := db.QueryRow(ctx, `
		INSERT INTO public.nl_fasts (user_id, target_hours)
		VALUES ($1, $2)
		RETURNING id, started_at, ended_at, target_hours, end_reason, created_at
	`, userID, targetHours).Scan(&f.ID, &f.StartedAt, &f.EndedAt, &f.TargetHours, &f.EndReason, &f.CreatedAt)
	if isUniqueViolation(err) {
		return GetOpenFast(ctx, db, userID)
	}
	if err != nil {
		return nil, fmt.Errorf("nutrilog: open fast: %w", err)
	}
	return &f, nil
}

func GetOpenFast(ctx context.Context, db database.Querier, userID uuid.UUID) (*Fast, error) {
	var f Fast
	err := db.QueryRow(ctx, `
		SELECT id, started_at, ended_at, target_hours, end_reason, created_at
		FROM public.nl_fasts
		WHERE user_id = $1 AND ended_at IS NULL
	`, userID).Scan(&f.ID, &f.StartedAt, &f.EndedAt, &f.TargetHours, &f.EndReason, &f.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("nutrilog: get open fast: %w", err)
	}
	return &f, nil
}

func CloseFast(ctx context.Context, db database.Querier, userID, fastID uuid.UUID, reason string) (*Fast, error) {
	if reason != "completed" && reason != "stopped" {
		return nil, fmt.Errorf("nutrilog: invalid end reason")
	}
	existing, err := getFast(ctx, db, userID, fastID)
	if err != nil {
		return nil, err
	}
	if existing.EndedAt != nil {
		annotateFastDuration(existing)
		return existing, nil
	}
	var f Fast
	err = db.QueryRow(ctx, `
		UPDATE public.nl_fasts
		SET ended_at = now(), end_reason = $3
		WHERE id = $1 AND user_id = $2 AND ended_at IS NULL
		RETURNING id, started_at, ended_at, target_hours, end_reason, created_at
	`, fastID, userID, reason).Scan(&f.ID, &f.StartedAt, &f.EndedAt, &f.TargetHours, &f.EndReason, &f.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		annotateFastDuration(existing)
		return existing, nil
	}
	if err != nil {
		return nil, fmt.Errorf("nutrilog: close fast: %w", err)
	}
	annotateFastDuration(&f)
	return &f, nil
}

func ListFasts(ctx context.Context, db database.Querier, userID uuid.UUID, limit int) ([]Fast, error) {
	rows, err := db.Query(ctx, `
		SELECT id, started_at, ended_at, target_hours, end_reason, created_at
		FROM public.nl_fasts
		WHERE user_id = $1
		ORDER BY started_at DESC
		LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("nutrilog: list fasts: %w", err)
	}
	defer rows.Close()
	var out []Fast
	for rows.Next() {
		var f Fast
		if err := rows.Scan(&f.ID, &f.StartedAt, &f.EndedAt, &f.TargetHours, &f.EndReason, &f.CreatedAt); err != nil {
			return nil, err
		}
		annotateFastDuration(&f)
		out = append(out, f)
	}
	if out == nil {
		out = []Fast{}
	}
	return out, rows.Err()
}

func getFast(ctx context.Context, db database.Querier, userID, fastID uuid.UUID) (*Fast, error) {
	var f Fast
	err := db.QueryRow(ctx, `
		SELECT id, started_at, ended_at, target_hours, end_reason, created_at
		FROM public.nl_fasts
		WHERE id = $1 AND user_id = $2
	`, fastID, userID).Scan(&f.ID, &f.StartedAt, &f.EndedAt, &f.TargetHours, &f.EndReason, &f.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("nutrilog: get fast: %w", err)
	}
	return &f, nil
}

func annotateFastDuration(f *Fast) {
	if f.EndedAt == nil {
		return
	}
	mins := int(f.EndedAt.Sub(f.StartedAt).Minutes())
	if mins < 0 {
		mins = 0
	}
	f.DurationMin = &mins
}

func ListPantry(ctx context.Context, db database.Querier, userID uuid.UUID) ([]PantryItem, error) {
	rows, err := db.Query(ctx, `
		SELECT id, name, amount_text, created_at
		FROM public.nl_pantry_items
		WHERE user_id = $1
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("nutrilog: list pantry: %w", err)
	}
	defer rows.Close()
	var out []PantryItem
	for rows.Next() {
		var item PantryItem
		if err := rows.Scan(&item.ID, &item.Name, &item.AmountText, &item.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	if out == nil {
		out = []PantryItem{}
	}
	return out, rows.Err()
}

func CountPantry(ctx context.Context, db database.Querier, userID uuid.UUID) (int, error) {
	var n int
	err := db.QueryRow(ctx, `SELECT COUNT(*) FROM public.nl_pantry_items WHERE user_id = $1`, userID).Scan(&n)
	if err != nil {
		return 0, fmt.Errorf("nutrilog: count pantry: %w", err)
	}
	return n, nil
}

func AddPantryItem(ctx context.Context, db database.Querier, userID uuid.UUID, name, amountText string) (*PantryItem, error) {
	name = strings.TrimSpace(name)
	amountText = strings.TrimSpace(amountText)
	if name == "" {
		return nil, fmt.Errorf("nutrilog: pantry name required")
	}
	var item PantryItem
	err := db.QueryRow(ctx, `
		INSERT INTO public.nl_pantry_items (user_id, name, amount_text)
		VALUES ($1, $2, $3)
		RETURNING id, name, amount_text, created_at
	`, userID, name, amountText).Scan(&item.ID, &item.Name, &item.AmountText, &item.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("nutrilog: add pantry: %w", err)
	}
	return &item, nil
}

func DeletePantryItem(ctx context.Context, db database.Querier, userID, itemID uuid.UUID) error {
	tag, err := db.Exec(ctx, `DELETE FROM public.nl_pantry_items WHERE id = $1 AND user_id = $2`, itemID, userID)
	if err != nil {
		return fmt.Errorf("nutrilog: delete pantry: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func CreateRecipe(ctx context.Context, db database.Querier, userID uuid.UUID, recipe Recipe) (*Recipe, error) {
	recipe.Title = strings.TrimSpace(recipe.Title)
	if recipe.Title == "" {
		return nil, fmt.Errorf("nutrilog: recipe title required")
	}
	if recipe.Servings < 1 {
		recipe.Servings = 1
	}
	if recipe.Ingredients == nil {
		recipe.Ingredients = []Ingredient{}
	}
	if recipe.Steps == nil {
		recipe.Steps = []string{}
	}
	ingJSON, err := json.Marshal(recipe.Ingredients)
	if err != nil {
		return nil, err
	}
	stepsJSON, err := json.Marshal(recipe.Steps)
	if err != nil {
		return nil, err
	}
	var out Recipe
	var ingRaw, stepsRaw []byte
	err = db.QueryRow(ctx, `
		INSERT INTO public.nl_recipes
			(user_id, title, servings, ingredients_json, steps_json, calories_kcal, protein_g, carbs_g, fat_g)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, title, servings, ingredients_json, steps_json, calories_kcal, protein_g, carbs_g, fat_g, created_at, updated_at
	`, userID, recipe.Title, recipe.Servings, ingJSON, stepsJSON, recipe.CaloriesKcal, recipe.ProteinG, recipe.CarbsG, recipe.FatG).Scan(
		&out.ID, &out.Title, &out.Servings, &ingRaw, &stepsRaw, &out.CaloriesKcal, &out.ProteinG, &out.CarbsG, &out.FatG, &out.CreatedAt, &out.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("nutrilog: create recipe: %w", err)
	}
	_ = json.Unmarshal(ingRaw, &out.Ingredients)
	_ = json.Unmarshal(stepsRaw, &out.Steps)
	if out.Ingredients == nil {
		out.Ingredients = []Ingredient{}
	}
	if out.Steps == nil {
		out.Steps = []string{}
	}
	return &out, nil
}

func ListRecipes(ctx context.Context, db database.Querier, userID uuid.UUID) ([]Recipe, error) {
	rows, err := db.Query(ctx, `
		SELECT id, title, servings, ingredients_json, steps_json, calories_kcal, protein_g, carbs_g, fat_g, created_at, updated_at
		FROM public.nl_recipes
		WHERE user_id = $1
		ORDER BY updated_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("nutrilog: list recipes: %w", err)
	}
	defer rows.Close()
	var out []Recipe
	for rows.Next() {
		r, err := scanRecipe(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	if out == nil {
		out = []Recipe{}
	}
	return out, rows.Err()
}

func GetRecipe(ctx context.Context, db database.Querier, userID, recipeID uuid.UUID) (*Recipe, error) {
	row := db.QueryRow(ctx, `
		SELECT id, title, servings, ingredients_json, steps_json, calories_kcal, protein_g, carbs_g, fat_g, created_at, updated_at
		FROM public.nl_recipes
		WHERE id = $1 AND user_id = $2
	`, recipeID, userID)
	r, err := scanRecipe(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrRecipeNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("nutrilog: get recipe: %w", err)
	}
	return &r, nil
}

func DeleteRecipe(ctx context.Context, db database.Querier, userID, recipeID uuid.UUID) error {
	tag, err := db.Exec(ctx, `DELETE FROM public.nl_recipes WHERE id = $1 AND user_id = $2`, recipeID, userID)
	if err != nil {
		return fmt.Errorf("nutrilog: delete recipe: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrRecipeNotFound
	}
	return nil
}

func scanRecipe(row rowScanner) (Recipe, error) {
	var r Recipe
	var ingRaw, stepsRaw []byte
	err := row.Scan(&r.ID, &r.Title, &r.Servings, &ingRaw, &stepsRaw, &r.CaloriesKcal, &r.ProteinG, &r.CarbsG, &r.FatG, &r.CreatedAt, &r.UpdatedAt)
	if err != nil {
		return r, err
	}
	_ = json.Unmarshal(ingRaw, &r.Ingredients)
	_ = json.Unmarshal(stepsRaw, &r.Steps)
	if r.Ingredients == nil {
		r.Ingredients = []Ingredient{}
	}
	if r.Steps == nil {
		r.Steps = []string{}
	}
	return r, nil
}

func CookRecipe(ctx context.Context, db database.Querier, userID, recipeID uuid.UUID, servings float64) (*DiaryEntry, error) {
	n, err := CountPantry(ctx, db, userID)
	if err != nil {
		return nil, err
	}
	if n == 0 {
		return nil, ErrEmptyPantry
	}
	if servings <= 0 {
		servings = 1
	}
	recipe, err := GetRecipe(ctx, db, userID, recipeID)
	if err != nil {
		return nil, err
	}
	var cal *int
	var protein, carbs, fat *float64
	ratio := servings / float64(recipe.Servings)
	if recipe.CaloriesKcal != nil {
		v := int(float64(*recipe.CaloriesKcal) * ratio)
		cal = &v
	}
	if recipe.ProteinG != nil {
		v := *recipe.ProteinG * ratio
		protein = &v
	}
	if recipe.CarbsG != nil {
		v := *recipe.CarbsG * ratio
		carbs = &v
	}
	if recipe.FatG != nil {
		v := *recipe.FatG * ratio
		fat = &v
	}
	var entry DiaryEntry
	err = db.QueryRow(ctx, `
		INSERT INTO public.nl_diary_entries
			(user_id, source, recipe_id, title, servings, calories_kcal, protein_g, carbs_g, fat_g)
		VALUES ($1, 'pantry_cook', $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, eaten_at, source, recipe_id, title, servings, calories_kcal, protein_g, carbs_g, fat_g, created_at
	`, userID, recipe.ID, recipe.Title, servings, cal, protein, carbs, fat).Scan(
		&entry.ID, &entry.EatenAt, &entry.Source, &entry.RecipeID, &entry.Title, &entry.Servings,
		&entry.CaloriesKcal, &entry.ProteinG, &entry.CarbsG, &entry.FatG, &entry.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("nutrilog: cook: %w", err)
	}
	return &entry, nil
}

func ListDiary(ctx context.Context, db database.Querier, userID uuid.UUID, limit int) ([]DiaryEntry, error) {
	rows, err := db.Query(ctx, `
		SELECT id, eaten_at, source, recipe_id, title, servings, calories_kcal, protein_g, carbs_g, fat_g, created_at
		FROM public.nl_diary_entries
		WHERE user_id = $1
		ORDER BY eaten_at DESC
		LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("nutrilog: list diary: %w", err)
	}
	defer rows.Close()
	var out []DiaryEntry
	for rows.Next() {
		var e DiaryEntry
		if err := rows.Scan(&e.ID, &e.EatenAt, &e.Source, &e.RecipeID, &e.Title, &e.Servings, &e.CaloriesKcal, &e.ProteinG, &e.CarbsG, &e.FatG, &e.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	if out == nil {
		out = []DiaryEntry{}
	}
	return out, rows.Err()
}
