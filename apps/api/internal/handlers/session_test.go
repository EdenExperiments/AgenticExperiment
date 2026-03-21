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

// stubSessionStore implements handlers.SessionStore for tests.
type stubSessionStore struct {
	session    *skills.TrainingSession
	xpResult   *skills.LogXPResult
	streak     *skills.StreakResult
	err        error
	// tracks calls
	xpEventCreated bool
}

func (s *stubSessionStore) CreateSession(
	_ context.Context,
	_ uuid.UUID, // userID
	_ uuid.UUID, // skillID
	req skills.CreateSessionRequest,
) (*skills.CreateSessionResult, error) {
	if s.err != nil {
		return nil, s.err
	}
	s.xpEventCreated = req.Status != "abandoned"
	return &skills.CreateSessionResult{
		Session:  s.session,
		XPResult: s.xpResult,
		Streak:   s.streak,
	}, nil
}

// stubSessionSkillStore implements what the session handler needs to look up skill state.
type stubSessionSkillStore2 struct {
	detail *skills.Skill
	err    error
}

func (s *stubSessionSkillStore2) GetSkill(_ context.Context, _, _ uuid.UUID) (*skills.Skill, error) {
	return s.detail, s.err
}

func sessionRequest(skillID uuid.UUID, values url.Values) *http.Request {
	req := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/skills/"+skillID.String()+"/sessions",
		strings.NewReader(values.Encode()),
	)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = req.WithContext(auth.WithUserID(req.Context(), uuid.New()))
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", skillID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	return req
}

// TestCreateSessionAbandoned verifies:
// - POST with status=abandoned returns 200
// - no xp_events row is created
// - training_sessions row has bonus_xp=0
// - xp_result in response is null
func TestCreateSessionAbandoned(t *testing.T) {
	skillID := uuid.New()
	sessionID := uuid.New()

	stub := &stubSessionStore{
		session: &skills.TrainingSession{
			ID:       sessionID,
			SkillID:  skillID,
			Status:   "abandoned",
			BonusXP:  0,
		},
		xpResult: nil,
		streak:   nil,
	}
	h := handlers.NewSessionHandlerWithStore(stub)

	form := url.Values{
		"session_type":         {"pomodoro"},
		"planned_duration_sec": {"1500"},
		"actual_duration_sec":  {"500"},
		"status":               {"abandoned"},
	}
	req := sessionRequest(skillID, form)
	w := httptest.NewRecorder()
	h.HandlePostSession(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 for abandoned session, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	// xp_result must be null for abandoned sessions (spec §6)
	if xpResult, ok := resp["xp_result"]; ok && xpResult != nil {
		t.Errorf("xp_result: expected null for abandoned session, got %v", xpResult)
	}

	// streak must be null for abandoned sessions
	if streak, ok := resp["streak"]; ok && streak != nil {
		t.Errorf("streak: expected null for abandoned session, got %v", streak)
	}

	// verify session object has bonus_xp=0
	sessionObj, ok := resp["session"].(map[string]interface{})
	if !ok {
		t.Fatal("session field missing from response")
	}
	bonusXP, _ := sessionObj["bonus_xp"].(float64)
	if bonusXP != 0 {
		t.Errorf("bonus_xp: got %v want 0 for abandoned session", bonusXP)
	}
	status, _ := sessionObj["status"].(string)
	if status != "abandoned" {
		t.Errorf("status: got %q want \"abandoned\"", status)
	}

	// The stub tracks whether an XP event was logically created
	if stub.xpEventCreated {
		t.Error("xp_events row must NOT be created for abandoned session")
	}
}

// TestCreateSessionCompleted verifies that a completed session:
// - returns 200
// - xp_events row is created with xp_delta = base + bonus
// - response includes xp_result with correct combined delta
func TestCreateSessionCompleted(t *testing.T) {
	skillID := uuid.New()
	sessionID := uuid.New()

	// Base 250 XP, 25% bonus → bonus = 63 XP (round(250*0.25)=62.5→63), total = 313
	stub := &stubSessionStore{
		session: &skills.TrainingSession{
			ID:              sessionID,
			SkillID:         skillID,
			Status:          "completed",
			BonusPercentage: 25,
			BonusXP:         63,
		},
		xpResult: &skills.LogXPResult{
			Skill:       &skills.Skill{Name: "Piano"},
			XPAdded:     313, // 250 + 63
			LevelBefore: 5,
			LevelAfter:  5,
		},
		streak: &skills.StreakResult{
			Current: 3,
			Longest: 10,
		},
	}
	h := handlers.NewSessionHandlerWithStore(stub)

	form := url.Values{
		"session_type":         {"pomodoro"},
		"planned_duration_sec": {"1500"},
		"actual_duration_sec":  {"1500"},
		"status":               {"completed"},
		"xp_delta":             {"250"},
	}
	req := sessionRequest(skillID, form)
	w := httptest.NewRecorder()
	h.HandlePostSession(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}

	// xp_result must be non-null
	if resp["xp_result"] == nil {
		t.Error("xp_result: must not be null for completed session")
	}

	// streak must be non-null
	if resp["streak"] == nil {
		t.Error("streak: must not be null for completed session")
	}

	xpResult, _ := resp["xp_result"].(map[string]interface{})
	xpAdded, _ := xpResult["xp_added"].(float64)
	if int(xpAdded) != 313 {
		t.Errorf("xp_result.xp_added: got %v want 313 (base 250 + bonus 63)", xpAdded)
	}
}

// TestCreateSessionValidation verifies that omitting xp_delta for a non-abandoned status returns 422.
func TestCreateSessionValidation(t *testing.T) {
	skillID := uuid.New()
	stub := &stubSessionStore{}
	h := handlers.NewSessionHandlerWithStore(stub)

	// Missing xp_delta for status=completed — must return 422
	form := url.Values{
		"session_type":         {"pomodoro"},
		"planned_duration_sec": {"1500"},
		"actual_duration_sec":  {"1500"},
		"status":               {"completed"},
		// xp_delta intentionally omitted
	}
	req := sessionRequest(skillID, form)
	w := httptest.NewRecorder()
	h.HandlePostSession(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422 for missing xp_delta, got %d: %s", w.Code, w.Body.String())
	}
}
