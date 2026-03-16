package handlers

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/templates"
	"github.com/meden/rpgtracker/internal/templates/pages"
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

// HandleGetAccount renders the account settings page for the authenticated user.
func (h *UserHandler) HandleGetAccount(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	email := auth.EmailFromContext(r.Context())
	u, err := users.GetOrCreateUser(r.Context(), h.db, userID, email)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	if err := templates.Render(w, r, http.StatusOK, pages.Account(u)); err != nil {
		http.Error(w, "render error", http.StatusInternalServerError)
	}
}

// HandlePostAccount processes a display-name update and redirects back to GET /account.
func (h *UserHandler) HandlePostAccount(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	displayName := r.FormValue("display_name")
	if err := users.UpdateDisplayName(r.Context(), h.db, userID, displayName); err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, "/account", http.StatusSeeOther)
}
