package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/meden/rpgtracker/internal/api"
	"github.com/meden/rpgtracker/internal/database"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/skills"
)

// SessionStore is the persistence interface for training sessions.
type SessionStore interface {
	CreateSession(
		ctx context.Context,
		userID uuid.UUID,
		skillID uuid.UUID,
		req skills.CreateSessionRequest,
	) (*skills.CreateSessionResult, error)
}

// SessionHandler handles training session endpoints.
type SessionHandler struct {
	store SessionStore
}

// NewSessionHandlerWithStore constructs a SessionHandler with an injected store (for tests).
func NewSessionHandlerWithStore(s SessionStore) *SessionHandler {
	return &SessionHandler{store: s}
}

// NewSessionHandler constructs a SessionHandler (DB via database.Querier from context).
func NewSessionHandler() *SessionHandler {
	return &SessionHandler{store: &dbSessionStore{}}
}

// dbSessionStore is the real DB-backed implementation of SessionStore.
type dbSessionStore struct{}

// CreateSession inserts a training_sessions row and, for non-abandoned sessions,
// calls LogXP with the combined (base + bonus) delta.
func (s *dbSessionStore) CreateSession(ctx context.Context, userID, skillID uuid.UUID, req skills.CreateSessionRequest) (*skills.CreateSessionResult, error) {
	// 1. Load skill to get requires_active_use (and verify ownership).
	var requiresActiveUse bool
	err := database.MustQuerier(ctx).QueryRow(ctx, `
		SELECT requires_active_use
		FROM public.skills
		WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL
	`, skillID, userID).Scan(&requiresActiveUse)
	if err != nil {
		return nil, fmt.Errorf("session: get skill: %w", err)
	}

	// 2. Compute completion ratio and bonus.
	var completionRatio float64
	if req.PlannedDuration > 0 {
		completionRatio = float64(req.ActualDuration) / float64(req.PlannedDuration)
		if completionRatio > 1.0 {
			completionRatio = 1.0
		}
	}

	var bonusPct, bonusXP int
	if req.Status == "abandoned" {
		bonusPct, bonusXP = skills.ComputeBonusAbandoned(completionRatio, requiresActiveUse, req.BaseXP)
	} else {
		bonusPct, bonusXP = skills.ComputeBonus(completionRatio, requiresActiveUse, req.BaseXP)
	}

	totalXP := req.BaseXP + bonusXP

	// 3. Insert training_sessions row.
	var session skills.TrainingSession
	err = database.MustQuerier(ctx).QueryRow(ctx, `
		INSERT INTO public.training_sessions
			(skill_id, user_id, session_type, planned_duration_sec, actual_duration_sec,
			 status, completion_ratio, bonus_percentage, bonus_xp,
			 pomodoro_work_sec, pomodoro_break_sec, pomodoro_intervals_completed, pomodoro_intervals_planned)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING id, skill_id, user_id, session_type, planned_duration_sec, actual_duration_sec,
		          status, completion_ratio, bonus_percentage, bonus_xp,
		          pomodoro_work_sec, pomodoro_break_sec, pomodoro_intervals_completed, pomodoro_intervals_planned,
		          created_at
	`,
		skillID, userID, req.SessionType, req.PlannedDuration, req.ActualDuration,
		req.Status, completionRatio, bonusPct, bonusXP,
		req.PomodoroWorkSec, req.PomodoroBreakSec, req.PomodoroIntervalsCompleted, req.PomodoroIntervalsPlanned,
	).Scan(
		&session.ID, &session.SkillID, &session.UserID, &session.SessionType,
		&session.PlannedDuration, &session.ActualDuration, &session.Status,
		&session.CompletionRatio, &session.BonusPercentage, &session.BonusXP,
		&session.PomodoroWorkSec, &session.PomodoroBreakSec, &session.PomodoroIntervalsCompleted, &session.PomodoroIntervalsPlanned,
		&session.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("session: insert: %w", err)
	}

	// 4. For abandoned sessions: skip XP log.
	if req.Status == "abandoned" {
		return &skills.CreateSessionResult{
			Session:  &session,
			XPResult: nil,
			Streak:   nil,
		}, nil
	}

	// 5. For completed/partial: log XP with the training session FK.
	xpResult, err := skills.LogXP(ctx, database.MustQuerier(ctx), userID, skillID, totalXP, req.LogNote, &session.ID)
	if err != nil {
		return nil, fmt.Errorf("session: log xp: %w", err)
	}

	var streak *skills.StreakResult
	if xpResult.Streak != nil {
		streak = xpResult.Streak
	}

	return &skills.CreateSessionResult{
		Session:  &session,
		XPResult: xpResult,
		Streak:   streak,
	}, nil
}

// ListSessions returns paginated training sessions for a skill, most recent first.
// If before is non-nil, only sessions created before that time are returned.
// Returns the sessions, a next_cursor (created_at of last item if more pages exist), and any error.
func (s *dbSessionStore) ListSessions(ctx context.Context, skillID, userID uuid.UUID, limit int, before *time.Time) ([]skills.TrainingSession, *time.Time, error) {
	if limit <= 0 {
		limit = 20
	}

	var (
		rows pgx.Rows
		err  error
	)
	if before != nil {
		rows, err = database.MustQuerier(ctx).Query(ctx, `
			SELECT id, skill_id, user_id, session_type, planned_duration_sec, actual_duration_sec,
			       status, completion_ratio, bonus_percentage, bonus_xp,
			       pomodoro_work_sec, pomodoro_break_sec, pomodoro_intervals_completed, pomodoro_intervals_planned,
			       created_at
			FROM public.training_sessions
			WHERE skill_id=$1 AND user_id=$2 AND created_at < $3
			ORDER BY created_at DESC
			LIMIT $4
		`, skillID, userID, *before, limit)
	} else {
		rows, err = database.MustQuerier(ctx).Query(ctx, `
			SELECT id, skill_id, user_id, session_type, planned_duration_sec, actual_duration_sec,
			       status, completion_ratio, bonus_percentage, bonus_xp,
			       pomodoro_work_sec, pomodoro_break_sec, pomodoro_intervals_completed, pomodoro_intervals_planned,
			       created_at
			FROM public.training_sessions
			WHERE skill_id=$1 AND user_id=$2
			ORDER BY created_at DESC
			LIMIT $3
		`, skillID, userID, limit)
	}
	if err != nil {
		return nil, nil, fmt.Errorf("session: list: %w", err)
	}
	defer rows.Close()

	var out []skills.TrainingSession
	for rows.Next() {
		var ts skills.TrainingSession
		if err := rows.Scan(
			&ts.ID, &ts.SkillID, &ts.UserID, &ts.SessionType,
			&ts.PlannedDuration, &ts.ActualDuration, &ts.Status,
			&ts.CompletionRatio, &ts.BonusPercentage, &ts.BonusXP,
			&ts.PomodoroWorkSec, &ts.PomodoroBreakSec, &ts.PomodoroIntervalsCompleted, &ts.PomodoroIntervalsPlanned,
			&ts.CreatedAt,
		); err != nil {
			return nil, nil, err
		}
		out = append(out, ts)
	}
	if err := rows.Err(); err != nil {
		return nil, nil, err
	}

	var nextCursor *time.Time
	if len(out) == limit {
		t := out[len(out)-1].CreatedAt
		nextCursor = &t
	}
	return out, nextCursor, nil
}


// HandlePostSession handles POST /api/v1/skills/{id}/sessions.
func (h *SessionHandler) HandlePostSession(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	skillID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid skill id")
		return
	}

	if err := r.ParseForm(); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	sessionType := r.FormValue("session_type")
	plannedDuration := parseIntOrZero(r.FormValue("planned_duration_sec"))
	actualDuration := parseIntOrZero(r.FormValue("actual_duration_sec"))
	status := r.FormValue("status")
	logNote := r.FormValue("log_note")

	// xp_delta is required for non-abandoned sessions.
	var baseXP int
	if status != "abandoned" {
		xpDeltaStr := r.FormValue("xp_delta")
		if xpDeltaStr == "" {
			api.RespondError(w, http.StatusUnprocessableEntity, "xp_delta is required for non-abandoned sessions")
			return
		}
		n, err := strconv.Atoi(xpDeltaStr)
		if err != nil || n <= 0 {
			api.RespondError(w, http.StatusUnprocessableEntity, "xp_delta must be a positive integer")
			return
		}
		baseXP = n
	}

	// Parse optional Pomodoro fields.
	pomodoroWorkSec := parseIntOrZero(r.FormValue("pomodoro_work_sec"))
	pomodoroBreakSec := parseIntOrZero(r.FormValue("pomodoro_break_sec"))
	pomodoroIntervalsCompleted := parseIntOrZero(r.FormValue("pomodoro_intervals_completed"))
	pomodoroIntervalsPlanned := parseIntOrZero(r.FormValue("pomodoro_intervals_planned"))

	// Validate: intervals_completed cannot exceed intervals_planned.
	if pomodoroIntervalsCompleted > pomodoroIntervalsPlanned {
		api.RespondError(w, http.StatusUnprocessableEntity, "pomodoro_intervals_completed cannot exceed pomodoro_intervals_planned")
		return
	}

	req := skills.CreateSessionRequest{
		SessionType:                sessionType,
		PlannedDuration:            plannedDuration,
		ActualDuration:             actualDuration,
		Status:                     status,
		BaseXP:                     baseXP,
		LogNote:                    logNote,
		PomodoroWorkSec:            pomodoroWorkSec,
		PomodoroBreakSec:           pomodoroBreakSec,
		PomodoroIntervalsCompleted: pomodoroIntervalsCompleted,
		PomodoroIntervalsPlanned:   pomodoroIntervalsPlanned,
	}

	result, err := h.store.CreateSession(r.Context(), userID, skillID, req)
	if err != nil {
		log.Printf("ERROR: CreateSession user=%s skill=%s: %v", userID, skillID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to create session")
		return
	}

	api.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"session":   result.Session,
		"xp_result": result.XPResult,
		"streak":    result.Streak,
	})
}

// HandleGetSessions handles GET /api/v1/skills/{id}/sessions.
// Query params: limit (default 20), before (RFC3339 cursor for pagination).
func (h *SessionHandler) HandleGetSessions(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	skillID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid skill id")
		return
	}

	limit := parseIntOrZero(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = 20
	}

	var before *time.Time
	if beforeStr := r.URL.Query().Get("before"); beforeStr != "" {
		t, err := time.Parse(time.RFC3339, beforeStr)
		if err != nil {
			api.RespondError(w, http.StatusBadRequest, "invalid before cursor")
			return
		}
		before = &t
	}

	store := &dbSessionStore{}
	sessions, nextCursor, err := store.ListSessions(r.Context(), skillID, userID, limit, before)
	if err != nil {
		log.Printf("ERROR: ListSessions user=%s skill=%s: %v", userID, skillID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to list sessions")
		return
	}

	if sessions == nil {
		sessions = []skills.TrainingSession{}
	}

	api.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"sessions":    sessions,
		"next_cursor": nextCursor,
	})
}

func parseIntOrZero(s string) int {
	n, _ := strconv.Atoi(s)
	return n
}
