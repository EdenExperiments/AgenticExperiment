package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/handlers"
)

// errWeightLogNotFound mirrors nutrilog.ErrNotFound for stub injection in delete tests.
var errWeightLogNotFound = errors.New("not found")

// weightLogEntry mirrors the weight log JSON contract from task-01.
type weightLogEntry struct {
	ID         uuid.UUID `json:"id"`
	UserID     uuid.UUID `json:"user_id,omitempty"`
	WeightKg   float64   `json:"weight_kg"`
	Note       string    `json:"note"`
	MeasuredAt time.Time `json:"measured_at"`
	CreatedAt  time.Time `json:"created_at"`
}

// ─── Stub store ───────────────────────────────────────────────────────────────

type stubNutrilogWeightStore struct {
	logs      []weightLogEntry
	created   *weightLogEntry
	err       error
	lastLimit int

	lastWeightKg   float64
	lastNote       string
	lastMeasuredAt time.Time
}

func (s *stubNutrilogWeightStore) CreateWeightLog(_ context.Context, _ uuid.UUID, weightKg float64, note string, measuredAt time.Time) (*weightLogEntry, error) {
	s.lastWeightKg = weightKg
	s.lastNote = note
	s.lastMeasuredAt = measuredAt
	if s.err != nil {
		return nil, s.err
	}
	if s.created != nil {
		return s.created, nil
	}
	return &weightLogEntry{
		ID:         uuid.New(),
		WeightKg:   weightKg,
		Note:       note,
		MeasuredAt: measuredAt,
		CreatedAt:  time.Now().UTC(),
	}, nil
}

func (s *stubNutrilogWeightStore) ListWeightLogs(_ context.Context, _ uuid.UUID, limit int) ([]weightLogEntry, error) {
	s.lastLimit = limit
	if s.err != nil {
		return nil, s.err
	}
	logs := s.logs
	if limit > 0 && limit < len(logs) {
		return logs[:limit], nil
	}
	return logs, nil
}

func (s *stubNutrilogWeightStore) GetWeightLogsInRange(_ context.Context, _ uuid.UUID, _ int) ([]weightLogEntry, error) {
	if s.err != nil {
		return nil, s.err
	}
	return s.logs, nil
}

func (s *stubNutrilogWeightStore) DeleteWeightLog(_ context.Context, _, _ uuid.UUID) error {
	return s.err
}

// ─── Helpers ────────────────────────────────────────────────────────────────

func testNutrilogUserID() uuid.UUID  { return uuid.MustParse("11111111-0000-0000-0000-000000000001") }
func testNutrilogUserID2() uuid.UUID { return uuid.MustParse("cccccccc-0000-0000-0000-000000000003") }
func testWeightLogID() uuid.UUID     { return uuid.MustParse("aaaaaaaa-0000-0000-0000-000000000001") }

func makeNutrilogWeightRouter(h *handlers.NutrilogWeightHandler) http.Handler {
	r := chi.NewRouter()
	r.Post("/nutrilog/weight-logs", h.HandlePostWeightLog)
	r.Get("/nutrilog/weight-logs", h.HandleGetWeightLogs)
	r.Get("/nutrilog/weight-chart", h.HandleGetWeightChart)
	r.Delete("/nutrilog/weight-logs/{id}", h.HandleDeleteWeightLog)
	return r
}

func withNutrilogUser(r *http.Request, userID uuid.UUID) *http.Request {
	return r.WithContext(auth.WithUserID(r.Context(), userID))
}

func weightLogDeleteRequest(logID, userID uuid.UUID) *http.Request {
	req := httptest.NewRequest(http.MethodDelete, "/nutrilog/weight-logs/"+logID.String(), nil)
	req = withNutrilogUser(req, userID)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", logID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	return req
}

func sampleWeightLog() *weightLogEntry {
	measured := time.Now().UTC().Truncate(time.Second).Add(-time.Hour)
	return &weightLogEntry{
		ID:         testWeightLogID(),
		UserID:     testNutrilogUserID(),
		WeightKg:   72.5,
		Note:       "morning weigh-in",
		MeasuredAt: measured,
		CreatedAt:  measured,
	}
}

// ─── AC-2: POST /nutrilog/weight-logs ───────────────────────────────────────

func TestHandlePostWeightLog_OK(t *testing.T) {
	stub := &stubNutrilogWeightStore{created: sampleWeightLog()}
	h := handlers.NewNutrilogWeightHandlerWithStore(stub)
	router := makeNutrilogWeightRouter(h)

	// Use a recent timestamp relative to now so the handler's 30-day recency
	// window does not reject an otherwise-valid log as the calendar advances.
	measuredAt := time.Now().UTC().AddDate(0, 0, -1).Format(time.RFC3339)
	body := `{"weight_kg":72.5,"note":"morning weigh-in","measured_at":"` + measuredAt + `"}`
	req := httptest.NewRequest(http.MethodPost, "/nutrilog/weight-logs", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = withNutrilogUser(req, testNutrilogUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var resp weightLogEntry
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if resp.ID != testWeightLogID() {
		t.Errorf("id: got %s want %s", resp.ID, testWeightLogID())
	}
	if resp.WeightKg != 72.5 {
		t.Errorf("weight_kg: got %v want 72.5", resp.WeightKg)
	}
	if resp.Note != "morning weigh-in" {
		t.Errorf("note: got %q want %q", resp.Note, "morning weigh-in")
	}
	if resp.MeasuredAt.IsZero() || resp.CreatedAt.IsZero() {
		t.Error("measured_at and created_at must be present in response")
	}
}

func TestHandlePostWeightLog_Unauthorized(t *testing.T) {
	h := handlers.NewNutrilogWeightHandlerWithStore(&stubNutrilogWeightStore{})
	router := makeNutrilogWeightRouter(h)

	body := `{"weight_kg":72.5}`
	req := httptest.NewRequest(http.MethodPost, "/nutrilog/weight-logs", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestHandlePostWeightLog_RejectsNonPositiveWeight(t *testing.T) {
	h := handlers.NewNutrilogWeightHandlerWithStore(&stubNutrilogWeightStore{})
	router := makeNutrilogWeightRouter(h)

	body := `{"weight_kg":0}`
	req := httptest.NewRequest(http.MethodPost, "/nutrilog/weight-logs", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = withNutrilogUser(req, testNutrilogUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422 for non-positive weight_kg, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHandlePostWeightLog_RejectsMeasuredAtOlderThan30Days(t *testing.T) {
	h := handlers.NewNutrilogWeightHandlerWithStore(&stubNutrilogWeightStore{})
	router := makeNutrilogWeightRouter(h)

	old := time.Now().UTC().AddDate(0, 0, -31).Format(time.RFC3339)
	body := `{"weight_kg":72.5,"measured_at":"` + old + `"}`
	req := httptest.NewRequest(http.MethodPost, "/nutrilog/weight-logs", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = withNutrilogUser(req, testNutrilogUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422 for measured_at older than 30 days, got %d: %s", w.Code, w.Body.String())
	}
}

// ─── AC-3: GET /nutrilog/weight-logs ────────────────────────────────────────

func TestHandleGetWeightLogs_ReturnsNewestMeasuredAtFirst(t *testing.T) {
	older := time.Date(2026, 6, 10, 8, 0, 0, 0, time.UTC)
	newer := time.Date(2026, 6, 12, 8, 0, 0, 0, time.UTC)
	stub := &stubNutrilogWeightStore{logs: []weightLogEntry{
		{ID: uuid.New(), WeightKg: 71.0, MeasuredAt: older, CreatedAt: older},
		{ID: uuid.New(), WeightKg: 72.5, MeasuredAt: newer, CreatedAt: newer},
	}}
	h := handlers.NewNutrilogWeightHandlerWithStore(stub)
	router := makeNutrilogWeightRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/nutrilog/weight-logs", nil)
	req = withNutrilogUser(req, testNutrilogUserID())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp []weightLogEntry
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(resp) != 2 {
		t.Fatalf("expected 2 logs, got %d", len(resp))
	}
	if !resp[0].MeasuredAt.Equal(newer) {
		t.Errorf("first entry measured_at: got %v want %v (newest first)", resp[0].MeasuredAt, newer)
	}
	if !resp[1].MeasuredAt.Equal(older) {
		t.Errorf("second entry measured_at: got %v want %v", resp[1].MeasuredAt, older)
	}
}

func TestHandleGetWeightLogs_Unauthorized(t *testing.T) {
	h := handlers.NewNutrilogWeightHandlerWithStore(&stubNutrilogWeightStore{})
	router := makeNutrilogWeightRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/nutrilog/weight-logs", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestHandleGetWeightLogs_DefaultLimit50(t *testing.T) {
	stub := &stubNutrilogWeightStore{}
	h := handlers.NewNutrilogWeightHandlerWithStore(stub)
	router := makeNutrilogWeightRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/nutrilog/weight-logs", nil)
	req = withNutrilogUser(req, testNutrilogUserID())
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	if stub.lastLimit != 50 {
		t.Errorf("default limit: got %d want 50", stub.lastLimit)
	}
}

func TestHandleGetWeightLogs_CapsLimitAt200(t *testing.T) {
	stub := &stubNutrilogWeightStore{}
	h := handlers.NewNutrilogWeightHandlerWithStore(stub)
	router := makeNutrilogWeightRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/nutrilog/weight-logs?limit=500", nil)
	req = withNutrilogUser(req, testNutrilogUserID())
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	if stub.lastLimit != 200 {
		t.Errorf("limit cap: got %d want 200", stub.lastLimit)
	}
}

// ─── AC-4: GET /nutrilog/weight-chart ───────────────────────────────────────

func TestHandleGetWeightChart_Returns30DaysAscending(t *testing.T) {
	today := time.Now().UTC().Truncate(24 * time.Hour)
	stub := &stubNutrilogWeightStore{logs: []weightLogEntry{
		{ID: uuid.New(), WeightKg: 70.0, MeasuredAt: today.AddDate(0, 0, -2), CreatedAt: today},
		{ID: uuid.New(), WeightKg: 72.5, MeasuredAt: today, CreatedAt: today},
	}}
	h := handlers.NewNutrilogWeightHandlerWithStore(stub)
	router := makeNutrilogWeightRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/nutrilog/weight-chart?days=30", nil)
	req = withNutrilogUser(req, testNutrilogUserID())
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}

	days, _ := resp["days"].(float64)
	if int(days) != 30 {
		t.Errorf("days: got %v want 30", days)
	}
	if unit, _ := resp["unit"].(string); unit != "kg" {
		t.Errorf("unit: got %q want kg", unit)
	}

	data, ok := resp["data"].([]interface{})
	if !ok {
		t.Fatal("data field missing or wrong type")
	}
	if len(data) != 30 {
		t.Errorf("data length: got %d want 30", len(data))
	}

	var prevDate string
	for i, entry := range data {
		item, _ := entry.(map[string]interface{})
		date, _ := item["date"].(string)
		if date == "" {
			t.Errorf("entry[%d]: missing date", i)
			continue
		}
		if prevDate != "" && date <= prevDate {
			t.Errorf("dates not ascending: entry[%d] %q <= entry[%d] %q", i, date, i-1, prevDate)
		}
		prevDate = date
	}
}

func TestHandleGetWeightChart_NullFillForMissingDays(t *testing.T) {
	today := time.Now().UTC().Truncate(24 * time.Hour)
	stub := &stubNutrilogWeightStore{logs: []weightLogEntry{
		{ID: uuid.New(), WeightKg: 72.5, MeasuredAt: today.AddDate(0, 0, -10), CreatedAt: today},
	}}
	h := handlers.NewNutrilogWeightHandlerWithStore(stub)
	router := makeNutrilogWeightRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/nutrilog/weight-chart?days=30", nil)
	req = withNutrilogUser(req, testNutrilogUserID())
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}

	data, _ := resp["data"].([]interface{})
	nullCount := 0
	nonNullCount := 0
	for _, entry := range data {
		item, _ := entry.(map[string]interface{})
		if item["weight_kg"] == nil {
			nullCount++
		} else {
			nonNullCount++
		}
	}
	if nullCount != 29 {
		t.Errorf("null-fill days: got %d want 29", nullCount)
	}
	if nonNullCount != 1 {
		t.Errorf("logged days: got %d want 1", nonNullCount)
	}
}

func TestHandleGetWeightChart_UsesLatestLogOnSameDay(t *testing.T) {
	day := time.Now().UTC().Truncate(24 * time.Hour).AddDate(0, 0, -1)
	stub := &stubNutrilogWeightStore{logs: []weightLogEntry{
		{ID: uuid.New(), WeightKg: 71.0, MeasuredAt: day.Add(8 * time.Hour), CreatedAt: day},
		{ID: uuid.New(), WeightKg: 72.5, MeasuredAt: day.Add(18 * time.Hour), CreatedAt: day},
	}}
	h := handlers.NewNutrilogWeightHandlerWithStore(stub)
	router := makeNutrilogWeightRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/nutrilog/weight-chart?days=7", nil)
	req = withNutrilogUser(req, testNutrilogUserID())
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}

	targetDate := day.Format("2006-01-02")
	data, _ := resp["data"].([]interface{})
	for _, entry := range data {
		item, _ := entry.(map[string]interface{})
		if item["date"] != targetDate {
			continue
		}
		weight, ok := item["weight_kg"].(float64)
		if !ok {
			t.Fatalf("expected weight_kg for %s, got %v", targetDate, item["weight_kg"])
		}
		if weight != 72.5 {
			t.Errorf("same-day latest weight: got %v want 72.5", weight)
		}
		return
	}
	t.Fatalf("no chart entry for date %s", targetDate)
}

func TestHandleGetWeightChart_CapsDaysAt365(t *testing.T) {
	stub := &stubNutrilogWeightStore{}
	h := handlers.NewNutrilogWeightHandlerWithStore(stub)
	router := makeNutrilogWeightRouter(h)

	req := httptest.NewRequest(http.MethodGet, "/nutrilog/weight-chart?days=999", nil)
	req = withNutrilogUser(req, testNutrilogUserID())
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	days, _ := resp["days"].(float64)
	if int(days) != 365 {
		t.Errorf("days cap: got %v want 365", days)
	}
	data, _ := resp["data"].([]interface{})
	if len(data) != 365 {
		t.Errorf("data length: got %d want 365", len(data))
	}
}

// ─── AC-5: DELETE /nutrilog/weight-logs/{id} ────────────────────────────────

func TestHandleDeleteWeightLog_OK(t *testing.T) {
	stub := &stubNutrilogWeightStore{}
	h := handlers.NewNutrilogWeightHandlerWithStore(stub)
	router := makeNutrilogWeightRouter(h)

	req := weightLogDeleteRequest(testWeightLogID(), testNutrilogUserID())
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHandleDeleteWeightLog_NotFoundForOtherUser(t *testing.T) {
	stub := &stubNutrilogWeightStore{err: errWeightLogNotFound}
	h := handlers.NewNutrilogWeightHandlerWithStore(stub)
	router := makeNutrilogWeightRouter(h)

	req := weightLogDeleteRequest(testWeightLogID(), testNutrilogUserID2())
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for other user's log, got %d", w.Code)
	}
}
