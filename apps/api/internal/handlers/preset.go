package handlers

import (
	"context"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/api"
	"github.com/meden/rpgtracker/internal/database"
	"github.com/meden/rpgtracker/internal/skills"
)

// PresetStore is the read interface the handler needs from the DB layer.
// The real implementation is the free functions in preset_repository.go,
// wrapped by dbPresetStore below. Tests inject a stub.
type PresetStore interface {
	ListPresets(ctx context.Context, category, query string) ([]skills.Preset, error)
	GetPreset(ctx context.Context, id uuid.UUID) (*skills.Preset, error)
}

// PresetHandler handles the preset browse and detail endpoints.
type PresetHandler struct {
	store PresetStore
}

// NewPresetHandler constructs a PresetHandler (DB via database.Querier from context).
func NewPresetHandler() *PresetHandler {
	return &PresetHandler{store: &dbPresetStore{}}
}

// NewPresetHandlerWithStore constructs a PresetHandler with an injected store.
// Use this in tests to avoid a real DB connection.
func NewPresetHandlerWithStore(s PresetStore) *PresetHandler {
	return &PresetHandler{store: s}
}

// dbPresetStore wraps the free repository functions to satisfy PresetStore.
type dbPresetStore struct{}

func (s *dbPresetStore) ListPresets(ctx context.Context, category, query string) ([]skills.Preset, error) {
	return skills.ListPresets(ctx, database.MustQuerier(ctx), category, query)
}

func (s *dbPresetStore) GetPreset(ctx context.Context, id uuid.UUID) (*skills.Preset, error) {
	return skills.GetPreset(ctx, database.MustQuerier(ctx), id)
}

// HandleGetPresets serves GET /api/v1/presets.
// Accepts optional query params: ?category=<slug> and ?q=<search>.
// Returns a JSON array of presets.
func (h *PresetHandler) HandleGetPresets(w http.ResponseWriter, r *http.Request) {
	category := r.URL.Query().Get("category")
	query := r.URL.Query().Get("q")

	presets, err := h.store.ListPresets(r.Context(), category, query)
	if err != nil {
		log.Printf("preset list: %v", err)
		api.RespondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	// Return empty array instead of null when there are no results.
	if presets == nil {
		presets = []skills.Preset{}
	}

	api.RespondJSON(w, http.StatusOK, presets)
}

// HandleGetPreset serves GET /api/v1/presets/{id}.
// Returns a single preset as JSON, or 404 if not found.
func (h *PresetHandler) HandleGetPreset(w http.ResponseWriter, r *http.Request) {
	rawID := chi.URLParam(r, "id")
	id, err := uuid.Parse(rawID)
	if err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid preset id")
		return
	}

	preset, err := h.store.GetPreset(r.Context(), id)
	if err != nil {
		log.Printf("preset get %s: %v", rawID, err)
		api.RespondError(w, http.StatusNotFound, "preset not found")
		return
	}

	api.RespondJSON(w, http.StatusOK, preset)
}
