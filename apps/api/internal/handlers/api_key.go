package handlers

import (
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/meden/rpgtracker/internal/api"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/keys"
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

// HandleGetAPIKey returns whether the authenticated user has a stored API key.
// The key itself is never returned.
func (h *KeyHandler) HandleGetAPIKey(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	status, err := keys.GetKeyStatus(r.Context(), h.db, userID)
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	api.RespondJSON(w, http.StatusOK, map[string]bool{"has_key": status.Exists})
}

// HandlePostAPIKey stores a Claude API key for the authenticated user.
func (h *KeyHandler) HandlePostAPIKey(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	apiKey := r.FormValue("api_key")
	err := keys.SaveKey(r.Context(), h.db, h.masterKey, userID, apiKey)
	if err != nil {
		if errors.Is(err, keys.ErrInvalidKeyFormat) {
			api.RespondError(w, http.StatusUnprocessableEntity, "This doesn't look like a valid Claude API key.")
			return
		}
		api.RespondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	api.RespondJSON(w, http.StatusOK, map[string]string{"status": "saved"})
}

// HandleDeleteAPIKey removes the stored API key for the authenticated user.
func (h *KeyHandler) HandleDeleteAPIKey(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	if err := keys.DeleteKey(r.Context(), h.db, userID); err != nil {
		api.RespondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	api.RespondJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}
