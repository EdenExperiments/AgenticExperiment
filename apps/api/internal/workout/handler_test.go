package workout

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/auth"
)

func testRouter(h *Handler) http.Handler {
	r := chi.NewRouter()
	r.Mount("/", RoutesFor(h))
	return r
}

func RoutesFor(h *Handler) chi.Router {
	r := chi.NewRouter()
	r.Post("/sessions", h.CreateSession)
	r.Get("/sessions", h.ListSessions)
	r.Get("/sessions/{id}", h.GetSession)
	r.Post("/sessions/{id}/abandon", h.AbandonSession)
	r.Post("/sessions/{id}/finish", h.FinishSession)
	r.Post("/sessions/{id}/exercises", h.AddExercise)
	r.Post("/exercises/{id}/sets", h.AddSet)
	r.Get("/volume-chart", h.VolumeChart)
	return r
}

func authed(r *http.Request, userID uuid.UUID) *http.Request {
	return r.WithContext(auth.WithUserID(r.Context(), userID))
}

func doJSON(t *testing.T, h http.Handler, userID uuid.UUID, method, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			t.Fatal(err)
		}
	}
	req := httptest.NewRequest(method, path, &buf)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, authed(req, userID))
	return w
}

func decodeSession(t *testing.T, w *httptest.ResponseRecorder) Session {
	t.Helper()
	var sess Session
	if err := json.NewDecoder(w.Body).Decode(&sess); err != nil {
		t.Fatalf("decode: %v body=%s", err, w.Body.String())
	}
	return sess
}

func TestCreateSession_InProgress(t *testing.T) {
	user := uuid.New()
	h := NewHandler(NewMemStore())
	w := doJSON(t, testRouter(h), user, http.MethodPost, "/sessions", map[string]any{})
	if w.Code != http.StatusCreated {
		t.Fatalf("status %d: %s", w.Code, w.Body.String())
	}
	sess := decodeSession(t, w)
	if sess.Status != StatusInProgress {
		t.Fatalf("status %q", sess.Status)
	}
}

func TestAddExerciseAndSetThenFinishVolume(t *testing.T) {
	user := uuid.New()
	store := NewMemStore()
	rt := testRouter(NewHandler(store))

	w := doJSON(t, rt, user, http.MethodPost, "/sessions", map[string]any{})
	sess := decodeSession(t, w)

	w = doJSON(t, rt, user, http.MethodPost, "/sessions/"+sess.ID.String()+"/exercises", map[string]any{"name": "Squat"})
	if w.Code != http.StatusCreated {
		t.Fatalf("add exercise %d: %s", w.Code, w.Body.String())
	}
	var ex Exercise
	if err := json.NewDecoder(w.Body).Decode(&ex); err != nil {
		t.Fatal(err)
	}
	if ex.Position != 0 {
		t.Fatalf("position %d", ex.Position)
	}

	w = doJSON(t, rt, user, http.MethodPost, "/exercises/"+ex.ID.String()+"/sets", map[string]any{"reps": 5, "load_kg": 100, "rpe": 8})
	if w.Code != http.StatusCreated {
		t.Fatalf("add loaded set %d: %s", w.Code, w.Body.String())
	}
	w = doJSON(t, rt, user, http.MethodPost, "/exercises/"+ex.ID.String()+"/sets", map[string]any{"reps": 8})
	if w.Code != http.StatusCreated {
		t.Fatalf("add bodyweight set %d: %s", w.Code, w.Body.String())
	}

	w = doJSON(t, rt, user, http.MethodPost, "/sessions/"+sess.ID.String()+"/finish", nil)
	if w.Code != http.StatusOK {
		t.Fatalf("finish %d: %s", w.Code, w.Body.String())
	}
	done := decodeSession(t, w)
	if done.Status != StatusCompleted {
		t.Fatalf("status %q", done.Status)
	}
	if done.VolumeKg != 500 {
		t.Fatalf("volume %v want 500 (bodyweight set must not add kg)", done.VolumeKg)
	}
	if len(done.Exercises) != 1 || len(done.Exercises[0].Sets) != 2 {
		t.Fatalf("history must keep reps-only sets: %+v", done.Exercises)
	}
}

func TestSetValidation(t *testing.T) {
	user := uuid.New()
	rt := testRouter(NewHandler(NewMemStore()))
	w := doJSON(t, rt, user, http.MethodPost, "/sessions", map[string]any{})
	sess := decodeSession(t, w)
	w = doJSON(t, rt, user, http.MethodPost, "/sessions/"+sess.ID.String()+"/exercises", map[string]any{"name": "Bench"})
	var ex Exercise
	json.NewDecoder(w.Body).Decode(&ex)

	cases := []struct {
		body map[string]any
	}{
		{map[string]any{"reps": 0}},
		{map[string]any{"reps": 5, "load_kg": 0}},
		{map[string]any{"reps": 5, "rpe": 0}},
		{map[string]any{"reps": 5, "rpe": 11}},
	}
	for _, tc := range cases {
		w = doJSON(t, rt, user, http.MethodPost, "/exercises/"+ex.ID.String()+"/sets", tc.body)
		if w.Code != http.StatusUnprocessableEntity {
			t.Fatalf("body %+v status %d want 422", tc.body, w.Code)
		}
	}
}

func TestAbandonDoesNotFabricateSetsAndIsolation404(t *testing.T) {
	owner := uuid.New()
	other := uuid.New()
	rt := testRouter(NewHandler(NewMemStore()))

	w := doJSON(t, rt, owner, http.MethodPost, "/sessions", map[string]any{})
	sess := decodeSession(t, w)
	w = doJSON(t, rt, owner, http.MethodPost, "/sessions/"+sess.ID.String()+"/abandon", nil)
	if w.Code != http.StatusOK {
		t.Fatalf("abandon %d: %s", w.Code, w.Body.String())
	}
	done := decodeSession(t, w)
	if done.Status != StatusAbandoned {
		t.Fatalf("status %q", done.Status)
	}
	if len(done.Exercises) != 0 {
		t.Fatalf("abandon fabricated sets: %+v", done.Exercises)
	}

	w = doJSON(t, rt, other, http.MethodGet, "/sessions/"+sess.ID.String(), nil)
	if w.Code != http.StatusNotFound {
		t.Fatalf("other user get status %d want 404", w.Code)
	}
}

func TestHistoryNewestFirst(t *testing.T) {
	user := uuid.New()
	rt := testRouter(NewHandler(NewMemStore()))
	doJSON(t, rt, user, http.MethodPost, "/sessions", map[string]any{})
	doJSON(t, rt, user, http.MethodPost, "/sessions", map[string]any{})
	w := doJSON(t, rt, user, http.MethodGet, "/sessions", nil)
	if w.Code != http.StatusOK {
		t.Fatalf("list %d: %s", w.Code, w.Body.String())
	}
	var list []Session
	if err := json.NewDecoder(w.Body).Decode(&list); err != nil {
		t.Fatal(err)
	}
	if len(list) != 2 {
		t.Fatalf("len %d", len(list))
	}
	if !list[0].StartedAt.After(list[1].StartedAt) && !list[0].StartedAt.Equal(list[1].StartedAt) {
		t.Fatalf("expected newest first")
	}
}

func TestRepeatFinishConflicts(t *testing.T) {
	user := uuid.New()
	rt := testRouter(NewHandler(NewMemStore()))
	w := doJSON(t, rt, user, http.MethodPost, "/sessions", map[string]any{})
	sess := decodeSession(t, w)
	doJSON(t, rt, user, http.MethodPost, "/sessions/"+sess.ID.String()+"/finish", nil)
	w = doJSON(t, rt, user, http.MethodPost, "/sessions/"+sess.ID.String()+"/finish", nil)
	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("repeat finish %d want 422", w.Code)
	}
}

func TestVolumeChartHasDailyPoints(t *testing.T) {
	user := uuid.New()
	rt := testRouter(NewHandler(NewMemStore()))
	w := doJSON(t, rt, user, http.MethodGet, "/volume-chart?days=7", nil)
	if w.Code != http.StatusOK {
		t.Fatalf("chart %d: %s", w.Code, w.Body.String())
	}
	var payload struct {
		Days int           `json:"days"`
		Data []VolumePoint `json:"data"`
	}
	if err := json.NewDecoder(w.Body).Decode(&payload); err != nil {
		t.Fatal(err)
	}
	if payload.Days != 7 || len(payload.Data) != 7 {
		t.Fatalf("days=%d len=%d", payload.Days, len(payload.Data))
	}
}

func TestUnauthorized(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/sessions", nil)
	w := httptest.NewRecorder()
	testRouter(NewHandler(NewMemStore())).ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("status %d", w.Code)
	}
}
