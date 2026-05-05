package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/meden/rpgtracker/internal/api"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/goals"
)

// GoalStore is the interface the handler uses. Allows stub injection in tests.
type GoalStore interface {
	CreateGoal(ctx context.Context, userID uuid.UUID, title, description string, skillID *uuid.UUID, targetDate *time.Time, currentValue, targetValue *float64, unit string, position int) (*goals.Goal, error)
	ListGoals(ctx context.Context, userID uuid.UUID, status *goals.GoalStatus) ([]goals.Goal, error)
	GetGoal(ctx context.Context, userID, goalID uuid.UUID) (*goals.Goal, error)
	UpdateGoal(ctx context.Context, userID, goalID uuid.UUID, title, description string, skillID *uuid.UUID, status goals.GoalStatus, targetDate *time.Time, currentValue, targetValue *float64, unit string, position int) (*goals.Goal, error)
	DeleteGoal(ctx context.Context, userID, goalID uuid.UUID) error

	CreateMilestone(ctx context.Context, userID, goalID uuid.UUID, title, description string, position int, dueDate *time.Time) (*goals.Milestone, error)
	ListMilestones(ctx context.Context, userID, goalID uuid.UUID) ([]goals.Milestone, error)
	UpdateMilestone(ctx context.Context, userID, milestoneID uuid.UUID, title, description string, isDone bool, position int, dueDate *time.Time) (*goals.Milestone, error)
	DeleteMilestone(ctx context.Context, userID, milestoneID uuid.UUID) error

	CreateCheckin(ctx context.Context, userID, goalID uuid.UUID, note string, valueSnapshot *float64) (*goals.Checkin, error)
	ListCheckins(ctx context.Context, userID, goalID uuid.UUID) ([]goals.Checkin, error)
}

type dbGoalStore struct{ db *pgxpool.Pool }

func (s *dbGoalStore) CreateGoal(ctx context.Context, userID uuid.UUID, title, description string, skillID *uuid.UUID, targetDate *time.Time, currentValue, targetValue *float64, unit string, position int) (*goals.Goal, error) {
	return goals.CreateGoal(ctx, s.db, userID, title, description, skillID, targetDate, currentValue, targetValue, unit, position)
}
func (s *dbGoalStore) ListGoals(ctx context.Context, userID uuid.UUID, status *goals.GoalStatus) ([]goals.Goal, error) {
	return goals.ListGoals(ctx, s.db, userID, status)
}
func (s *dbGoalStore) GetGoal(ctx context.Context, userID, goalID uuid.UUID) (*goals.Goal, error) {
	return goals.GetGoal(ctx, s.db, userID, goalID)
}
func (s *dbGoalStore) UpdateGoal(ctx context.Context, userID, goalID uuid.UUID, title, description string, skillID *uuid.UUID, status goals.GoalStatus, targetDate *time.Time, currentValue, targetValue *float64, unit string, position int) (*goals.Goal, error) {
	return goals.UpdateGoal(ctx, s.db, userID, goalID, title, description, skillID, status, targetDate, currentValue, targetValue, unit, position)
}
func (s *dbGoalStore) DeleteGoal(ctx context.Context, userID, goalID uuid.UUID) error {
	return goals.DeleteGoal(ctx, s.db, userID, goalID)
}
func (s *dbGoalStore) CreateMilestone(ctx context.Context, userID, goalID uuid.UUID, title, description string, position int, dueDate *time.Time) (*goals.Milestone, error) {
	return goals.CreateMilestone(ctx, s.db, userID, goalID, title, description, position, dueDate)
}
func (s *dbGoalStore) ListMilestones(ctx context.Context, userID, goalID uuid.UUID) ([]goals.Milestone, error) {
	return goals.ListMilestones(ctx, s.db, userID, goalID)
}
func (s *dbGoalStore) UpdateMilestone(ctx context.Context, userID, milestoneID uuid.UUID, title, description string, isDone bool, position int, dueDate *time.Time) (*goals.Milestone, error) {
	return goals.UpdateMilestone(ctx, s.db, userID, milestoneID, title, description, isDone, position, dueDate)
}
func (s *dbGoalStore) DeleteMilestone(ctx context.Context, userID, milestoneID uuid.UUID) error {
	return goals.DeleteMilestone(ctx, s.db, userID, milestoneID)
}
func (s *dbGoalStore) CreateCheckin(ctx context.Context, userID, goalID uuid.UUID, note string, valueSnapshot *float64) (*goals.Checkin, error) {
	return goals.CreateCheckin(ctx, s.db, userID, goalID, note, valueSnapshot)
}
func (s *dbGoalStore) ListCheckins(ctx context.Context, userID, goalID uuid.UUID) ([]goals.Checkin, error) {
	return goals.ListCheckins(ctx, s.db, userID, goalID)
}

// GoalHandler handles all goal-related HTTP endpoints.
type GoalHandler struct{ store GoalStore }

// NewGoalHandler constructs a GoalHandler backed by the given DB pool.
func NewGoalHandler(db *pgxpool.Pool) *GoalHandler {
	return &GoalHandler{store: &dbGoalStore{db: db}}
}

// NewGoalHandlerWithStore constructs a GoalHandler with an injected store (for tests).
func NewGoalHandlerWithStore(s GoalStore) *GoalHandler {
	return &GoalHandler{store: s}
}

// HandlePostGoal handles POST /api/v1/goals.
func (h *GoalHandler) HandlePostGoal(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var body struct {
		Title        string     `json:"title"`
		Description  string     `json:"description"`
		SkillID      *uuid.UUID `json:"skill_id"`
		TargetDate   *time.Time `json:"target_date"`
		CurrentValue *float64   `json:"current_value"`
		TargetValue  *float64   `json:"target_value"`
		Unit         string     `json:"unit"`
		Position     int        `json:"position"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if strings.TrimSpace(body.Title) == "" {
		api.RespondError(w, http.StatusUnprocessableEntity, "title is required")
		return
	}

	g, err := h.store.CreateGoal(r.Context(), userID, body.Title, body.Description, body.SkillID, body.TargetDate, body.CurrentValue, body.TargetValue, body.Unit, body.Position)
	if err != nil {
		log.Printf("ERROR: CreateGoal user=%s: %v", userID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to create goal")
		return
	}
	api.RespondJSON(w, http.StatusCreated, g)
}

// HandleGetGoals handles GET /api/v1/goals.
func (h *GoalHandler) HandleGetGoals(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var status *goals.GoalStatus
	if s := r.URL.Query().Get("status"); s != "" {
		gs := goals.GoalStatus(s)
		if _, valid := goals.ValidStatuses[gs]; !valid {
			api.RespondError(w, http.StatusUnprocessableEntity, goals.ErrInvalidStatus.Error())
			return
		}
		status = &gs
	}
	list, err := h.store.ListGoals(r.Context(), userID, status)
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "failed to list goals")
		return
	}
	api.RespondJSON(w, http.StatusOK, list)
}

// HandleGetGoal handles GET /api/v1/goals/{id}.
func (h *GoalHandler) HandleGetGoal(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	goalID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid goal id")
		return
	}
	g, err := h.store.GetGoal(r.Context(), userID, goalID)
	if err != nil {
		if errors.Is(err, goals.ErrNotFound) {
			api.RespondError(w, http.StatusNotFound, "goal not found")
			return
		}
		api.RespondError(w, http.StatusInternalServerError, "failed to get goal")
		return
	}
	api.RespondJSON(w, http.StatusOK, g)
}

// HandlePutGoal handles PUT /api/v1/goals/{id}.
func (h *GoalHandler) HandlePutGoal(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	goalID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid goal id")
		return
	}
	var body struct {
		Title        string           `json:"title"`
		Description  string           `json:"description"`
		SkillID      *uuid.UUID       `json:"skill_id"`
		Status       goals.GoalStatus `json:"status"`
		TargetDate   *time.Time       `json:"target_date"`
		CurrentValue *float64         `json:"current_value"`
		TargetValue  *float64         `json:"target_value"`
		Unit         string           `json:"unit"`
		Position     int              `json:"position"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if strings.TrimSpace(body.Title) == "" {
		api.RespondError(w, http.StatusUnprocessableEntity, "title is required")
		return
	}
	g, err := h.store.UpdateGoal(r.Context(), userID, goalID, body.Title, body.Description, body.SkillID, body.Status, body.TargetDate, body.CurrentValue, body.TargetValue, body.Unit, body.Position)
	if err != nil {
		if errors.Is(err, goals.ErrNotFound) {
			api.RespondError(w, http.StatusNotFound, "goal not found")
			return
		}
		api.RespondError(w, http.StatusInternalServerError, "failed to update goal")
		return
	}
	api.RespondJSON(w, http.StatusOK, g)
}

// HandleDeleteGoal handles DELETE /api/v1/goals/{id}.
func (h *GoalHandler) HandleDeleteGoal(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	goalID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid goal id")
		return
	}
	if err := h.store.DeleteGoal(r.Context(), userID, goalID); err != nil {
		if errors.Is(err, goals.ErrNotFound) {
			api.RespondError(w, http.StatusNotFound, "goal not found")
			return
		}
		api.RespondError(w, http.StatusInternalServerError, "failed to delete goal")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// HandlePostMilestone handles POST /api/v1/goals/{id}/milestones.
func (h *GoalHandler) HandlePostMilestone(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	goalID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid goal id")
		return
	}
	var body struct {
		Title       string     `json:"title"`
		Description string     `json:"description"`
		Position    int        `json:"position"`
		DueDate     *time.Time `json:"due_date"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if strings.TrimSpace(body.Title) == "" {
		api.RespondError(w, http.StatusUnprocessableEntity, "title is required")
		return
	}
	m, err := h.store.CreateMilestone(r.Context(), userID, goalID, body.Title, body.Description, body.Position, body.DueDate)
	if err != nil {
		if errors.Is(err, goals.ErrNotFound) {
			api.RespondError(w, http.StatusNotFound, "goal not found")
			return
		}
		api.RespondError(w, http.StatusInternalServerError, "failed to create milestone")
		return
	}
	api.RespondJSON(w, http.StatusCreated, m)
}

// HandleGetMilestones handles GET /api/v1/goals/{id}/milestones.
func (h *GoalHandler) HandleGetMilestones(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	goalID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid goal id")
		return
	}
	ms, err := h.store.ListMilestones(r.Context(), userID, goalID)
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "failed to list milestones")
		return
	}
	api.RespondJSON(w, http.StatusOK, ms)
}

// HandlePutMilestone handles PUT /api/v1/goals/{id}/milestones/{mid}.
func (h *GoalHandler) HandlePutMilestone(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	milestoneID, err := uuid.Parse(chi.URLParam(r, "mid"))
	if err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid milestone id")
		return
	}
	var body struct {
		Title       string     `json:"title"`
		Description string     `json:"description"`
		IsDone      bool       `json:"is_done"`
		Position    int        `json:"position"`
		DueDate     *time.Time `json:"due_date"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	m, err := h.store.UpdateMilestone(r.Context(), userID, milestoneID, body.Title, body.Description, body.IsDone, body.Position, body.DueDate)
	if err != nil {
		if errors.Is(err, goals.ErrNotFound) {
			api.RespondError(w, http.StatusNotFound, "milestone not found")
			return
		}
		api.RespondError(w, http.StatusInternalServerError, "failed to update milestone")
		return
	}
	api.RespondJSON(w, http.StatusOK, m)
}

// HandleDeleteMilestone handles DELETE /api/v1/goals/{id}/milestones/{mid}.
func (h *GoalHandler) HandleDeleteMilestone(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	milestoneID, err := uuid.Parse(chi.URLParam(r, "mid"))
	if err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid milestone id")
		return
	}
	if err := h.store.DeleteMilestone(r.Context(), userID, milestoneID); err != nil {
		if errors.Is(err, goals.ErrNotFound) {
			api.RespondError(w, http.StatusNotFound, "milestone not found")
			return
		}
		api.RespondError(w, http.StatusInternalServerError, "failed to delete milestone")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// HandlePostCheckin handles POST /api/v1/goals/{id}/checkins.
func (h *GoalHandler) HandlePostCheckin(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	goalID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid goal id")
		return
	}
	var body struct {
		Note          string   `json:"note"`
		ValueSnapshot *float64 `json:"value_snapshot"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if strings.TrimSpace(body.Note) == "" {
		api.RespondError(w, http.StatusUnprocessableEntity, "note is required")
		return
	}
	c, err := h.store.CreateCheckin(r.Context(), userID, goalID, body.Note, body.ValueSnapshot)
	if err != nil {
		if errors.Is(err, goals.ErrNotFound) {
			api.RespondError(w, http.StatusNotFound, "goal not found")
			return
		}
		api.RespondError(w, http.StatusInternalServerError, "failed to create check-in")
		return
	}
	api.RespondJSON(w, http.StatusCreated, c)
}

// HandleGetCheckins handles GET /api/v1/goals/{id}/checkins.
func (h *GoalHandler) HandleGetCheckins(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	goalID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid goal id")
		return
	}
	cs, err := h.store.ListCheckins(r.Context(), userID, goalID)
	if err != nil {
		if errors.Is(err, goals.ErrNotFound) {
			api.RespondError(w, http.StatusNotFound, "goal not found")
			return
		}
		api.RespondError(w, http.StatusInternalServerError, "failed to list check-ins")
		return
	}
	api.RespondJSON(w, http.StatusOK, cs)
}
