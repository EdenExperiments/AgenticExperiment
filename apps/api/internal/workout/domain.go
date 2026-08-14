package workout

import (
	"context"
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
	ErrNotFound       = errors.New("not found")
	ErrSessionClosed  = errors.New("session already finished")
	ErrSessionEmpty   = errors.New("session has no sets")
)

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

type Set struct {
	ID           uuid.UUID `json:"id"`
	SessionID    uuid.UUID `json:"session_id"`
	ExerciseName string    `json:"exercise_name"`
	Reps         int       `json:"reps"`
	LoadKg       *float64  `json:"load_kg,omitempty"`
	RPE          *float64  `json:"rpe,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

type Session struct {
	ID          uuid.UUID  `json:"id"`
	Title       string     `json:"title"`
	StartedAt   time.Time  `json:"started_at"`
	EndedAt     *time.Time `json:"ended_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	Sets        []Set      `json:"sets,omitempty"`
	SetCount    int        `json:"set_count"`
	RepCount    int        `json:"rep_count"`
	VolumeKg    float64    `json:"volume_kg"`
}

func StartSession(ctx context.Context, db database.Querier, userID uuid.UUID, title string) (*Session, error) {
	title = strings.TrimSpace(title)
	if title == "" {
		title = "Workout"
	}
	var s Session
	err := db.QueryRow(ctx, `
		INSERT INTO public.wo_sessions (user_id, title)
		VALUES ($1, $2)
		RETURNING id, title, started_at, ended_at, created_at
	`, userID, title).Scan(&s.ID, &s.Title, &s.StartedAt, &s.EndedAt, &s.CreatedAt)
	if isUniqueViolation(err) {
		return GetOpenSession(ctx, db, userID)
	}
	if err != nil {
		return nil, fmt.Errorf("workout: start: %w", err)
	}
	s.Sets = []Set{}
	return &s, nil
}

func GetOpenSession(ctx context.Context, db database.Querier, userID uuid.UUID) (*Session, error) {
	var s Session
	err := db.QueryRow(ctx, `
		SELECT id, title, started_at, ended_at, created_at
		FROM public.wo_sessions
		WHERE user_id = $1 AND ended_at IS NULL
	`, userID).Scan(&s.ID, &s.Title, &s.StartedAt, &s.EndedAt, &s.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("workout: get open: %w", err)
	}
	if err := attachSets(ctx, db, userID, &s); err != nil {
		return nil, err
	}
	return &s, nil
}

func GetSession(ctx context.Context, db database.Querier, userID, sessionID uuid.UUID) (*Session, error) {
	var s Session
	err := db.QueryRow(ctx, `
		SELECT id, title, started_at, ended_at, created_at
		FROM public.wo_sessions
		WHERE id = $1 AND user_id = $2
	`, sessionID, userID).Scan(&s.ID, &s.Title, &s.StartedAt, &s.EndedAt, &s.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("workout: get: %w", err)
	}
	if err := attachSets(ctx, db, userID, &s); err != nil {
		return nil, err
	}
	return &s, nil
}

func ListFinished(ctx context.Context, db database.Querier, userID uuid.UUID, limit int) ([]Session, error) {
	rows, err := db.Query(ctx, `
		SELECT id, title, started_at, ended_at, created_at
		FROM public.wo_sessions
		WHERE user_id = $1 AND ended_at IS NOT NULL
		ORDER BY ended_at DESC
		LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("workout: list: %w", err)
	}
	defer rows.Close()
	var out []Session
	for rows.Next() {
		var s Session
		if err := rows.Scan(&s.ID, &s.Title, &s.StartedAt, &s.EndedAt, &s.CreatedAt); err != nil {
			return nil, err
		}
		if err := attachSets(ctx, db, userID, &s); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	if out == nil {
		out = []Session{}
	}
	return out, rows.Err()
}

func AddSet(ctx context.Context, db database.Querier, userID, sessionID uuid.UUID, exercise string, reps int, loadKg, rpe *float64) (*Set, error) {
	session, err := GetSession(ctx, db, userID, sessionID)
	if err != nil {
		return nil, err
	}
	if session.EndedAt != nil {
		return nil, ErrSessionClosed
	}
	exercise = strings.TrimSpace(exercise)
	if exercise == "" || reps < 1 {
		return nil, fmt.Errorf("workout: exercise and reps required")
	}
	var set Set
	err = db.QueryRow(ctx, `
		INSERT INTO public.wo_sets (session_id, user_id, exercise_name, reps, load_kg, rpe)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, session_id, exercise_name, reps, load_kg, rpe, created_at
	`, sessionID, userID, exercise, reps, loadKg, rpe).Scan(
		&set.ID, &set.SessionID, &set.ExerciseName, &set.Reps, &set.LoadKg, &set.RPE, &set.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("workout: add set: %w", err)
	}
	return &set, nil
}

func DeleteSet(ctx context.Context, db database.Querier, userID, setID uuid.UUID) error {
	tag, err := db.Exec(ctx, `
		DELETE FROM public.wo_sets s
		USING public.wo_sessions sess
		WHERE s.id = $1 AND s.user_id = $2 AND s.session_id = sess.id AND sess.ended_at IS NULL
	`, setID, userID)
	if err != nil {
		return fmt.Errorf("workout: delete set: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func FinishSession(ctx context.Context, db database.Querier, userID, sessionID uuid.UUID) (*Session, error) {
	session, err := GetSession(ctx, db, userID, sessionID)
	if err != nil {
		return nil, err
	}
	if session.EndedAt != nil {
		return session, nil
	}
	if len(session.Sets) == 0 {
		return nil, ErrSessionEmpty
	}
	err = db.QueryRow(ctx, `
		UPDATE public.wo_sessions
		SET ended_at = now()
		WHERE id = $1 AND user_id = $2 AND ended_at IS NULL
		RETURNING id, title, started_at, ended_at, created_at
	`, sessionID, userID).Scan(&session.ID, &session.Title, &session.StartedAt, &session.EndedAt, &session.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return GetSession(ctx, db, userID, sessionID)
	}
	if err != nil {
		return nil, fmt.Errorf("workout: finish: %w", err)
	}
	if err := attachSets(ctx, db, userID, session); err != nil {
		return nil, err
	}
	return session, nil
}

func attachSets(ctx context.Context, db database.Querier, userID uuid.UUID, session *Session) error {
	rows, err := db.Query(ctx, `
		SELECT id, session_id, exercise_name, reps, load_kg, rpe, created_at
		FROM public.wo_sets
		WHERE session_id = $1 AND user_id = $2
		ORDER BY created_at
	`, session.ID, userID)
	if err != nil {
		return fmt.Errorf("workout: list sets: %w", err)
	}
	defer rows.Close()
	session.Sets = []Set{}
	session.SetCount = 0
	session.RepCount = 0
	session.VolumeKg = 0
	for rows.Next() {
		var set Set
		if err := rows.Scan(&set.ID, &set.SessionID, &set.ExerciseName, &set.Reps, &set.LoadKg, &set.RPE, &set.CreatedAt); err != nil {
			return err
		}
		session.Sets = append(session.Sets, set)
		session.SetCount++
		session.RepCount += set.Reps
		if set.LoadKg != nil {
			session.VolumeKg += *set.LoadKg * float64(set.Reps)
		}
	}
	return rows.Err()
}
