package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"net/url"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/meden/rpgtracker/internal/skills"
	"github.com/meden/rpgtracker/internal/templates"
	"github.com/meden/rpgtracker/internal/templates/pages"
	"github.com/meden/rpgtracker/internal/templates/partials"
)

// PresetStore is the read interface the handler needs from the DB layer.
// The real implementation is the free functions in preset_repository.go,
// wrapped by dbPresetStore below. Tests inject a stub.
type PresetStore interface {
	ListCategories(ctx context.Context) ([]skills.Category, error)
	ListCategoriesWithPresets(ctx context.Context, filter skills.PresetFilter) ([]skills.CategoryWithPresets, error)
	GetPreset(ctx context.Context, id uuid.UUID) (*skills.Preset, error)
}

// PresetHandler handles the preset browse and redirect endpoints.
type PresetHandler struct {
	store PresetStore
}

// NewPresetHandler constructs a PresetHandler backed by the given DB pool.
func NewPresetHandler(db *pgxpool.Pool) *PresetHandler {
	return &PresetHandler{store: &dbPresetStore{db: db}}
}

// NewPresetHandlerWithStore constructs a PresetHandler with an injected store.
// Use this in tests to avoid a real DB connection.
func NewPresetHandlerWithStore(s PresetStore) *PresetHandler {
	return &PresetHandler{store: s}
}

// dbPresetStore wraps the free repository functions to satisfy PresetStore.
type dbPresetStore struct{ db *pgxpool.Pool }

func (s *dbPresetStore) ListCategories(ctx context.Context) ([]skills.Category, error) {
	return skills.ListCategories(ctx, s.db)
}
func (s *dbPresetStore) ListCategoriesWithPresets(ctx context.Context, f skills.PresetFilter) ([]skills.CategoryWithPresets, error) {
	return skills.ListCategoriesWithPresets(ctx, s.db, f)
}
func (s *dbPresetStore) GetPreset(ctx context.Context, id uuid.UUID) (*skills.Preset, error) {
	return skills.GetPreset(ctx, s.db, id)
}

// HandleGetPresetBrowse serves GET /skills/new.
//
// Three rendering modes based on request headers:
//   - No HX-Request: full page (Shell + browse content).
//   - HX-Request + HX-Target="preset-results": results partial only (chip/search filter).
//   - HX-Request (other targets, e.g. nav click): content fragment only (no Shell).
func (h *PresetHandler) HandleGetPresetBrowse(w http.ResponseWriter, r *http.Request) {
	filter := skills.PresetFilter{
		Query:    r.URL.Query().Get("q"),
		Category: r.URL.Query().Get("category"),
	}

	cats, err := h.store.ListCategoriesWithPresets(r.Context(), filter)
	if err != nil {
		log.Printf("preset browse: list presets: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	// Results-only partial (HTMX chip/search filter swap)
	if r.Header.Get("HX-Target") == "preset-results" {
		if err := templates.Render(w, r, http.StatusOK, partials.PresetResults(cats, filter)); err != nil {
			log.Printf("preset browse: render partial: %v", err)
		}
		return
	}

	// Full page or HTMX nav content swap — needs all categories for chips
	allCats, err := h.store.ListCategories(r.Context())
	if err != nil {
		log.Printf("preset browse: list categories: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	if err := templates.RenderPage(w, r, http.StatusOK,
		pages.PresetBrowse(allCats, cats, filter),
		pages.PresetBrowseContent(allCats, cats, filter),
	); err != nil {
		log.Printf("preset browse: render page: %v", err)
	}
}

// HandleGetFromPreset serves GET /skills/new/from-preset/{id}.
// It looks up the preset by ID and 303-redirects to /skills/new/custom
// with name, description, unit and preset_id as URL query params.
func (h *PresetHandler) HandleGetFromPreset(w http.ResponseWriter, r *http.Request) {
	rawID := chi.URLParam(r, "id")
	id, err := uuid.Parse(rawID)
	if err != nil {
		http.Error(w, "invalid preset id", http.StatusBadRequest)
		return
	}

	preset, err := h.store.GetPreset(r.Context(), id)
	if err != nil {
		log.Printf("preset redirect: get preset %s: %v", rawID, err)
		http.Error(w, "preset not found", http.StatusNotFound)
		return
	}

	q := url.Values{}
	q.Set("preset_id", preset.ID.String())
	q.Set("name", preset.Name)
	q.Set("description", preset.Description)
	q.Set("unit", preset.DefaultUnit)

	http.Redirect(w, r, fmt.Sprintf("/skills/new/custom?%s", q.Encode()), http.StatusSeeOther)
}
