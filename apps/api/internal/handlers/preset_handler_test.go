package handlers_test

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/handlers"
	"github.com/meden/rpgtracker/internal/skills"
)

// stubPresetStore is an in-memory implementation of handlers.PresetStore for handler tests.
type stubPresetStore struct {
	presets []skills.Preset
	preset  *skills.Preset
	err     error
}

func (s *stubPresetStore) ListPresets(_ context.Context, _, _ string) ([]skills.Preset, error) {
	if s.err != nil {
		return nil, s.err
	}
	return s.presets, nil
}

func (s *stubPresetStore) GetPreset(_ context.Context, _ uuid.UUID) (*skills.Preset, error) {
	if s.err != nil {
		return nil, s.err
	}
	if s.preset == nil {
		return nil, fmt.Errorf("not found")
	}
	return s.preset, nil
}

var testPresetID = uuid.MustParse("11111111-1111-1111-1111-111111111111")

func newStubPresetStore() *stubPresetStore {
	catID := uuid.New()
	return &stubPresetStore{
		presets: []skills.Preset{
			{
				ID:           testPresetID,
				CategoryID:   catID,
				Name:         "Running",
				Description:  "Build aerobic endurance",
				DefaultUnit:  "km",
				CategoryName: "Fitness & Movement",
				CategorySlug: "fitness",
			},
		},
		preset: &skills.Preset{
			ID:           testPresetID,
			CategoryID:   catID,
			Name:         "Running",
			Description:  "Build aerobic endurance",
			DefaultUnit:  "km",
			CategoryName: "Fitness & Movement",
			CategorySlug: "fitness",
		},
	}
}

func TestHandleGetPresets_ReturnsJSON(t *testing.T) {
	h := handlers.NewPresetHandlerWithStore(newStubPresetStore())
	req := httptest.NewRequest(http.MethodGet, "/api/v1/presets", nil)
	rec := httptest.NewRecorder()

	h.HandleGetPresets(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("Content-Type = %q, want application/json", ct)
	}

	var presets []skills.Preset
	if err := json.NewDecoder(rec.Body).Decode(&presets); err != nil {
		t.Fatalf("decode JSON: %v", err)
	}
	if len(presets) != 1 {
		t.Fatalf("expected 1 preset, got %d", len(presets))
	}
	if presets[0].Name != "Running" {
		t.Errorf("preset name = %q, want Running", presets[0].Name)
	}
}

func TestHandleGetPresets_EmptyList(t *testing.T) {
	h := handlers.NewPresetHandlerWithStore(&stubPresetStore{presets: []skills.Preset{}})
	req := httptest.NewRequest(http.MethodGet, "/api/v1/presets", nil)
	rec := httptest.NewRecorder()

	h.HandleGetPresets(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", rec.Code)
	}
	var presets []skills.Preset
	if err := json.NewDecoder(rec.Body).Decode(&presets); err != nil {
		t.Fatalf("decode JSON: %v", err)
	}
	if presets == nil {
		t.Error("expected non-nil empty slice, got nil")
	}
	if len(presets) != 0 {
		t.Errorf("expected 0 presets, got %d", len(presets))
	}
}

func TestHandleGetPreset_ReturnsJSON(t *testing.T) {
	h := handlers.NewPresetHandlerWithStore(newStubPresetStore())

	r := chi.NewRouter()
	r.Get("/api/v1/presets/{id}", h.HandleGetPreset)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/presets/"+testPresetID.String(), nil)
	rec := httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", rec.Code)
	}

	var preset skills.Preset
	if err := json.NewDecoder(rec.Body).Decode(&preset); err != nil {
		t.Fatalf("decode JSON: %v", err)
	}
	if preset.Name != "Running" {
		t.Errorf("preset name = %q, want Running", preset.Name)
	}
}

func TestHandleGetPreset_NotFound(t *testing.T) {
	h := handlers.NewPresetHandlerWithStore(&stubPresetStore{preset: nil})

	r := chi.NewRouter()
	r.Get("/api/v1/presets/{id}", h.HandleGetPreset)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/presets/"+testPresetID.String(), nil)
	rec := httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Errorf("status = %d, want 404", rec.Code)
	}
}

func TestHandleGetPreset_InvalidID(t *testing.T) {
	h := handlers.NewPresetHandlerWithStore(newStubPresetStore())

	r := chi.NewRouter()
	r.Get("/api/v1/presets/{id}", h.HandleGetPreset)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/presets/not-a-uuid", nil)
	rec := httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400", rec.Code)
	}
}
