package handlers

import (
	"context"
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/api"
	"github.com/meden/rpgtracker/internal/database"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/skills"
)

// ActivityStore is the interface the activity handler needs from the DB layer.
type ActivityStore interface {
	GetRecentActivity(ctx context.Context, userID uuid.UUID, skillID *uuid.UUID, limit int) ([]skills.ActivityEvent, error)
}

// ActivityHandler handles activity feed endpoints.
type ActivityHandler struct{ store ActivityStore }

// NewActivityHandler constructs an ActivityHandler (DB via database.Querier from context).
func NewActivityHandler() *ActivityHandler {
	return &ActivityHandler{store: &dbActivityStore{}}
}

// NewActivityHandlerWithStore constructs an ActivityHandler with an injected store (for tests).
func NewActivityHandlerWithStore(s ActivityStore) *ActivityHandler {
	return &ActivityHandler{store: s}
}

type dbActivityStore struct{}

func (s *dbActivityStore) GetRecentActivity(ctx context.Context, userID uuid.UUID, skillID *uuid.UUID, limit int) ([]skills.ActivityEvent, error) {
	return skills.GetRecentActivity(ctx, database.MustQuerier(ctx), userID, skillID, limit)
}

// HandleGetActivity handles GET /api/v1/activity?limit=N&skill_id=UUID.
// Returns the most recent XP events for the authenticated user.
// Optional skill_id query param filters to a specific skill.
func (h *ActivityHandler) HandleGetActivity(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	limit := 10
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			limit = n
		}
	}

	var skillID *uuid.UUID
	if raw := r.URL.Query().Get("skill_id"); raw != "" {
		if id, err := uuid.Parse(raw); err == nil {
			skillID = &id
		}
	}

	events, err := h.store.GetRecentActivity(r.Context(), userID, skillID, limit)
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "failed to fetch activity")
		return
	}
	api.RespondJSON(w, http.StatusOK, events)
}
