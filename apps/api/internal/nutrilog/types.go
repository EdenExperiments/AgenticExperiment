package nutrilog

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type WeightStore interface {
	CreateWeightLog(ctx context.Context, userID uuid.UUID, weightKg float64, note string, measuredAt time.Time) (*WeightLog, error)
	ListWeightLogs(ctx context.Context, userID uuid.UUID, limit int) ([]WeightLog, error)
	GetWeightLogsInRange(ctx context.Context, userID uuid.UUID, days int) ([]WeightLog, error)
	DeleteWeightLog(ctx context.Context, userID, logID uuid.UUID) error
}

type GoalStore interface {
	UpsertGoals(ctx context.Context, userID uuid.UUID, g Goals) (*Goals, error)
	GetGoals(ctx context.Context, userID uuid.UUID) (*Goals, error)
}

type FoodStore interface {
	UpsertCachedFood(ctx context.Context, userID uuid.UUID, f Food) (*Food, error)
	SearchCachedFoods(ctx context.Context, userID uuid.UUID, query string) ([]Food, error)
	CreateCustomFood(ctx context.Context, userID uuid.UUID, f Food) (*Food, error)
}

type DiaryStore interface {
	CreateEntry(ctx context.Context, userID uuid.UUID, e DiaryEntry) (*DiaryEntry, error)
	ListEntriesOnDay(ctx context.Context, userID uuid.UUID, day time.Time) ([]DiaryEntry, error)
	DeleteEntry(ctx context.Context, userID, id uuid.UUID) error
}

type FoodSearch interface {
	Search(ctx context.Context, query string) ([]Food, error)
}

type Food struct {
	ID           uuid.UUID `json:"id"`
	OffID        *string   `json:"off_id"`
	Name         string    `json:"name"`
	Calories     int       `json:"calories"`
	ProteinG     float64   `json:"protein_g"`
	CarbsG       float64   `json:"carbs_g"`
	FatG         float64   `json:"fat_g"`
	ServingLabel string    `json:"serving_label"`
}

type DiaryEntry struct {
	ID         uuid.UUID `json:"id"`
	EatenAt    time.Time `json:"eaten_at"`
	ServingQty float64   `json:"serving_qty"`
	Name       string    `json:"name"`
	Calories   int       `json:"calories"`
	ProteinG   float64   `json:"protein_g"`
	CarbsG     float64   `json:"carbs_g"`
	FatG       float64   `json:"fat_g"`
}

type Remaining struct {
	Date              string  `json:"date"`
	CalorieGoal       int     `json:"calorie_goal"`
	CaloriesEaten     int     `json:"calories_eaten"`
	CaloriesRemaining int     `json:"calories_remaining"`
	ProteinG          *int    `json:"protein_g"`
	ProteinEaten      float64 `json:"protein_eaten"`
	CarbsG            *int    `json:"carbs_g"`
	CarbsEaten        float64 `json:"carbs_eaten"`
	FatG              *int    `json:"fat_g"`
	FatEaten          float64 `json:"fat_eaten"`
}

type Goals struct {
	UserID         uuid.UUID `json:"user_id"`
	CalorieGoal    int       `json:"calorie_goal"`
	ProteinG       *int      `json:"protein_g"`
	CarbsG         *int      `json:"carbs_g"`
	FatG           *int      `json:"fat_g"`
	TargetWeightKg *float64  `json:"target_weight_kg"`
	UpdatedAt      time.Time `json:"updated_at"`
}
