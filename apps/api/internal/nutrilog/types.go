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

type Goals struct {
	UserID         uuid.UUID `json:"user_id"`
	CalorieGoal    int       `json:"calorie_goal"`
	ProteinG       *int      `json:"protein_g"`
	CarbsG         *int      `json:"carbs_g"`
	FatG           *int      `json:"fat_g"`
	TargetWeightKg *float64  `json:"target_weight_kg"`
	UpdatedAt      time.Time `json:"updated_at"`
}
