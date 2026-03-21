package handlers

import (
	"net/http"
	"time"

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

// HandlePatchAccount handles PATCH /api/v1/account.
// Accepts: timezone (IANA timezone string). Returns 422 if timezone is invalid (D-029).
func (h *UserHandler) HandlePatchAccount(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	if err := r.ParseForm(); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	timezone := r.FormValue("timezone")
	if timezone != "" {
		if _, err := time.LoadLocation(timezone); err != nil {
			api.RespondError(w, http.StatusUnprocessableEntity, "invalid timezone: must be a valid IANA timezone string")
			return
		}
	}

	if h.db != nil && timezone != "" {
		if err := users.UpdateTimezone(r.Context(), h.db, userID, timezone); err != nil {
			api.RespondError(w, http.StatusInternalServerError, "failed to update account")
			return
		}
	}

	api.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"timezone": timezone,
	})
}
