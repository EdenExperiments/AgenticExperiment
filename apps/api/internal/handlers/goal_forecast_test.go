package handlers_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/goals"
	"github.com/meden/rpgtracker/internal/handlers"
)

// ─── Stub store that also satisfies ForecastStore ─────────────────────────────

type stubForecastStore struct {
	stubGoalStore                       // embed existing stub for GoalStore methods
	forecastInput goals.ForecastInput
	forecastErr   error
}

func (s *stubForecastStore) GetForecastData(_ context.Context, _, _ uuid.UUID) (goals.ForecastInput, error) {
	return s.forecastInput, s.forecastErr
}

// ─── Router helper ────────────────────────────────────────────────────────────

func makeForecastRouter(h *handlers.GoalHandler) http.Handler {
	r := chi.NewRouter()
	r.Get("/goals/{id}/forecast", h.HandleGetGoalForecast)
	return r
}

func withForecastUser(r *http.Request, userID uuid.UUID) *http.Request {
	ctx := auth.WithUserID(r.Context(), userID)
	return r.WithContext(ctx)
}

// ─── Test data ────────────────────────────────────────────────────────────────

func forecastGoal() goals.Goal {
	created := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	target := time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC)
	cv := 50.0
	tv := 100.0
	return goals.Goal{
		ID:           testGoalID(),
		UserID:       testGoalUserID(),
		Title:        "Run a marathon",
		Status:       goals.StatusActive,
		CreatedAt:    created,
		TargetDate:   &target,
		CurrentValue: &cv,
		TargetValue:  &tv,
	}
}

func midYear() time.Time {
	return time.Date(2026, 7, 2, 0, 0, 0, 0, time.UTC)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

func TestHandleGetGoalForecast_OK(t *testing.T) {
	stub := &stubForecastStore{
		forecastInput: goals.ForecastInput{
			Goal: forecastGoal(),
			Now:  midYear(),
		},
	}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeForecastRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/goals/"+testGoalID().String()+"/forecast", nil)
	req = withForecastUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var result goals.ForecastResult
	if err := json.NewDecoder(w.Body).Decode(&result); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if result.TrackState == "" {
		t.Error("expected track_state to be set")
	}
	if result.ConfidenceScore < 0 || result.ConfidenceScore > 1 {
		t.Errorf("confidence_score out of range: %f", result.ConfidenceScore)
	}
}

func TestHandleGetGoalForecast_Unauthorized(t *testing.T) {
	stub := &stubForecastStore{}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeForecastRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/goals/"+testGoalID().String()+"/forecast", nil)
	// No user context injected.

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestHandleGetGoalForecast_InvalidUUID(t *testing.T) {
	stub := &stubForecastStore{}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeForecastRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/goals/not-a-uuid/forecast", nil)
	req = withForecastUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestHandleGetGoalForecast_NotFound(t *testing.T) {
	stub := &stubForecastStore{forecastErr: goals.ErrNotFound}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeForecastRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/goals/"+testGoalID().String()+"/forecast", nil)
	req = withForecastUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 for missing goal, got %d", w.Code)
	}
}

func TestHandleGetGoalForecast_OwnershipEnforced(t *testing.T) {
	// Another user's goal — store returns ErrNotFound (same as DB behaviour).
	stub := &stubForecastStore{forecastErr: goals.ErrNotFound}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeForecastRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/goals/"+testGoalID().String()+"/forecast", nil)
	req = withForecastUser(req, testGoalUserID2()) // wrong user

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 (not 403) for cross-user goal access, got %d", w.Code)
	}
}

func TestHandleGetGoalForecast_ResponseShape(t *testing.T) {
	stub := &stubForecastStore{
		forecastInput: goals.ForecastInput{
			Goal: forecastGoal(),
			Now:  midYear(),
		},
	}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeForecastRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/goals/"+testGoalID().String()+"/forecast", nil)
	req = withForecastUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	var raw map[string]any
	if err := json.NewDecoder(w.Body).Decode(&raw); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}

	requiredFields := []string{
		"track_state", "confidence_score", "drift_direction",
		"checkin_count", "recommend_checkin", "recommend_review", "recommend_stretch",
	}
	for _, field := range requiredFields {
		if _, ok := raw[field]; !ok {
			t.Errorf("response missing required field %q", field)
		}
	}
}

func TestHandleGetGoalForecast_CompletedGoalReturnsFullConfidence(t *testing.T) {
	g := forecastGoal()
	g.Status = goals.StatusCompleted
	stub := &stubForecastStore{
		forecastInput: goals.ForecastInput{Goal: g, Now: midYear()},
	}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeForecastRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/goals/"+testGoalID().String()+"/forecast", nil)
	req = withForecastUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var result goals.ForecastResult
	json.NewDecoder(w.Body).Decode(&result)
	if result.TrackState != goals.TrackStateComplete {
		t.Errorf("expected track_state=complete for completed goal, got %q", result.TrackState)
	}
	if result.ConfidenceScore != 1.0 {
		t.Errorf("expected confidence_score=1.0 for completed goal, got %f", result.ConfidenceScore)
	}
}

func TestHandleGetGoalForecast_WithCheckins(t *testing.T) {
	stub := &stubForecastStore{
		forecastInput: goals.ForecastInput{
			Goal: forecastGoal(),
			Checkins: []goals.Checkin{
				{ID: uuid.New(), CreatedAt: midYear().Add(-24 * time.Hour)},
				{ID: uuid.New(), CreatedAt: midYear().Add(-48 * time.Hour)},
			},
			Now: midYear(),
		},
	}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeForecastRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/goals/"+testGoalID().String()+"/forecast", nil)
	req = withForecastUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var result goals.ForecastResult
	json.NewDecoder(w.Body).Decode(&result)
	if result.CheckinCount != 2 {
		t.Errorf("expected checkin_count=2, got %d", result.CheckinCount)
	}
	// Checked in yesterday — should NOT recommend another check-in.
	if result.RecommendCheckin {
		t.Error("expected recommend_checkin=false when checked in recently")
	}
}
