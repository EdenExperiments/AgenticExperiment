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
	"github.com/meden/rpgtracker/internal/users"
)

// stubPrimarySkillStore implements handlers.UserStore for tests.
type stubPrimarySkillStore struct {
	ownsSkill      bool
	currentPrimary *uuid.UUID
	user           *users.User
}

func (s *stubPrimarySkillStore) GetOrCreateUser(_ context.Context, userID uuid.UUID, email string) (*users.User, error) {
	if s.user != nil {
		return s.user, nil
	}
	return &users.User{
		ID:             userID,
		Email:          email,
		PrimarySkillID: s.currentPrimary,
	}, nil
}

func (s *stubPrimarySkillStore) SetPrimarySkill(_ context.Context, userID, skillID uuid.UUID) (*uuid.UUID, error) {
	if !s.ownsSkill {
		return nil, users.ErrSkillNotOwned
	}
	// Toggle logic: if already pinned to this skill, unpin
	if s.currentPrimary != nil && *s.currentPrimary == skillID {
		s.currentPrimary = nil
		return nil, nil
	}
	s.currentPrimary = &skillID
	return &skillID, nil
}

func (s *stubPrimarySkillStore) SetAvatarURL(_ context.Context, userID uuid.UUID, url string) (*users.User, error) {
	return &users.User{ID: userID, AvatarURL: &url}, nil
}

func (s *stubPrimarySkillStore) ClearAvatarURL(_ context.Context, userID uuid.UUID) (*users.User, error) {
	return &users.User{ID: userID}, nil
}

func (s *stubPrimarySkillStore) GetAccountStats(_ context.Context, _ uuid.UUID) (*handlers.AccountStats, error) {
	return &handlers.AccountStats{}, nil
}

// --- Tests ---

// TestPatchPrimarySkill_ACL1 verifies that PATCH /api/v1/account/primary-skill
// with a valid owned skill_id sets primary_skill_id and returns 200.
func TestPatchPrimarySkill_ACL1(t *testing.T) {
	skillID := uuid.New()
	userID := uuid.New()

	store := &stubPrimarySkillStore{
		ownsSkill:      true,
		currentPrimary: nil,
	}

	h := handlers.NewUserHandlerWithStore(store)

	form := url.Values{"skill_id": {skillID.String()}}
	req := httptest.NewRequest(
		http.MethodPatch,
		"/api/v1/account/primary-skill",
		strings.NewReader(form.Encode()),
	)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = req.WithContext(auth.WithUserID(req.Context(), userID))

	w := httptest.NewRecorder()
	h.HandlePatchPrimarySkill(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("AC-L1: expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("AC-L1: invalid JSON response: %v", err)
	}

	if resp["primary_skill_id"] != skillID.String() {
		t.Fatalf("AC-L1: expected primary_skill_id=%s, got %v", skillID, resp["primary_skill_id"])
	}
}

// TestPatchPrimarySkill_ACL2 verifies the toggle-off behaviour:
// sending the currently-pinned skill_id unsets it and returns null.
func TestPatchPrimarySkill_ACL2(t *testing.T) {
	skillID := uuid.New()
	userID := uuid.New()

	store := &stubPrimarySkillStore{
		ownsSkill:      true,
		currentPrimary: &skillID, // already pinned
	}

	h := handlers.NewUserHandlerWithStore(store)

	form := url.Values{"skill_id": {skillID.String()}}
	req := httptest.NewRequest(
		http.MethodPatch,
		"/api/v1/account/primary-skill",
		strings.NewReader(form.Encode()),
	)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = req.WithContext(auth.WithUserID(req.Context(), userID))

	w := httptest.NewRecorder()
	h.HandlePatchPrimarySkill(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("AC-L2: expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("AC-L2: invalid JSON response: %v", err)
	}

	if resp["primary_skill_id"] != nil {
		t.Fatalf("AC-L2: expected primary_skill_id=null, got %v", resp["primary_skill_id"])
	}
}

// TestPatchPrimarySkill_ACL3 verifies that a skill_id not owned by the user
// returns 404.
func TestPatchPrimarySkill_ACL3(t *testing.T) {
	skillID := uuid.New()
	userID := uuid.New()

	store := &stubPrimarySkillStore{
		ownsSkill: false, // skill not owned
	}

	h := handlers.NewUserHandlerWithStore(store)

	form := url.Values{"skill_id": {skillID.String()}}
	req := httptest.NewRequest(
		http.MethodPatch,
		"/api/v1/account/primary-skill",
		strings.NewReader(form.Encode()),
	)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = req.WithContext(auth.WithUserID(req.Context(), userID))

	w := httptest.NewRecorder()
	h.HandlePatchPrimarySkill(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("AC-L3: expected 404, got %d: %s", w.Code, w.Body.String())
	}
}

// TestPatchPrimarySkill_InvalidUUID verifies that an invalid skill_id returns 422.
func TestPatchPrimarySkill_InvalidUUID(t *testing.T) {
	userID := uuid.New()

	store := &stubPrimarySkillStore{}
	h := handlers.NewUserHandlerWithStore(store)

	form := url.Values{"skill_id": {"not-a-uuid"}}
	req := httptest.NewRequest(
		http.MethodPatch,
		"/api/v1/account/primary-skill",
		strings.NewReader(form.Encode()),
	)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = req.WithContext(auth.WithUserID(req.Context(), userID))

	w := httptest.NewRecorder()
	h.HandlePatchPrimarySkill(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422 for invalid UUID, got %d: %s", w.Code, w.Body.String())
	}
}

// TestPatchPrimarySkill_Unauthorized verifies that missing auth returns 401.
func TestPatchPrimarySkill_Unauthorized(t *testing.T) {
	store := &stubPrimarySkillStore{}
	h := handlers.NewUserHandlerWithStore(store)

	form := url.Values{"skill_id": {uuid.New().String()}}
	req := httptest.NewRequest(
		http.MethodPatch,
		"/api/v1/account/primary-skill",
		strings.NewReader(form.Encode()),
	)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	// No auth context set

	w := httptest.NewRecorder()
	h.HandlePatchPrimarySkill(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for unauthorized, got %d: %s", w.Code, w.Body.String())
	}
}

// TestGetAccount_ACL4 verifies that GET /api/v1/account includes primary_skill_id.
func TestGetAccount_ACL4(t *testing.T) {
	skillID := uuid.New()
	userID := uuid.New()

	store := &stubPrimarySkillStore{
		currentPrimary: &skillID,
		user: &users.User{
			ID:             userID,
			Email:          "test@example.com",
			PrimarySkillID: &skillID,
		},
	}

	h := handlers.NewUserHandlerWithStore(store)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/account", nil)
	req = req.WithContext(auth.WithUserID(req.Context(), userID))

	w := httptest.NewRecorder()
	h.HandleGetAccount(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("AC-L4: expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("AC-L4: invalid JSON response: %v", err)
	}

	// primary_skill_id should be present in the response (string or null)
	if _, exists := resp["primary_skill_id"]; !exists {
		t.Fatalf("AC-L4: primary_skill_id field missing from GET /api/v1/account response: %s", w.Body.String())
	}

	if resp["primary_skill_id"] != skillID.String() {
		t.Fatalf("AC-L4: expected primary_skill_id=%s, got %v", skillID, resp["primary_skill_id"])
	}
}
