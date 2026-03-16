package handlers_test

import (
	"context"
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

// stubSkillStore records the last CreateSkill call.
type stubSkillStore struct {
	lastUserID   uuid.UUID
	lastName     string
	lastPresetID *uuid.UUID
}

func (s *stubSkillStore) CreateSkill(_ context.Context, userID uuid.UUID, name, _, _ string, presetID *uuid.UUID) (*skills.Skill, error) {
	s.lastUserID = userID
	s.lastName = name
	s.lastPresetID = presetID
	return &skills.Skill{ID: uuid.New(), UserID: userID, Name: name}, nil
}

var testUserID = uuid.MustParse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
var testPresetIDSkill = uuid.MustParse("11111111-1111-1111-1111-111111111111")

func requestWithUser(method, target string, body url.Values) *http.Request {
	var req *http.Request
	if body != nil {
		req = httptest.NewRequest(method, target, strings.NewReader(body.Encode()))
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	} else {
		req = httptest.NewRequest(method, target, nil)
	}
	ctx := auth.WithUserID(req.Context(), testUserID)
	return req.WithContext(ctx)
}

func TestHandleGetNewSkill_Blank(t *testing.T) {
	store := &stubSkillStore{}
	h := handlers.NewSkillHandlerWithStore(store)
	req := requestWithUser(http.MethodGet, "/skills/new/custom", nil)
	rec := httptest.NewRecorder()

	h.HandleGetNewSkill(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", rec.Code)
	}
	body := rec.Body.String()
	if !strings.Contains(body, "New Skill") {
		t.Error("page should contain form title")
	}
}

func TestHandleGetNewSkill_PreFill(t *testing.T) {
	store := &stubSkillStore{}
	h := handlers.NewSkillHandlerWithStore(store)
	req := requestWithUser(http.MethodGet, "/skills/new/custom?name=Running&description=cardio&unit=km&preset_id="+testPresetIDSkill.String(), nil)
	rec := httptest.NewRecorder()

	h.HandleGetNewSkill(rec, req)

	body := rec.Body.String()
	if !strings.Contains(body, "Running") {
		t.Error("form should be pre-filled with preset name")
	}
	if !strings.Contains(body, testPresetIDSkill.String()) {
		t.Error("form should contain hidden preset_id input")
	}
}

func TestHandlePostNewSkill_Valid(t *testing.T) {
	store := &stubSkillStore{}
	h := handlers.NewSkillHandlerWithStore(store)

	form := url.Values{
		"name":        {"Running"},
		"description": {"cardio"},
		"unit":        {"km"},
		"preset_id":   {testPresetIDSkill.String()},
	}
	req := requestWithUser(http.MethodPost, "/skills/new/custom", form)
	rec := httptest.NewRecorder()

	h.HandlePostNewSkill(rec, req)

	if rec.Code != http.StatusSeeOther {
		t.Errorf("status = %d, want 303", rec.Code)
	}
	if store.lastName != "Running" {
		t.Errorf("stored name = %q, want %q", store.lastName, "Running")
	}
	if store.lastPresetID == nil || *store.lastPresetID != testPresetIDSkill {
		t.Errorf("stored preset_id = %v, want %v", store.lastPresetID, testPresetIDSkill)
	}
}

func TestHandlePostNewSkill_MissingName(t *testing.T) {
	store := &stubSkillStore{}
	h := handlers.NewSkillHandlerWithStore(store)

	form := url.Values{"name": {""}}
	req := requestWithUser(http.MethodPost, "/skills/new/custom", form)
	rec := httptest.NewRecorder()

	h.HandlePostNewSkill(rec, req)

	if rec.Code != http.StatusUnprocessableEntity {
		t.Errorf("status = %d, want 422", rec.Code)
	}
}
