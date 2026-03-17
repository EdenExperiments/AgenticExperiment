package handlers

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/meden/rpgtracker/internal/api"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/users"
)

// UserHandler handles HTTP requests for the user account screen.
type UserHandler struct {
	db *pgxpool.Pool
}

// NewUserHandler constructs a UserHandler with the given connection pool.
func NewUserHandler(db *pgxpool.Pool) *UserHandler {
	return &UserHandler{db: db}
}

// HandleGetAccount returns the authenticated user's account data as JSON.
func (h *UserHandler) HandleGetAccount(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	email := auth.EmailFromContext(r.Context())
	u, err := users.GetOrCreateUser(r.Context(), h.db, userID, email)
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	api.RespondJSON(w, http.StatusOK, u)
}

// HandlePostAccount processes a display-name update and returns JSON confirmation.
func (h *UserHandler) HandlePostAccount(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	displayName := r.FormValue("display_name")
	if len(displayName) > 100 {
		api.RespondError(w, http.StatusBadRequest, "display name too long")
		return
	}
	if err := users.UpdateDisplayName(r.Context(), h.db, userID, displayName); err != nil {
		api.RespondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	api.RespondJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}
