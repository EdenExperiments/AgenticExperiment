package handlers_test

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/handlers"
	"github.com/meden/rpgtracker/internal/skills"
)

// stubStore is an in-memory implementation of handlers.PresetStore for handler tests.
type stubStore struct {
	categories []skills.Category
	grouped    []skills.CategoryWithPresets
	preset     *skills.Preset
}

func (s *stubStore) ListCategories(_ context.Context) ([]skills.Category, error) {
	return s.categories, nil
}
func (s *stubStore) ListCategoriesWithPresets(_ context.Context, _ skills.PresetFilter) ([]skills.CategoryWithPresets, error) {
	return s.grouped, nil
}
func (s *stubStore) GetPreset(_ context.Context, _ uuid.UUID) (*skills.Preset, error) {
	if s.preset == nil {
		return nil, fmt.Errorf("not found")
	}
	return s.preset, nil
}

var testPresetID = uuid.MustParse("11111111-1111-1111-1111-111111111111")

func newStubStore() *stubStore {
	cat := skills.Category{ID: uuid.New(), Name: "Fitness & Movement", Slug: "fitness", Emoji: "🏃", SortOrder: 1}
	preset := skills.Preset{
		ID:          testPresetID,
		CategoryID:  cat.ID,
		Name:        "Running",
		Description: "Build aerobic endurance",
		DefaultUnit: "km",
	}
	return &stubStore{
		categories: []skills.Category{cat},
		grouped:    []skills.CategoryWithPresets{{Category: cat, Presets: []skills.Preset{preset}}},
		preset:     &preset,
	}
}

func TestHandleGetPresetBrowse_FullPage(t *testing.T) {
	h := handlers.NewPresetHandlerWithStore(newStubStore())
	req := httptest.NewRequest(http.MethodGet, "/skills/new", nil)
	rec := httptest.NewRecorder()

	h.HandleGetPresetBrowse(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", rec.Code)
	}
	body := rec.Body.String()
	if !strings.Contains(body, "Choose a Skill") {
		t.Error("full page should contain page title")
	}
	if !strings.Contains(body, "Running") {
		t.Error("full page should contain preset name")
	}
}

func TestHandleGetPresetBrowse_HTMXPartial(t *testing.T) {
	h := handlers.NewPresetHandlerWithStore(newStubStore())
	req := httptest.NewRequest(http.MethodGet, "/skills/new?category=fitness", nil)
	req.Header.Set("HX-Request", "true")
	req.Header.Set("HX-Target", "preset-results")
	rec := httptest.NewRecorder()

	h.HandleGetPresetBrowse(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", rec.Code)
	}
	body := rec.Body.String()
	// Results partial should NOT contain the Shell wrapper or page chrome
	if strings.Contains(body, "<html") {
		t.Error("HTMX partial should not contain <html> tag")
	}
	if !strings.Contains(body, "Running") {
		t.Error("partial should contain the preset name")
	}
}

func TestHandleGetFromPreset_Redirects(t *testing.T) {
	h := handlers.NewPresetHandlerWithStore(newStubStore())

	r := chi.NewRouter()
	r.Get("/skills/new/from-preset/{id}", h.HandleGetFromPreset)

	req := httptest.NewRequest(http.MethodGet, "/skills/new/from-preset/"+testPresetID.String(), nil)
	rec := httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusSeeOther {
		t.Errorf("status = %d, want 303", rec.Code)
	}
	loc := rec.Header().Get("Location")
	if !strings.HasPrefix(loc, "/skills/new/custom") {
		t.Errorf("redirect location = %q, want prefix /skills/new/custom", loc)
	}
	if !strings.Contains(loc, "name=Running") {
		t.Errorf("redirect should include name param, got %q", loc)
	}
	if !strings.Contains(loc, "preset_id="+testPresetID.String()) {
		t.Errorf("redirect should include preset_id param, got %q", loc)
	}
}
