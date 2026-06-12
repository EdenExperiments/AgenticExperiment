// Package nutrilog provides types and repository functions for NutriLog domain tables.
package nutrilog

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/meden/rpgtracker/internal/database"
)

// ErrNotFound is returned when a weight log does not exist or is not owned by the user.
var ErrNotFound = errors.New("not found")

// MaxMeasuredAtAge is the oldest allowed measured_at for new logs (30 days).
const MaxMeasuredAtAge = 30 * 24 * time.Hour

// WeightLog is a user-owned weight measurement record.
type WeightLog struct {
	ID         uuid.UUID `json:"id"`
	UserID     uuid.UUID `json:"user_id,omitempty"`
	WeightKg   float64   `json:"weight_kg"`
	Note       string    `json:"note"`
	MeasuredAt time.Time `json:"measured_at"`
	CreatedAt  time.Time `json:"created_at"`
}

// CreateWeightLog inserts a weight log for userID and returns the created row.
func CreateWeightLog(ctx context.Context, db database.Querier, userID uuid.UUID, weightKg float64, note string, measuredAt time.Time) (*WeightLog, error) {
	log := &WeightLog{
		UserID:     userID,
		WeightKg:   weightKg,
		Note:       note,
		MeasuredAt: measuredAt,
	}
	err := db.QueryRow(ctx, `
		INSERT INTO public.nl_weight_logs (user_id, weight_kg, note, measured_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at
	`, userID, weightKg, note, measuredAt).Scan(&log.ID, &log.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("nutrilog: create weight log: %w", err)
	}
	return log, nil
}

// ListWeightLogs returns weight logs for userID ordered by measured_at descending.
func ListWeightLogs(ctx context.Context, db database.Querier, userID uuid.UUID, limit int) ([]WeightLog, error) {
	rows, err := db.Query(ctx, `
		SELECT id, user_id, weight_kg, note, measured_at, created_at
		FROM public.nl_weight_logs
		WHERE user_id = $1
		ORDER BY measured_at DESC
		LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("nutrilog: list weight logs: %w", err)
	}
	defer rows.Close()

	var out []WeightLog
	for rows.Next() {
		var log WeightLog
		if err := scanWeightLog(rows, &log); err != nil {
			return nil, err
		}
		out = append(out, log)
	}
	return out, rows.Err()
}

// GetWeightLogsInRange returns weight logs for userID within the last days calendar days (UTC).
func GetWeightLogsInRange(ctx context.Context, db database.Querier, userID uuid.UUID, days int) ([]WeightLog, error) {
	rows, err := db.Query(ctx, `
		SELECT id, user_id, weight_kg, note, measured_at, created_at
		FROM public.nl_weight_logs
		WHERE user_id = $1
		  AND measured_at >= (NOW() AT TIME ZONE 'UTC')::date - ($2::int - 1) * INTERVAL '1 day'
		ORDER BY measured_at ASC
	`, userID, days)
	if err != nil {
		return nil, fmt.Errorf("nutrilog: weight logs in range: %w", err)
	}
	defer rows.Close()

	var out []WeightLog
	for rows.Next() {
		var log WeightLog
		if err := scanWeightLog(rows, &log); err != nil {
			return nil, err
		}
		out = append(out, log)
	}
	return out, rows.Err()
}

// GetWeightLog returns a single weight log owned by userID.
func GetWeightLog(ctx context.Context, db database.Querier, userID, logID uuid.UUID) (*WeightLog, error) {
	var log WeightLog
	err := db.QueryRow(ctx, `
		SELECT id, user_id, weight_kg, note, measured_at, created_at
		FROM public.nl_weight_logs
		WHERE id = $1 AND user_id = $2
	`, logID, userID).Scan(
		&log.ID, &log.UserID, &log.WeightKg, &log.Note, &log.MeasuredAt, &log.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("nutrilog: get weight log: %w", err)
	}
	return &log, nil
}

// DeleteWeightLog removes a weight log owned by userID.
func DeleteWeightLog(ctx context.Context, db database.Querier, userID, logID uuid.UUID) error {
	tag, err := db.Exec(ctx, `
		DELETE FROM public.nl_weight_logs WHERE id = $1 AND user_id = $2
	`, logID, userID)
	if err != nil {
		return fmt.Errorf("nutrilog: delete weight log: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanWeightLog(row rowScanner, log *WeightLog) error {
	if err := row.Scan(
		&log.ID, &log.UserID, &log.WeightKg, &log.Note, &log.MeasuredAt, &log.CreatedAt,
	); err != nil {
		return fmt.Errorf("nutrilog: scan weight log: %w", err)
	}
	return nil
}
