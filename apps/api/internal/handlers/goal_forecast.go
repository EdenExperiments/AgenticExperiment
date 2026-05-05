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

// ForecastStore fetches the data required for a goal forecast.
type ForecastStore interface {
	GetForecastData(ctx context.Context, userID, goalID uuid.UUID) (goals.ForecastInput, error)
}

// DB-backed implementation of ForecastStore.
func (s *dbGoalStore) GetForecastData(ctx context.Context, userID, goalID uuid.UUID) (goals.ForecastInput, error) {
	return goals.GetForecastData(ctx, s.db, userID, goalID)
}

// HandleGetGoalForecast handles GET /api/v1/goals/{id}/forecast.
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
