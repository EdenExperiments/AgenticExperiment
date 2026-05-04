package goals

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// GetForecastData fetches all data needed to compute a goal forecast in a
// single round-trip per resource type. Ownership is enforced via GetGoal which
// scopes its query to userID.
func GetForecastData(ctx context.Context, db *pgxpool.Pool, userID, goalID uuid.UUID) (ForecastInput, error) {
	g, err := GetGoal(ctx, db, userID, goalID)
	if err != nil {
		return ForecastInput{}, err
	}

	checkins, err := listCheckinsForForecast(ctx, db, userID, goalID)
	if err != nil {
		return ForecastInput{}, fmt.Errorf("goals: forecast checkins: %w", err)
	}

	milestones, err := listMilestonesForForecast(ctx, db, userID, goalID)
	if err != nil {
		return ForecastInput{}, fmt.Errorf("goals: forecast milestones: %w", err)
	}

	return ForecastInput{
		Goal:       *g,
		Checkins:   checkins,
		Milestones: milestones,
		Now:        time.Now().UTC(),
	}, nil
}

// listCheckinsForForecast returns checkins newest-first (same as ListCheckins
// but without the ownership pre-check — we already confirmed ownership above).
func listCheckinsForForecast(ctx context.Context, db *pgxpool.Pool, userID, goalID uuid.UUID) ([]Checkin, error) {
	rows, err := db.Query(ctx, `
		SELECT id, goal_id, user_id, note, value_snapshot, created_at
		FROM public.goal_checkins
		WHERE goal_id=$1 AND user_id=$2
		ORDER BY created_at DESC
	`, goalID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Checkin
	for rows.Next() {
		var c Checkin
		if err := rows.Scan(&c.ID, &c.GoalID, &c.UserID, &c.Note, &c.ValueSnapshot, &c.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// listMilestonesForForecast returns milestones for the goal without the
// ownership pre-check (already confirmed above).
func listMilestonesForForecast(ctx context.Context, db *pgxpool.Pool, userID, goalID uuid.UUID) ([]Milestone, error) {
	rows, err := db.Query(ctx, `
		SELECT id, goal_id, user_id, title, description, is_done, done_at,
		       position, due_date, created_at, updated_at
		FROM public.goal_milestones
		WHERE goal_id=$1 AND user_id=$2
		ORDER BY position ASC
	`, goalID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Milestone
	for rows.Next() {
		var m Milestone
		if err := rows.Scan(&m.ID, &m.GoalID, &m.UserID, &m.Title, &m.Description,
			&m.IsDone, &m.DoneAt, &m.Position, &m.DueDate, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}
