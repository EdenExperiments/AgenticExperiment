package handlers_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/handlers"
	"github.com/meden/rpgtracker/internal/skills"
)

// stubSkillStore implements SkillStore for tests.
type stubSkillStore struct {
	created   *skills.Skill
	list      []skills.Skill
	detail    *skills.Skill
	gates     []skills.BlockerGate
	updated   *skills.Skill
	err       error
	deleteErr error
}

func (s *stubSkillStore) CreateSkill(_ context.Context, userID uuid.UUID, name, description, unit string, presetID *uuid.UUID, startingLevel int, gateDescs [10]string) (*skills.Skill, error) {
	if s.err != nil {
		return nil, s.err
	}
	return s.created, nil
}

func (s *stubSkillStore) ListSkills(_ context.Context, _ uuid.UUID) ([]skills.Skill, error) {
	return s.list, s.err
}

func (s *stubSkillStore) GetSkill(_ context.Context, _, _ uuid.UUID) (*skills.Skill, error) {
	if s.err != nil {
		return nil, s.err
	}
	return s.detail, nil
}

func (s *stubSkillStore) GetBlockerGates(_ context.Context, _ uuid.UUID) ([]skills.BlockerGate, error) {
	return s.gates, nil
}

func (s *stubSkillStore) UpdateSkill(_ context.Context, _, _ uuid.UUID, _, _ string) (*skills.Skill, error) {
	if s.err != nil {
		return nil, s.err
	}
	return s.updated, nil
}

func (s *stubSkillStore) SoftDeleteSkill(_ context.Context, _, _ uuid.UUID) error {
	return s.deleteErr
}

func userCtx(userID uuid.UUID) context.Context {
	return auth.WithUserID(context.Background(), userID)
}

func TestHandlePostSkill_Success(t *testing.T) {
	userID := uuid.New()
	skillID := uuid.New()
	stub := &stubSkillStore{
		created: &skills.Skill{ID: skillID, Name: "Piano", Unit: "session"},
	}
	h := handlers.NewSkillHandlerWithStore(stub)

	form := url.Values{"name": {"Piano"}, "unit": {"session"}}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/skills", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = req.WithContext(userCtx(userID))

	w := httptest.NewRecorder()
	h.HandlePostSkill(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
	var resp skills.Skill
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}
	if resp.Name != "Piano" {
		t.Fatalf("expected Piano, got %s", resp.Name)
	}
}

func TestHandlePostSkill_MissingName(t *testing.T) {
	h := handlers.NewSkillHandlerWithStore(&stubSkillStore{})
	userID := uuid.New()

	form := url.Values{"name": {""}}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/skills", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = req.WithContext(userCtx(userID))

	w := httptest.NewRecorder()
	h.HandlePostSkill(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422, got %d", w.Code)
	}
}

func TestHandlePostSkill_Unauthorized(t *testing.T) {
	h := handlers.NewSkillHandlerWithStore(&stubSkillStore{})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/skills", nil)
	w := httptest.NewRecorder()
	h.HandlePostSkill(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestHandleGetSkills_ReturnsEmptyArray(t *testing.T) {
	store := &stubSkillStore{list: []skills.Skill{}}
	h := handlers.NewSkillHandlerWithStore(store)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/skills", nil)
	req = req.WithContext(userCtx(uuid.New()))
	w := httptest.NewRecorder()
	h.HandleGetSkills(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("got %d want 200", w.Code)
	}
	body := strings.TrimSpace(w.Body.String())
	if body == "null" {
		t.Fatal("want [] got null")
	}
}

func TestHandleGetSkillDetail_ReturnsEffectiveLevel(t *testing.T) {
	skillID := uuid.New()
	store := &stubSkillStore{
		detail: &skills.Skill{ID: skillID, CurrentLevel: 10},
		gates: []skills.BlockerGate{
			{GateLevel: 9, IsCleared: false},
		},
	}
	h := handlers.NewSkillHandlerWithStore(store)

	// Build request with chi URL param
	req := httptest.NewRequest(http.MethodGet, "/api/v1/skills/"+skillID.String(), nil)
	req = req.WithContext(userCtx(uuid.New()))
	// Inject chi URLParam
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", skillID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.HandleGetSkill(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("got %d want 200: %s", w.Code, w.Body.String())
	}
	var resp map[string]interface{}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}
	effectiveLevel := int(resp["effective_level"].(float64))
	if effectiveLevel != 9 {
		t.Errorf("effective_level: got %d want 9", effectiveLevel)
	}
}

func TestHandleDeleteSkill_Returns204(t *testing.T) {
	skillID := uuid.New()
	store := &stubSkillStore{deleteErr: nil}
	h := handlers.NewSkillHandlerWithStore(store)

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/skills/"+skillID.String(), nil)
	req = req.WithContext(userCtx(uuid.New()))
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", skillID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.HandleDeleteSkill(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("got %d want 204", w.Code)
	}
}

func TestHandleDeleteSkill_Returns404_WhenNotOwner(t *testing.T) {
	skillID := uuid.New()
	store := &stubSkillStore{deleteErr: skills.ErrNotFound}
	h := handlers.NewSkillHandlerWithStore(store)

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/skills/"+skillID.String(), nil)
	req = req.WithContext(userCtx(uuid.New()))
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", skillID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.HandleDeleteSkill(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("got %d want 404", w.Code)
	}
}
