// Package goals provides types, repository functions, and sentinel errors for
// the goals domain (goals, milestones, check-ins).
package goals

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ─── Sentinel errors ──────────────────────────────────────────────────────────

// ErrNotFound is returned when the requested record does not exist or is not
// owned by the authenticated user.
var ErrNotFound = errors.New("not found")

// ErrInvalidStatus is returned when an unknown status string is provided.
var ErrInvalidStatus = errors.New("status must be one of: active, completed, abandoned")

// ErrMeasurableIncomplete is returned when only one of current_value/target_value
// is provided.
var ErrMeasurableIncomplete = errors.New("current_value and target_value must both be set or both omitted")

// ─── Types ────────────────────────────────────────────────────────────────────

// GoalStatus is the lifecycle status of a goal.
type GoalStatus string

const (
	StatusActive    GoalStatus = "active"
	StatusCompleted GoalStatus = "completed"
	StatusAbandoned GoalStatus = "abandoned"
)

// ValidStatuses lists all accepted status values for input validation.
var ValidStatuses = map[GoalStatus]struct{}{
	StatusActive:    {},
	StatusCompleted: {},
	StatusAbandoned: {},
}

// Goal is a user-owned goal with optional skill linkage and measurable progress.
type Goal struct {
	ID           uuid.UUID  `json:"id"`
	UserID       uuid.UUID  `json:"user_id"`
	SkillID      *uuid.UUID `json:"skill_id"`
	Title        string     `json:"title"`
	Description  string     `json:"description"`
	Status       GoalStatus `json:"status"`
	TargetDate   *time.Time `json:"target_date"`
	CurrentValue *float64   `json:"current_value"`
	TargetValue  *float64   `json:"target_value"`
	Unit         string     `json:"unit"`
	Position     int        `json:"position"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// Milestone is one step toward completing a goal.
type Milestone struct {
	ID          uuid.UUID  `json:"id"`
	GoalID      uuid.UUID  `json:"goal_id"`
	UserID      uuid.UUID  `json:"user_id"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	IsDone      bool       `json:"is_done"`
	DoneAt      *time.Time `json:"done_at"`
	Position    int        `json:"position"`
	DueDate     *time.Time `json:"due_date"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// Checkin is an immutable progress note on a goal.
type Checkin struct {
	ID            uuid.UUID  `json:"id"`
	GoalID        uuid.UUID  `json:"goal_id"`
	UserID        uuid.UUID  `json:"user_id"`
	Note          string     `json:"note"`
	ValueSnapshot *float64   `json:"value_snapshot"`
	CreatedAt     time.Time  `json:"created_at"`
}

// ─── Goals repository ─────────────────────────────────────────────────────────

// CreateGoal inserts a new goal owned by userID and returns the created row.
func CreateGoal(ctx context.Context, db *pgxpool.Pool, userID uuid.UUID, title, description string, skillID *uuid.UUID, targetDate *time.Time, currentValue, targetValue *float64, unit string, position int) (*Goal, error) {
	g := &Goal{
		UserID:       userID,
		SkillID:      skillID,
		Title:        title,
		Description:  description,
		Status:       StatusActive,
		TargetDate:   targetDate,
		CurrentValue: currentValue,
		TargetValue:  targetValue,
		Unit:         unit,
		Position:     position,
	}
	err := db.QueryRow(ctx, `
		INSERT INTO public.goals
			(user_id, skill_id, title, description, status, target_date,
			 current_value, target_value, unit, position)
		VALUES ($1,$2,$3,$4,'active',$5,$6,$7,$8,$9)
		RETURNING id, created_at, updated_at
	`, userID, skillID, title, description, targetDate, currentValue, targetValue, unit, position).
		Scan(&g.ID, &g.CreatedAt, &g.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("goals: create: %w", err)
	}
	return g, nil
}

// ListGoals returns all goals for userID, optionally filtered by status, ordered by position then created_at desc.
func ListGoals(ctx context.Context, db *pgxpool.Pool, userID uuid.UUID, status *GoalStatus) ([]Goal, error) {
	query := `
		SELECT id, user_id, skill_id, title, description, status, target_date,
		       current_value, target_value, unit, position, created_at, updated_at
		FROM public.goals
		WHERE user_id = $1
	`
	args := []any{userID}
	if status != nil {
		query += " AND status = $2"
		args = append(args, *status)
	}
	query += " ORDER BY position ASC, created_at DESC"

	rows, err := db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("goals: list: %w", err)
	}
	defer rows.Close()

	var out []Goal
	for rows.Next() {
		var g Goal
		if err := scanGoal(rows, &g); err != nil {
			return nil, err
		}
		out = append(out, g)
	}
	return out, rows.Err()
}

// GetGoal returns a single goal owned by userID.
func GetGoal(ctx context.Context, db *pgxpool.Pool, userID, goalID uuid.UUID) (*Goal, error) {
	var g Goal
	err := db.QueryRow(ctx, `
		SELECT id, user_id, skill_id, title, description, status, target_date,
		       current_value, target_value, unit, position, created_at, updated_at
		FROM public.goals
		WHERE id = $1 AND user_id = $2
	`, goalID, userID).Scan(
		&g.ID, &g.UserID, &g.SkillID, &g.Title, &g.Description, &g.Status,
		&g.TargetDate, &g.CurrentValue, &g.TargetValue, &g.Unit, &g.Position,
		&g.CreatedAt, &g.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("goals: get: %w", err)
	}
	return &g, nil
}

// UpdateGoal updates mutable fields of a goal owned by userID.
func UpdateGoal(ctx context.Context, db *pgxpool.Pool, userID, goalID uuid.UUID, title, description string, skillID *uuid.UUID, status GoalStatus, targetDate *time.Time, currentValue, targetValue *float64, unit string, position int) (*Goal, error) {
	var g Goal
	err := db.QueryRow(ctx, `
		UPDATE public.goals SET
			title=$3, description=$4, skill_id=$5, status=$6,
			target_date=$7, current_value=$8, target_value=$9, unit=$10,
			position=$11, updated_at=now()
		WHERE id=$1 AND user_id=$2
		RETURNING id, user_id, skill_id, title, description, status, target_date,
		          current_value, target_value, unit, position, created_at, updated_at
	`, goalID, userID, title, description, skillID, status, targetDate, currentValue, targetValue, unit, position).Scan(
		&g.ID, &g.UserID, &g.SkillID, &g.Title, &g.Description, &g.Status,
		&g.TargetDate, &g.CurrentValue, &g.TargetValue, &g.Unit, &g.Position,
		&g.CreatedAt, &g.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("goals: update: %w", err)
	}
	return &g, nil
}

// DeleteGoal hard-deletes a goal owned by userID (cascades to milestones and checkins).
func DeleteGoal(ctx context.Context, db *pgxpool.Pool, userID, goalID uuid.UUID) error {
	tag, err := db.Exec(ctx, `
		DELETE FROM public.goals WHERE id=$1 AND user_id=$2
	`, goalID, userID)
	if err != nil {
		return fmt.Errorf("goals: delete: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ─── Milestones repository ────────────────────────────────────────────────────

// goalOwned checks that goalID exists and is owned by userID.
func goalOwned(ctx context.Context, db *pgxpool.Pool, userID, goalID uuid.UUID) error {
	var exists bool
	err := db.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM public.goals WHERE id=$1 AND user_id=$2)`,
		goalID, userID).Scan(&exists)
	if err != nil {
		return fmt.Errorf("goals: ownership check: %w", err)
	}
	if !exists {
		return ErrNotFound
	}
	return nil
}

// CreateMilestone inserts a new milestone on a goal owned by userID.
func CreateMilestone(ctx context.Context, db *pgxpool.Pool, userID, goalID uuid.UUID, title, description string, position int, dueDate *time.Time) (*Milestone, error) {
	if err := goalOwned(ctx, db, userID, goalID); err != nil {
		return nil, err
	}
	m := &Milestone{
		GoalID:      goalID,
		UserID:      userID,
		Title:       title,
		Description: description,
		Position:    position,
		DueDate:     dueDate,
	}
	err := db.QueryRow(ctx, `
		INSERT INTO public.goal_milestones
			(goal_id, user_id, title, description, position, due_date)
		VALUES ($1,$2,$3,$4,$5,$6)
		RETURNING id, created_at, updated_at
	`, goalID, userID, title, description, position, dueDate).
		Scan(&m.ID, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("goals: create milestone: %w", err)
	}
	return m, nil
}

// ListMilestones returns milestones for a goal owned by userID, ordered by position.
func ListMilestones(ctx context.Context, db *pgxpool.Pool, userID, goalID uuid.UUID) ([]Milestone, error) {
	if err := goalOwned(ctx, db, userID, goalID); err != nil {
		return nil, err
	}
	rows, err := db.Query(ctx, `
		SELECT id, goal_id, user_id, title, description, is_done, done_at,
		       position, due_date, created_at, updated_at
		FROM public.goal_milestones
		WHERE goal_id=$1 AND user_id=$2
		ORDER BY position ASC, created_at ASC
	`, goalID, userID)
	if err != nil {
		return nil, fmt.Errorf("goals: list milestones: %w", err)
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

// UpdateMilestone updates a milestone owned by userID.
func UpdateMilestone(ctx context.Context, db *pgxpool.Pool, userID, milestoneID uuid.UUID, title, description string, isDone bool, position int, dueDate *time.Time) (*Milestone, error) {
	var m Milestone
	var doneAt *time.Time
	if isDone {
		now := time.Now().UTC()
		doneAt = &now
	}
	err := db.QueryRow(ctx, `
		UPDATE public.goal_milestones SET
			title=$3, description=$4, is_done=$5, done_at=CASE WHEN $5 THEN COALESCE(done_at, now()) ELSE NULL END,
			position=$6, due_date=$7, updated_at=now()
		WHERE id=$1 AND user_id=$2
		RETURNING id, goal_id, user_id, title, description, is_done, done_at,
		          position, due_date, created_at, updated_at
	`, milestoneID, userID, title, description, isDone, position, dueDate).Scan(
		&m.ID, &m.GoalID, &m.UserID, &m.Title, &m.Description,
		&m.IsDone, &doneAt, &m.Position, &m.DueDate, &m.CreatedAt, &m.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("goals: update milestone: %w", err)
	}
	m.DoneAt = doneAt
	return &m, nil
}

// DeleteMilestone deletes a milestone owned by userID.
func DeleteMilestone(ctx context.Context, db *pgxpool.Pool, userID, milestoneID uuid.UUID) error {
	tag, err := db.Exec(ctx,
		`DELETE FROM public.goal_milestones WHERE id=$1 AND user_id=$2`,
		milestoneID, userID)
	if err != nil {
		return fmt.Errorf("goals: delete milestone: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ─── Checkins repository ──────────────────────────────────────────────────────

// CreateCheckin appends a check-in to a goal and optionally updates current_value.
// Both writes happen in a single transaction.
func CreateCheckin(ctx context.Context, db *pgxpool.Pool, userID, goalID uuid.UUID, note string, valueSnapshot *float64) (*Checkin, error) {
	if err := goalOwned(ctx, db, userID, goalID); err != nil {
		return nil, err
	}

	tx, err := db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("goals: checkin begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	c := &Checkin{
		GoalID:        goalID,
		UserID:        userID,
		Note:          note,
		ValueSnapshot: valueSnapshot,
	}
	err = tx.QueryRow(ctx, `
		INSERT INTO public.goal_checkins (goal_id, user_id, note, value_snapshot)
		VALUES ($1,$2,$3,$4)
		RETURNING id, created_at
	`, goalID, userID, note, valueSnapshot).Scan(&c.ID, &c.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("goals: create checkin: %w", err)
	}

	// If the check-in carries a value snapshot, advance the goal's current_value.
	if valueSnapshot != nil {
		if _, err = tx.Exec(ctx, `
			UPDATE public.goals SET current_value=$3, updated_at=now()
			WHERE id=$1 AND user_id=$2
		`, goalID, userID, *valueSnapshot); err != nil {
			return nil, fmt.Errorf("goals: checkin update current_value: %w", err)
		}
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("goals: checkin commit: %w", err)
	}
	return c, nil
}

// ListCheckins returns check-ins for a goal owned by userID, newest first.
func ListCheckins(ctx context.Context, db *pgxpool.Pool, userID, goalID uuid.UUID) ([]Checkin, error) {
	if err := goalOwned(ctx, db, userID, goalID); err != nil {
		return nil, err
	}
	rows, err := db.Query(ctx, `
		SELECT id, goal_id, user_id, note, value_snapshot, created_at
		FROM public.goal_checkins
		WHERE goal_id=$1 AND user_id=$2
		ORDER BY created_at DESC
	`, goalID, userID)
	if err != nil {
		return nil, fmt.Errorf("goals: list checkins: %w", err)
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

// ─── internal helpers ─────────────────────────────────────────────────────────

// scanGoal reads one goal row from a pgx.Rows cursor.
func scanGoal(rows pgx.Rows, g *Goal) error {
	return rows.Scan(
		&g.ID, &g.UserID, &g.SkillID, &g.Title, &g.Description, &g.Status,
		&g.TargetDate, &g.CurrentValue, &g.TargetValue, &g.Unit, &g.Position,
		&g.CreatedAt, &g.UpdatedAt,
	)
}
