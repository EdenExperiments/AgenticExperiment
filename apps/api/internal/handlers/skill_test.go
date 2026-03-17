package handlers_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/handlers"
	"github.com/meden/rpgtracker/internal/skills"
)

// stubSkillStore implements SkillStore for tests.
type stubSkillStore struct {
	created *skills.Skill
	err     error
}

func (s *stubSkillStore) CreateSkill(_ context.Context, userID uuid.UUID, name, description, unit string, presetID *uuid.UUID) (*skills.Skill, error) {
	if s.err != nil {
		return nil, s.err
	}
	return s.created, nil
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
