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
func (s *stubGoalStore) UpdateGoal(_ context.Context, _, _ uuid.UUID, title, _ string, _ *uuid.UUID, status goals.GoalStatus, _ *time.Time, _, _ *float64, _ string, _ int) (*goals.Goal, error) {
	s.lastTitle = title
	s.lastStatus = status
	return s.goal, s.err
}
func (s *stubGoalStore) DeleteGoal(_ context.Context, _, _ uuid.UUID) error { return s.err }

func (s *stubGoalStore) CreateMilestone(_ context.Context, _, _ uuid.UUID, title, _ string, _ int, _ *time.Time) (*goals.Milestone, error) {
	s.lastTitle = title
	return s.milestone, s.err
}
func (s *stubGoalStore) ListMilestones(_ context.Context, _, _ uuid.UUID) ([]goals.Milestone, error) {
	return s.msList, s.err
}
func (s *stubGoalStore) UpdateMilestone(_ context.Context, _, _ uuid.UUID, title, _ string, _ bool, _ int, _ *time.Time) (*goals.Milestone, error) {
	s.lastTitle = title
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
		t.Errorf("expected title 'Run a marathon', got %q", stub.lastTitle)
	}
}

func TestHandlePostGoal_MissingTitle(t *testing.T) {
	stub := &stubGoalStore{}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	body := `{"description":"no title here"}`
	req := httptest.NewRequest(http.MethodPost, "/goals", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422, got %d", w.Code)
	}
}

func TestHandlePostGoal_MeasurablePairValidation(t *testing.T) {
	stub := &stubGoalStore{}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	// Only current_value set — missing target_value.
	body := `{"title":"Weight loss","current_value":80}`
	req := httptest.NewRequest(http.MethodPost, "/goals", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422 for incomplete measurable pair, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHandlePostGoal_Unauthorized(t *testing.T) {
	stub := &stubGoalStore{}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	req := httptest.NewRequest(http.MethodPost, "/goals", bytes.NewBufferString(`{"title":"x"}`))
	req.Header.Set("Content-Type", "application/json")
	// No user context injected.

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
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
		t.Errorf("expected 200, got %d", w.Code)
	}
	var list []any
	json.NewDecoder(w.Body).Decode(&list)
	if list == nil {
		t.Error("expected [] not null")
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
		t.Errorf("expected 422 for invalid status, got %d", w.Code)
	}
}

func TestHandleGetGoals_StatusFilter_Valid(t *testing.T) {
	stub := &stubGoalStore{goalList: []goals.Goal{*sampleGoal()}}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/goals?status=active", nil)
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
	if stub.lastStatus != goals.StatusActive {
		t.Errorf("expected status filter 'active', got %q", stub.lastStatus)
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
		t.Errorf("unexpected title: %q", g.Title)
	}
}

func TestHandlePutGoal_InvalidStatus(t *testing.T) {
	stub := &stubGoalStore{goal: sampleGoal()}
	h := handlers.NewGoalHandlerWithStore(stub)
	router := makeGoalRouter(h)

	body := `{"title":"Updated","status":"invalid_status"}`
	req := httptest.NewRequest(http.MethodPut, "/goals/"+testGoalID().String(), bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = withGoalUser(req, testGoalUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422 for invalid status, got %d", w.Code)
	}
}

func TestHandlePutGoal_OwnershipEnforced(t *testing.T) {
	// stub returns ErrNotFound when the wrong user tries to update.
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
	if list[0].Position != 0 || list[1].Position != 1 || list[2].Position != 2 {
		t.Error("milestones not in position order")
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

// ─── Checkin tests ────────────────────────────────────────────────────────────

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
		t.Error("expected value_snapshot to be passed to store")
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
