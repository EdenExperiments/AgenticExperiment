package handlers

import (
	"context"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/meden/rpgtracker/internal/api"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/skills"
)

// XPStore is the interface the XP handler needs from the DB layer.
type XPStore interface {
	LogXP(ctx context.Context, userID, skillID uuid.UUID, xpDelta int, logNote string) (*skills.LogXPResult, error)
}

// XPHandler handles XP logging endpoints.
type XPHandler struct{ store XPStore }

// NewXPHandler constructs an XPHandler backed by the given DB pool.
func NewXPHandler(db *pgxpool.Pool) *XPHandler {
	return &XPHandler{store: &dbXPStore{db: db}}
}

// NewXPHandlerWithStore constructs an XPHandler with an injected store (for tests).
func NewXPHandlerWithStore(s XPStore) *XPHandler {
	return &XPHandler{store: s}
}

type dbXPStore struct{ db *pgxpool.Pool }

func (s *dbXPStore) LogXP(ctx context.Context, userID, skillID uuid.UUID, xpDelta int, logNote string) (*skills.LogXPResult, error) {
	return skills.LogXP(ctx, s.db, userID, skillID, xpDelta, logNote)
}

// HandlePostXP handles POST /api/v1/skills/{id}/xp.
// Body (form-urlencoded): xp_delta (required, int > 0), log_note (optional).
func (h *XPHandler) HandlePostXP(w http.ResponseWriter, r *http.Request) {
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
	xpDelta, err := parsePositiveInt(r.FormValue("xp_delta"))
	if err != nil {
		api.RespondError(w, http.StatusUnprocessableEntity, "xp_delta must be a positive integer")
		return
	}
	logNote := r.FormValue("log_note")

	result, err := h.store.LogXP(r.Context(), userID, skillID, xpDelta, logNote)
	if err != nil {
		log.Printf("ERROR: LogXP user=%s skill=%s delta=%d: %v", userID, skillID, xpDelta, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to log xp")
		return
	}
	api.RespondJSON(w, http.StatusOK, result)
}
