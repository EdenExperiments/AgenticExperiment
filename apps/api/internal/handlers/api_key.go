package handlers

import (
	"errors"
	"net/http"

	"github.com/meden/rpgtracker/internal/api"
	"github.com/meden/rpgtracker/internal/database"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/keys"
)

// KeyHandler handles HTTP requests for Claude API key management.
type KeyHandler struct {
	masterKey []byte
}

// NewKeyHandler constructs a KeyHandler (DB via database.Querier from context).
func NewKeyHandler(masterKey []byte) *KeyHandler {
	return &KeyHandler{masterKey: masterKey}
}

// HandleGetAPIKey returns whether the authenticated user has a stored API key.
// The key itself is never returned.
func (h *KeyHandler) HandleGetAPIKey(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	status, err := keys.GetKeyStatus(r.Context(), database.MustQuerier(r.Context()), userID)
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
	err := keys.SaveKey(r.Context(), database.MustQuerier(r.Context()), h.masterKey, userID, apiKey)
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

	if err := keys.DeleteKey(r.Context(), database.MustQuerier(r.Context()), userID); err != nil {
		api.RespondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	api.RespondJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}
