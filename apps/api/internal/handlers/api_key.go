package handlers

import (
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/keys"
	"github.com/meden/rpgtracker/internal/templates"
	"github.com/meden/rpgtracker/internal/templates/pages"
)

// KeyHandler handles HTTP requests for Claude API key management.
type KeyHandler struct {
	db        *pgxpool.Pool
	masterKey []byte
}

// NewKeyHandler constructs a KeyHandler with the given connection pool and master key.
func NewKeyHandler(db *pgxpool.Pool, masterKey []byte) *KeyHandler {
	return &KeyHandler{db: db, masterKey: masterKey}
}

// HandleGetAPIKey renders the API key management page for the authenticated user.
func (h *KeyHandler) HandleGetAPIKey(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	status, err := keys.GetKeyStatus(r.Context(), h.db, userID)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	if err := templates.RenderPage(w, r, http.StatusOK, pages.APIKey(status, ""), pages.APIKeyContent(status, "")); err != nil {
		http.Error(w, "render error", http.StatusInternalServerError)
	}
}

// HandlePostAPIKey processes a Claude API key submission for the authenticated user.
func (h *KeyHandler) HandlePostAPIKey(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	apiKey := r.FormValue("api_key")
	err := keys.SaveKey(r.Context(), h.db, h.masterKey, userID, apiKey)
	if err != nil {
		if errors.Is(err, keys.ErrInvalidKeyFormat) {
			status, statusErr := keys.GetKeyStatus(r.Context(), h.db, userID)
			if statusErr != nil {
				status = &keys.KeyStatus{Exists: false}
			}
			errMsg := "This doesn't look like a valid Claude API key."
			if renderErr := templates.RenderPage(w, r, http.StatusUnprocessableEntity, pages.APIKey(status, errMsg), pages.APIKeyContent(status, errMsg)); renderErr != nil {
				http.Error(w, "render error", http.StatusInternalServerError)
			}
			return
		}
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, "/account", http.StatusSeeOther)
}

// HandleDeleteAPIKey removes the stored API key for the authenticated user.
func (h *KeyHandler) HandleDeleteAPIKey(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	if err := keys.DeleteKey(r.Context(), h.db, userID); err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, "/account/api-key", http.StatusSeeOther)
}
