package handlers

import (
	"context"
	"errors"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/api"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/goals"
)

// ─── Store extension ─────────────────────────────────────────────────────────
//
// ForecastStore is a narrow interface so tests can stub only the forecast path.

// ForecastStore fetches the data required for a goal forecast.
type ForecastStore interface {
	GetForecastData(ctx context.Context, userID, goalID uuid.UUID) (goals.ForecastInput, error)
}

// ─── DB-backed implementation ─────────────────────────────────────────────────

func (s *dbGoalStore) GetForecastData(ctx context.Context, userID, goalID uuid.UUID) (goals.ForecastInput, error) {
	return goals.GetForecastData(ctx, s.db, userID, goalID)
}

// ─── Handler ──────────────────────────────────────────────────────────────────

// HandleGetGoalForecast handles GET /api/v1/goals/{id}/forecast.
//
// It enforces ownership (via GetForecastData which delegates to GetGoal), then
// runs the deterministic forecast engine and returns the result.
func (h *GoalHandler) HandleGetGoalForecast(w http.ResponseWriter, r *http.Request) {
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

	// The store type must satisfy ForecastStore. dbGoalStore does. The stub in
	// tests does too (see goal_forecast_test.go).
	fs, ok := h.store.(ForecastStore)
	if !ok {
		log.Printf("ERROR: GoalStore does not implement ForecastStore")
		api.RespondError(w, http.StatusInternalServerError, "forecast not available")
		return
	}

	input, err := fs.GetForecastData(r.Context(), userID, goalID)
	if err != nil {
		if errors.Is(err, goals.ErrNotFound) {
			api.RespondError(w, http.StatusNotFound, "goal not found")
			return
		}
		log.Printf("ERROR: GetForecastData user=%s goal=%s: %v", userID, goalID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to fetch forecast data")
		return
	}

	result := goals.ComputeForecast(input)
	api.RespondJSON(w, http.StatusOK, result)
}
