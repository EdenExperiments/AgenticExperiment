package workout

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

type dbStore struct{}

func (s *dbStore) CreateSession(ctx context.Context, userID uuid.UUID) (*Session, error) {
	sess := &Session{Status: StatusInProgress, Exercises: []Exercise{}}
	err := database.MustQuerier(ctx).QueryRow(ctx, `
		INSERT INTO public.wo_sessions (user_id, status)
		VALUES ($1, $2)
		RETURNING id, started_at, ended_at, status, created_at
	`, userID, StatusInProgress).Scan(&sess.ID, &sess.StartedAt, &sess.EndedAt, &sess.Status, &sess.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("workout: create session: %w", err)
	}
	return sess, nil
}

func (s *dbStore) ListSessions(ctx context.Context, userID uuid.UUID, limit int) ([]Session, error) {
	rows, err := database.MustQuerier(ctx).Query(ctx, `
		SELECT s.id, s.started_at, s.ended_at, s.status, s.created_at,
		       COALESCE((
		         SELECT SUM(st.reps * st.load_kg)
		         FROM public.wo_sets st
		         JOIN public.wo_exercises e ON e.id = st.exercise_id
		         WHERE e.session_id = s.id AND st.load_kg IS NOT NULL
		       ), 0)
		FROM public.wo_sessions s
		WHERE s.user_id = $1
		ORDER BY s.started_at DESC
		LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("workout: list sessions: %w", err)
	}
	defer rows.Close()
	out := []Session{}
	for rows.Next() {
		var sess Session
		if err := rows.Scan(&sess.ID, &sess.StartedAt, &sess.EndedAt, &sess.Status, &sess.CreatedAt, &sess.VolumeKg); err != nil {
			return nil, fmt.Errorf("workout: scan session: %w", err)
		}
		out = append(out, sess)
	}
	return out, rows.Err()
}

func (s *dbStore) GetSession(ctx context.Context, userID, sessionID uuid.UUID) (*Session, error) {
	sess := &Session{}
	err := database.MustQuerier(ctx).QueryRow(ctx, `
		SELECT id, started_at, ended_at, status, created_at
		FROM public.wo_sessions
		WHERE id = $1 AND user_id = $2
	`, sessionID, userID).Scan(&sess.ID, &sess.StartedAt, &sess.EndedAt, &sess.Status, &sess.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("workout: get session: %w", err)
	}
	if err := s.loadTree(ctx, userID, sess); err != nil {
		return nil, err
	}
	sess.VolumeKg = sessionVolume(*sess)
	return sess, nil
}

func (s *dbStore) loadTree(ctx context.Context, userID uuid.UUID, sess *Session) error {
	rows, err := database.MustQuerier(ctx).Query(ctx, `
		SELECT id, session_id, name, position
		FROM public.wo_exercises
		WHERE session_id = $1 AND user_id = $2
		ORDER BY position ASC
	`, sess.ID, userID)
	if err != nil {
		return fmt.Errorf("workout: list exercises: %w", err)
	}
	defer rows.Close()
	sess.Exercises = []Exercise{}
	for rows.Next() {
		var ex Exercise
		if err := rows.Scan(&ex.ID, &ex.SessionID, &ex.Name, &ex.Position); err != nil {
			return fmt.Errorf("workout: scan exercise: %w", err)
		}
		ex.Sets = []Set{}
		sess.Exercises = append(sess.Exercises, ex)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	setRows, err := database.MustQuerier(ctx).Query(ctx, `
		SELECT st.id, st.exercise_id, st.reps, st.load_kg, st.rpe, st.position
		FROM public.wo_sets st
		JOIN public.wo_exercises e ON e.id = st.exercise_id
		WHERE e.session_id = $1 AND st.user_id = $2
		ORDER BY e.position ASC, st.position ASC
	`, sess.ID, userID)
	if err != nil {
		return fmt.Errorf("workout: list sets: %w", err)
	}
	defer setRows.Close()
	byEx := map[uuid.UUID][]Set{}
	for setRows.Next() {
		var st Set
		var load sql.NullFloat64
		var rpe sql.NullInt32
		if err := setRows.Scan(&st.ID, &st.ExerciseID, &st.Reps, &load, &rpe, &st.Position); err != nil {
			return fmt.Errorf("workout: scan set: %w", err)
		}
		if load.Valid {
			v := load.Float64
			st.LoadKg = &v
		}
		if rpe.Valid {
			v := int(rpe.Int32)
			st.RPE = &v
		}
		byEx[st.ExerciseID] = append(byEx[st.ExerciseID], st)
	}
	for i := range sess.Exercises {
		if sets, ok := byEx[sess.Exercises[i].ID]; ok {
			sess.Exercises[i].Sets = sets
		}
	}
	return setRows.Err()
}

func (s *dbStore) AbandonSession(ctx context.Context, userID, sessionID uuid.UUID) (*Session, error) {
	return s.endSession(ctx, userID, sessionID, StatusAbandoned)
}

func (s *dbStore) FinishSession(ctx context.Context, userID, sessionID uuid.UUID) (*Session, error) {
	return s.endSession(ctx, userID, sessionID, StatusCompleted)
}

func (s *dbStore) endSession(ctx context.Context, userID, sessionID uuid.UUID, status string) (*Session, error) {
	tag, err := database.MustQuerier(ctx).Exec(ctx, `
		UPDATE public.wo_sessions
		SET status = $3, ended_at = now()
		WHERE id = $1 AND user_id = $2 AND status = $4
	`, sessionID, userID, status, StatusInProgress)
	if err != nil {
		return nil, fmt.Errorf("workout: end session: %w", err)
	}
	if tag.RowsAffected() == 0 {
		_, getErr := s.GetSession(ctx, userID, sessionID)
		if errors.Is(getErr, ErrNotFound) {
			return nil, ErrNotFound
		}
		if getErr != nil {
			return nil, getErr
		}
		return nil, ErrConflict
	}
	return s.GetSession(ctx, userID, sessionID)
}

func (s *dbStore) AddExercise(ctx context.Context, userID, sessionID uuid.UUID, name string) (*Exercise, error) {
	sess, err := s.GetSession(ctx, userID, sessionID)
	if err != nil {
		return nil, err
	}
	if sess.Status != StatusInProgress {
		return nil, ErrConflict
	}
	ex := &Exercise{SessionID: sessionID, Name: name, Sets: []Set{}}
	err = database.MustQuerier(ctx).QueryRow(ctx, `
		INSERT INTO public.wo_exercises (session_id, user_id, name, position)
		VALUES ($1, $2, $3, $4)
		RETURNING id, position
	`, sessionID, userID, name, len(sess.Exercises)).Scan(&ex.ID, &ex.Position)
	if err != nil {
		return nil, fmt.Errorf("workout: add exercise: %w", err)
	}
	return ex, nil
}

func (s *dbStore) AddSet(ctx context.Context, userID, exerciseID uuid.UUID, reps int, loadKg *float64, rpe *int) (*Set, error) {
	var sessionID uuid.UUID
	var status string
	err := database.MustQuerier(ctx).QueryRow(ctx, `
		SELECT e.session_id, s.status
		FROM public.wo_exercises e
		JOIN public.wo_sessions s ON s.id = e.session_id
		WHERE e.id = $1 AND e.user_id = $2
	`, exerciseID, userID).Scan(&sessionID, &status)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("workout: get exercise: %w", err)
	}
	if status != StatusInProgress {
		return nil, ErrConflict
	}
	var position int
	err = database.MustQuerier(ctx).QueryRow(ctx, `
		SELECT COALESCE(MAX(position), -1) + 1 FROM public.wo_sets WHERE exercise_id = $1
	`, exerciseID).Scan(&position)
	if err != nil {
		return nil, fmt.Errorf("workout: next set position: %w", err)
	}
	st := &Set{ExerciseID: exerciseID, Reps: reps, LoadKg: loadKg, RPE: rpe, Position: position}
	err = database.MustQuerier(ctx).QueryRow(ctx, `
		INSERT INTO public.wo_sets (exercise_id, user_id, reps, load_kg, rpe, position)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`, exerciseID, userID, reps, loadKg, rpe, position).Scan(&st.ID)
	if err != nil {
		return nil, fmt.Errorf("workout: add set: %w", err)
	}
	return st, nil
}

func (s *dbStore) SessionsInRange(ctx context.Context, userID uuid.UUID, since time.Time) ([]Session, error) {
	rows, err := database.MustQuerier(ctx).Query(ctx, `
		SELECT id FROM public.wo_sessions
		WHERE user_id = $1 AND started_at >= $2 AND status = $3
		ORDER BY started_at ASC
	`, userID, since, StatusCompleted)
	if err != nil {
		return nil, fmt.Errorf("workout: sessions in range: %w", err)
	}
	defer rows.Close()
	var ids []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	out := []Session{}
	for _, id := range ids {
		sess, err := s.GetSession(ctx, userID, id)
		if err != nil {
			return nil, err
		}
		out = append(out, *sess)
	}
	return out, nil
}
