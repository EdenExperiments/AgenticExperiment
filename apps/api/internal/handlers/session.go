package handlers

import (
	"context"
	"log"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/api"
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

	req := skills.CreateSessionRequest{
		SessionType:     sessionType,
		PlannedDuration: plannedDuration,
		ActualDuration:  actualDuration,
		Status:          status,
		BaseXP:          baseXP,
		LogNote:         logNote,
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

func parseIntOrZero(s string) int {
	n, _ := strconv.Atoi(s)
	return n
}
