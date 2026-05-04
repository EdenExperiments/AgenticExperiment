package handlers_test

import (
	"bytes"
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

// ─── Stub store ───────────────────────────────────────────────────────────────

type stubGoalStore struct {
	goal      *goals.Goal
	goalList  []goals.Goal
	milestone *goals.Milestone
	msList    []goals.Milestone
	checkin   *goals.Checkin
	checkins  []goals.Checkin
	err       error

	lastTitle        string
	lastStatus       goals.GoalStatus
	lastValueSnap    *float64
	lastCurrentValue *float64
	lastTargetValue  *float64
	lastPosition     int
	lastIsDone       bool
}

func (s *stubGoalStore) CreateGoal(_ context.Context, _ uuid.UUID, title, description string, _ *uuid.UUID, _ *time.Time, currentValue, targetValue *float64, _ string, _ int) (*goals.Goal, error) {
	s.lastTitle = title
	s.lastCurrentValue = currentValue
	s.lastTargetValue = targetValue
	return s.goal, s.err
}
func (s *stubGoalStore) ListGoals(_ context.Context, _ uuid.UUID, status *goals.GoalStatus) ([]goals.Goal, error) {
	if status != nil {
		s.lastStatus = *status
	}
	return s.goalList, s.err
}
func (s *stubGoalStore) GetGoal(_ context.Context, _, _ uuid.UUID) (*goals.Goal, error) {
	return s.goal, s.err
}
func (s *stubGoalStore) UpdateGoal(_ context.Context, _, _ uuid.UUID, title, _ string, _ *uuid.UUID, status goals.GoalStatus, _ *time.Time, currentValue, targetValue *float64, _ string, _ int) (*goals.Goal, error) {
	s.lastTitle = title
	s.lastStatus = status
	s.lastCurrentValue = currentValue
	s.lastTargetValue = targetValue
	return s.goal, s.err
}
func (s *stubGoalStore) DeleteGoal(_ context.Context, _, _ uuid.UUID) error { return s.err }

func (s *stubGoalStore) CreateMilestone(_ context.Context, _, _ uuid.UUID, title, _ string, position int, _ *time.Time) (*goals.Milestone, error) {
	s.lastTitle = title
	s.lastPosition = position
	return s.milestone, s.err
}
func (s *stubGoalStore) ListMilestones(_ context.Context, _, _ uuid.UUID) ([]goals.Milestone, error) {
	return s.msList, s.err
}
func (s *stubGoalStore) UpdateMilestone(_ context.Context, _, _ uuid.UUID, title, _ string, isDone bool, position int, _ *time.Time) (*goals.Milestone, error) {
	s.lastTitle = title
	s.lastIsDone = isDone
	s.lastPosition = position
	return s.milestone, s.err
}
func (s *stubGoalStore) DeleteMilestone(_ context.Context, _, _ uuid.UUID) error { return s.err }

func (s *stubGoalStore) CreateCheckin(_ context.Context, _, _ uuid.UUID, _ string, valueSnapshot *float64) (*goals.Checkin, error) {
	s.lastValueSnap = valueSnapshot
	return s.checkin, s.err
}
func (s *stubGoalStore) ListCheckins(_ context.Context, _, _ uuid.UUID) ([]goals.Checkin, error) {
	return s.checkins, s.err
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func makeGoalRouter(h *handlers.GoalHandler) http.Handler {
	r := chi.NewRouter()
	r.Post("/goals", h.HandlePostGoal)
	r.Get("/goals", h.HandleGetGoals)
	r.Get("/goals/{id}", h.HandleGetGoal)
	r.Put("/goals/{id}", h.HandlePutGoal)
	r.Delete("/goals/{id}", h.HandleDeleteGoal)
	r.Post("/goals/{id}/milestones", h.HandlePostMilestone)
	r.Get("/goals/{id}/milestones", h.HandleGetMilestones)
	r.Put("/goals/{id}/milestones/{mid}", h.HandlePutMilestone)
	r.Delete("/goals/{id}/milestones/{mid}", h.HandleDeleteMilestone)
	r.Post("/goals/{id}/checkins", h.HandlePostCheckin)
	r.Get("/goals/{id}/checkins", h.HandleGetCheckins)
	return r
}

func withGoalUser(r *http.Request, userID uuid.UUID) *http.Request {
	ctx := auth.WithUserID(r.Context(), userID)
	return r.WithContext(ctx)
}

func testGoalUserID() uuid.UUID  { return uuid.MustParse("11111111-0000-0000-0000-000000000001") }
func testGoalID() uuid.UUID      { return uuid.MustParse("aaaaaaaa-0000-0000-0000-000000000001") }
func testMilestoneID() uuid.UUID { return uuid.MustParse("bbbbbbbb-0000-0000-0000-000000000002") }
func testGoalUserID2() uuid.UUID { return uuid.MustParse("cccccccc-0000-0000-0000-000000000003") }

func sampleGoal() *goals.Goal {
	return &goals.Goal{
		ID:     testGoalID(),
		UserID: testGoalUserID(),
		Title:  "Run a marathon",
		Status: goals.StatusActive,
	}
}

func sampleMilestone() *goals.Milestone {
	return &goals.Milestone{
		ID:     testMilestoneID(),
		GoalID: testGoalID(),
		UserID: testGoalUserID(),
		Title:  "Complete 10k",
	}
}

func sampleCheckin() *goals.Checkin {
	return &goals.Checkin{
		ID:     uuid.New(),
		GoalID: testGoalID(),
		UserID: testGoalUserID(),
		Note:   "Ran 5k today",
	}
}

// ─── Goal CRUD tests ──────────────────────────────────────────────────────────

func TestHandlePostGoal_OK(t *testing.T) {
	stub := &stubGoalStore{goal: sampleGoal()}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	body := `{"title":"Run a marathon","description":"Big goal"}`
	req := httptest.NewRequest(http.MethodPost, "/goals", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
	if stub.lastTitle != "Run a marathon" {
		t.Errorf("expected title passed to store, got %q", stub.lastTitle)
	}
}

func TestHandlePostGoal_MissingTitle(t *testing.T) {
	stub := &stubGoalStore{}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	body := `{"description":"No title here"}`
	req := httptest.NewRequest(http.MethodPost, "/goals", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422 for missing title, got %d", w.Code)
	}
}

func TestHandlePostGoal_Unauthorized(t *testing.T) {
	stub := &stubGoalStore{}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	body := `{"title":"Should fail"}`
	req := httptest.NewRequest(http.MethodPost, "/goals", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	// No user in context

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 with no user context, got %d", w.Code)
	}
}

// AC: current_value and target_value must both be set or both omitted.

func TestHandlePostGoal_MeasurablePairValidation_OnlyCurrentValue(t *testing.T) {
	stub := &stubGoalStore{}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	body := `{"title":"Partial progress goal","current_value":50}`
	req := httptest.NewRequest(http.MethodPost, "/goals", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422 when only current_value provided without target_value, got %d", w.Code)
	}
}

func TestHandlePostGoal_MeasurablePairValidation_OnlyTargetValue(t *testing.T) {
	stub := &stubGoalStore{}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	body := `{"title":"Partial progress goal","target_value":100}`
	req := httptest.NewRequest(http.MethodPost, "/goals", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422 when only target_value provided without current_value, got %d", w.Code)
	}
}

func TestHandlePostGoal_MeasurablePairValidation_BothSet(t *testing.T) {
	cur, tgt := 20.0, 100.0
	g := sampleGoal()
	g.CurrentValue = &cur
	g.TargetValue = &tgt
	stub := &stubGoalStore{goal: g}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	body := `{"title":"Full progress goal","current_value":20,"target_value":100,"unit":"km"}`
	req := httptest.NewRequest(http.MethodPost, "/goals", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201 when both current_value and target_value set, got %d: %s", w.Code, w.Body.String())
	}
	if stub.lastCurrentValue == nil || *stub.lastCurrentValue != 20.0 {
		t.Errorf("expected current_value=20.0 passed to store")
	}
	if stub.lastTargetValue == nil || *stub.lastTargetValue != 100.0 {
		t.Errorf("expected target_value=100.0 passed to store")
	}
}

func TestHandlePostGoal_MeasurablePairValidation_BothOmitted(t *testing.T) {
	stub := &stubGoalStore{goal: sampleGoal()}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	body := `{"title":"Qualitative goal"}`
	req := httptest.NewRequest(http.MethodPost, "/goals", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201 when both values omitted (qualitative goal), got %d: %s", w.Code, w.Body.String())
	}
	if stub.lastCurrentValue != nil || stub.lastTargetValue != nil {
		t.Errorf("expected both values nil when omitted, got current=%v target=%v", stub.lastCurrentValue, stub.lastTargetValue)
	}
}

func TestHandlePostGoal_InvalidTargetDate(t *testing.T) {
	stub := &stubGoalStore{}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	body := `{"title":"Bad date goal","target_date":"not-a-date"}`
	req := httptest.NewRequest(http.MethodPost, "/goals", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422 for invalid target_date format, got %d", w.Code)
	}
}

func TestHandlePostGoal_ZeroTargetValue(t *testing.T) {
	stub := &stubGoalStore{}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	// target_value of 0 with current_value makes no logical sense — handler should reject
	body := `{"title":"Zero target goal","current_value":5,"target_value":0}`
	req := httptest.NewRequest(http.MethodPost, "/goals", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422 for target_value=0, got %d", w.Code)
	}
}

func TestHandlePostGoal_NegativeCurrentValue(t *testing.T) {
	stub := &stubGoalStore{}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	body := `{"title":"Negative current goal","current_value":-10,"target_value":100}`
	req := httptest.NewRequest(http.MethodPost, "/goals", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422 for negative current_value, got %d", w.Code)
	}
}

func TestHandleGetGoals_Empty(t *testing.T) {
	stub := &stubGoalStore{goalList: []goals.Goal{}}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/goals", nil)
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	body := w.Body.String()
	if body == "null" || body == "" {
		t.Error("expected [] not null for empty goals list")
	}
}

func TestHandleGetGoals_StatusFilter_Active(t *testing.T) {
	stub := &stubGoalStore{goalList: []goals.Goal{*sampleGoal()}}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/goals?status=active", nil)
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	if stub.lastStatus != goals.StatusActive {
		t.Errorf("expected status=active passed to store, got %q", stub.lastStatus)
	}
}

func TestHandleGetGoals_StatusFilter_Completed(t *testing.T) {
	completed := *sampleGoal()
	completed.Status = goals.StatusCompleted
	stub := &stubGoalStore{goalList: []goals.Goal{completed}}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/goals?status=completed", nil)
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	if stub.lastStatus != goals.StatusCompleted {
		t.Errorf("expected status=completed passed to store, got %q", stub.lastStatus)
	}
}

func TestHandleGetGoals_StatusFilter_Abandoned(t *testing.T) {
	stub := &stubGoalStore{goalList: []goals.Goal{}}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/goals?status=abandoned", nil)
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	if stub.lastStatus != goals.StatusAbandoned {
		t.Errorf("expected status=abandoned passed to store, got %q", stub.lastStatus)
	}
}

func TestHandleGetGoals_StatusFilter_Invalid(t *testing.T) {
	stub := &stubGoalStore{}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/goals?status=bogus", nil)
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422 for invalid status filter, got %d", w.Code)
	}
}

func TestHandleGetGoals_NoStatusFilter_ReturnsAll(t *testing.T) {
	g1 := *sampleGoal()
	g2 := *sampleGoal()
	g2.ID = uuid.New()
	g2.Status = goals.StatusCompleted
	stub := &stubGoalStore{goalList: []goals.Goal{g1, g2}}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/goals", nil)
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var list []goals.Goal
	json.NewDecoder(w.Body).Decode(&list)
	if len(list) != 2 {
		t.Errorf("expected 2 goals, got %d", len(list))
	}
}

func TestHandleGetGoal_OK(t *testing.T) {
	stub := &stubGoalStore{goal: sampleGoal()}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/goals/"+testGoalID().String(), nil)
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var g goals.Goal
	json.NewDecoder(w.Body).Decode(&g)
	if g.Title != "Run a marathon" {
		t.Errorf("expected title 'Run a marathon', got %q", g.Title)
	}
}

func TestHandleGetGoal_NotFound(t *testing.T) {
	stub := &stubGoalStore{err: goals.ErrNotFound}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/goals/"+testGoalID().String(), nil)
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

// AC: Ownership isolation — user A cannot read user B's goal.

func TestHandleGetGoal_OwnershipIsolation_DifferentUser(t *testing.T) {
	stub := &stubGoalStore{err: goals.ErrNotFound}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/goals/"+testGoalID().String(), nil)
	req = withGoalUser(req, testGoalUserID2()) // different user

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 when user reads another user's goal, got %d", w.Code)
	}
}

func TestHandleGetGoal_InvalidID(t *testing.T) {
	stub := &stubGoalStore{}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/goals/not-a-uuid", nil)
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid UUID, got %d", w.Code)
	}
}

func TestHandlePutGoal_OK(t *testing.T) {
	updated := sampleGoal()
	updated.Title = "Updated goal"
	stub := &stubGoalStore{goal: updated}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	body := `{"title":"Updated goal","status":"active"}`
	req := httptest.NewRequest(http.MethodPut, "/goals/"+testGoalID().String(), bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	if stub.lastTitle != "Updated goal" {
		t.Errorf("expected title passed to store, got %q", stub.lastTitle)
	}
}

func TestHandlePutGoal_InvalidStatus(t *testing.T) {
	stub := &stubGoalStore{}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	body := `{"title":"Valid title","status":"unknown_status"}`
	req := httptest.NewRequest(http.MethodPut, "/goals/"+testGoalID().String(), bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422 for invalid status value, got %d", w.Code)
	}
}

// AC: Ownership isolation — user A cannot update user B's goal.

func TestHandlePutGoal_OwnershipEnforced(t *testing.T) {
	stub := &stubGoalStore{err: goals.ErrNotFound}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	body := `{"title":"Hijacked"}`
	req := httptest.NewRequest(http.MethodPut, "/goals/"+testGoalID().String(), bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = withGoalUser(req, testGoalUserID2()) // different user

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 when accessing another user's goal, got %d", w.Code)
	}
}

// AC: All three valid status transitions are accepted.

func TestHandlePutGoal_StatusTransition_ToCompleted(t *testing.T) {
	g := sampleGoal()
	g.Status = goals.StatusCompleted
	stub := &stubGoalStore{goal: g}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	body := `{"title":"Marathon goal","status":"completed"}`
	req := httptest.NewRequest(http.MethodPut, "/goals/"+testGoalID().String(), bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 for status=completed, got %d: %s", w.Code, w.Body.String())
	}
	if stub.lastStatus != goals.StatusCompleted {
		t.Errorf("expected completed status passed to store, got %q", stub.lastStatus)
	}
}

func TestHandlePutGoal_StatusTransition_ToAbandoned(t *testing.T) {
	g := sampleGoal()
	g.Status = goals.StatusAbandoned
	stub := &stubGoalStore{goal: g}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	body := `{"title":"Marathon goal","status":"abandoned"}`
	req := httptest.NewRequest(http.MethodPut, "/goals/"+testGoalID().String(), bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 for status=abandoned, got %d: %s", w.Code, w.Body.String())
	}
	if stub.lastStatus != goals.StatusAbandoned {
		t.Errorf("expected abandoned status passed to store, got %q", stub.lastStatus)
	}
}

// AC: Updating progress values subject to same pair validation as creation.

func TestHandlePutGoal_MeasurablePairValidation_OnlyCurrentValue(t *testing.T) {
	stub := &stubGoalStore{}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	body := `{"title":"Bad update","status":"active","current_value":30}`
	req := httptest.NewRequest(http.MethodPut, "/goals/"+testGoalID().String(), bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422 for partial progress update, got %d", w.Code)
	}
}

func TestHandleDeleteGoal_OK(t *testing.T) {
	stub := &stubGoalStore{}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	req := httptest.NewRequest(http.MethodDelete, "/goals/"+testGoalID().String(), nil)
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d", w.Code)
	}
}

func TestHandleDeleteGoal_NotFound(t *testing.T) {
	stub := &stubGoalStore{err: goals.ErrNotFound}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	req := httptest.NewRequest(http.MethodDelete, "/goals/"+testGoalID().String(), nil)
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

// AC: Ownership isolation — delete is isolated per user.

func TestHandleDeleteGoal_OwnershipEnforced(t *testing.T) {
	stub := &stubGoalStore{err: goals.ErrNotFound}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	req := httptest.NewRequest(http.MethodDelete, "/goals/"+testGoalID().String(), nil)
	req = withGoalUser(req, testGoalUserID2()) // different user

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 for cross-user delete, got %d", w.Code)
	}
}

// ─── Milestone tests ──────────────────────────────────────────────────────────

func TestHandlePostMilestone_OK(t *testing.T) {
	stub := &stubGoalStore{milestone: sampleMilestone()}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	body := `{"title":"Complete 10k","position":0}`
	req := httptest.NewRequest(http.MethodPost, "/goals/"+testGoalID().String()+"/milestones", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHandlePostMilestone_MissingTitle(t *testing.T) {
	stub := &stubGoalStore{}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	body := `{"description":"no title"}`
	req := httptest.NewRequest(http.MethodPost, "/goals/"+testGoalID().String()+"/milestones", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422, got %d", w.Code)
	}
}

func TestHandlePostMilestone_GoalNotFound(t *testing.T) {
	stub := &stubGoalStore{err: goals.ErrNotFound}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	body := `{"title":"Step 1"}`
	req := httptest.NewRequest(http.MethodPost, "/goals/"+testGoalID().String()+"/milestones", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 when goal not found, got %d", w.Code)
	}
}

// AC: Ownership isolation — user A cannot add milestones to user B's goal.

func TestHandlePostMilestone_OwnershipEnforced(t *testing.T) {
	stub := &stubGoalStore{err: goals.ErrNotFound}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	body := `{"title":"Sneaky milestone"}`
	req := httptest.NewRequest(http.MethodPost, "/goals/"+testGoalID().String()+"/milestones", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = withGoalUser(req, testGoalUserID2()) // different user

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 for cross-user milestone creation, got %d", w.Code)
	}
}

func TestHandlePostMilestone_PositionPassedToStore(t *testing.T) {
	stub := &stubGoalStore{milestone: sampleMilestone()}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	body := `{"title":"Step 3","position":2}`
	req := httptest.NewRequest(http.MethodPost, "/goals/"+testGoalID().String()+"/milestones", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d", w.Code)
	}
	if stub.lastPosition != 2 {
		t.Errorf("expected position=2 passed to store, got %d", stub.lastPosition)
	}
}

// AC: Milestones listed by position (ascending).

func TestHandleGetMilestones_OrderedByPosition(t *testing.T) {
	ms := []goals.Milestone{
		{ID: uuid.New(), GoalID: testGoalID(), Title: "Step A", Position: 0},
		{ID: uuid.New(), GoalID: testGoalID(), Title: "Step B", Position: 1},
		{ID: uuid.New(), GoalID: testGoalID(), Title: "Step C", Position: 2},
	}
	stub := &stubGoalStore{msList: ms}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/goals/"+testGoalID().String()+"/milestones", nil)
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var list []goals.Milestone
	json.NewDecoder(w.Body).Decode(&list)
	if len(list) != 3 {
		t.Fatalf("expected 3 milestones, got %d", len(list))
	}
	// The handler must return them in position order (0, 1, 2).
	if list[0].Position != 0 || list[1].Position != 1 || list[2].Position != 2 {
		t.Errorf("milestones not in position order: got positions %d, %d, %d",
			list[0].Position, list[1].Position, list[2].Position)
	}
}

func TestHandleGetMilestones_ReturnsEmptyArray(t *testing.T) {
	stub := &stubGoalStore{msList: []goals.Milestone{}}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/goals/"+testGoalID().String()+"/milestones", nil)
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	body := w.Body.String()
	if body == "null" || body == "" {
		t.Error("expected [] not null for empty milestones list")
	}
}

// AC: Ownership isolation — listing milestones on another user's goal returns 404.

func TestHandleGetMilestones_OwnershipEnforced(t *testing.T) {
	stub := &stubGoalStore{err: goals.ErrNotFound}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/goals/"+testGoalID().String()+"/milestones", nil)
	req = withGoalUser(req, testGoalUserID2()) // different user

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 for cross-user milestone list, got %d", w.Code)
	}
}

func TestHandlePutMilestone_MarkDone(t *testing.T) {
	done := sampleMilestone()
	done.IsDone = true
	stub := &stubGoalStore{milestone: done}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	body := `{"title":"Complete 10k","is_done":true}`
	req := httptest.NewRequest(http.MethodPut,
		"/goals/"+testGoalID().String()+"/milestones/"+testMilestoneID().String(),
		bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	if !stub.lastIsDone {
		t.Error("expected is_done=true passed to store")
	}
}

func TestHandlePutMilestone_OwnershipEnforced(t *testing.T) {
	stub := &stubGoalStore{err: goals.ErrNotFound}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	body := `{"title":"Hijacked milestone"}`
	req := httptest.NewRequest(http.MethodPut,
		"/goals/"+testGoalID().String()+"/milestones/"+testMilestoneID().String(),
		bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = withGoalUser(req, testGoalUserID2()) // different user

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 for cross-user milestone update, got %d", w.Code)
	}
}

func TestHandleDeleteMilestone_OK(t *testing.T) {
	stub := &stubGoalStore{}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	req := httptest.NewRequest(http.MethodDelete,
		"/goals/"+testGoalID().String()+"/milestones/"+testMilestoneID().String(), nil)
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d", w.Code)
	}
}

// AC: Ownership isolation — user A cannot delete user B's milestone.

func TestHandleDeleteMilestone_OwnershipEnforced(t *testing.T) {
	stub := &stubGoalStore{err: goals.ErrNotFound}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	req := httptest.NewRequest(http.MethodDelete,
		"/goals/"+testGoalID().String()+"/milestones/"+testMilestoneID().String(), nil)
	req = withGoalUser(req, testGoalUserID2()) // different user

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 for cross-user milestone delete, got %d", w.Code)
	}
}

// ─── Check-in tests ───────────────────────────────────────────────────────────

func TestHandlePostCheckin_OK(t *testing.T) {
	stub := &stubGoalStore{checkin: sampleCheckin()}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	body := `{"note":"Ran 5k today"}`
	req := httptest.NewRequest(http.MethodPost, "/goals/"+testGoalID().String()+"/checkins", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHandlePostCheckin_WithValueSnapshot(t *testing.T) {
	snap := 75.5
	c := sampleCheckin()
	c.ValueSnapshot = &snap
	stub := &stubGoalStore{checkin: c}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	body := `{"note":"weighed in","value_snapshot":75.5}`
	req := httptest.NewRequest(http.MethodPost, "/goals/"+testGoalID().String()+"/checkins", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
	if stub.lastValueSnap == nil || *stub.lastValueSnap != 75.5 {
		t.Error("expected value_snapshot=75.5 passed to store")
	}
}

// AC: Check-in without a note must be rejected.

func TestHandlePostCheckin_EmptyNote(t *testing.T) {
	stub := &stubGoalStore{}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	body := `{"note":""}`
	req := httptest.NewRequest(http.MethodPost, "/goals/"+testGoalID().String()+"/checkins", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422 for empty note, got %d", w.Code)
	}
}

func TestHandlePostCheckin_EmptyPayload(t *testing.T) {
	stub := &stubGoalStore{}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	body := `{}`
	req := httptest.NewRequest(http.MethodPost, "/goals/"+testGoalID().String()+"/checkins", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422 for empty checkin, got %d", w.Code)
	}
}

// AC: Ownership isolation — user A cannot create check-ins for user B's goal.

func TestHandlePostCheckin_OwnershipEnforced(t *testing.T) {
	stub := &stubGoalStore{err: goals.ErrNotFound}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	body := `{"note":"sneaky"}`
	req := httptest.NewRequest(http.MethodPost, "/goals/"+testGoalID().String()+"/checkins", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = withGoalUser(req, testGoalUserID2()) // different user

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 for cross-user checkin, got %d", w.Code)
	}
}

func TestHandlePostCheckin_Unauthorized(t *testing.T) {
	stub := &stubGoalStore{}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	body := `{"note":"Should fail"}`
	req := httptest.NewRequest(http.MethodPost, "/goals/"+testGoalID().String()+"/checkins", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	// No user in context

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 with no user context, got %d", w.Code)
	}
}

// AC: Check-ins listed newest first.

func TestHandleGetCheckins_NewestFirst(t *testing.T) {
	now := time.Now()
	earlier := now.Add(-24 * time.Hour)
	checkins := []goals.Checkin{
		{ID: uuid.New(), GoalID: testGoalID(), Note: "Newer note", CreatedAt: now},
		{ID: uuid.New(), GoalID: testGoalID(), Note: "Older note", CreatedAt: earlier},
	}
	stub := &stubGoalStore{checkins: checkins}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/goals/"+testGoalID().String()+"/checkins", nil)
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var list []goals.Checkin
	json.NewDecoder(w.Body).Decode(&list)
	if len(list) != 2 {
		t.Fatalf("expected 2 checkins, got %d", len(list))
	}
	// The store is expected to return newest first (enforced by DB ORDER BY).
	// Verify the handler preserves that order.
	if !list[0].CreatedAt.After(list[1].CreatedAt) {
		t.Errorf("expected checkins newest first: first=%v second=%v",
			list[0].CreatedAt, list[1].CreatedAt)
	}
}

func TestHandleGetCheckins_GoalNotFound(t *testing.T) {
	stub := &stubGoalStore{err: goals.ErrNotFound}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/goals/"+testGoalID().String()+"/checkins", nil)
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 when goal not found, got %d", w.Code)
	}
}

func TestHandleGetCheckins_ReturnsEmptyArray(t *testing.T) {
	stub := &stubGoalStore{checkins: []goals.Checkin{}}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/goals/"+testGoalID().String()+"/checkins", nil)
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
	var list []any
	json.NewDecoder(w.Body).Decode(&list)
	if list == nil {
		t.Error("expected [] not null for empty checkins list")
	}
}

// AC: Ownership isolation — user A cannot list user B's check-ins.

func TestHandleGetCheckins_OwnershipEnforced(t *testing.T) {
	stub := &stubGoalStore{err: goals.ErrNotFound}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/goals/"+testGoalID().String()+"/checkins", nil)
	req = withGoalUser(req, testGoalUserID2()) // different user

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 for cross-user checkin list, got %d", w.Code)
	}
}
