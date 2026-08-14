package workout

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
)

type stubStore struct {
	session *Session
	set     *Set
	addErr  error
}

func (s *stubStore) StartSession(_ context.Context, _ uuid.UUID, title string) (*Session, error) {
	if s.session != nil {
		return s.session, nil
	}
	now := time.Now().UTC()
	if title == "" {
		title = "Workout"
	}
	return &Session{ID: uuid.New(), Title: title, StartedAt: now, CreatedAt: now, Sets: []Set{}}, nil
}
func (s *stubStore) GetOpenSession(context.Context, uuid.UUID) (*Session, error) {
	if s.session == nil {
		return nil, ErrNotFound
	}
	return s.session, nil
}
func (s *stubStore) GetSession(context.Context, uuid.UUID, uuid.UUID) (*Session, error) {
	if s.session == nil {
		return nil, ErrNotFound
	}
	return s.session, nil
}
func (s *stubStore) ListFinished(context.Context, uuid.UUID, int) ([]Session, error) {
	return []Session{}, nil
}
func (s *stubStore) AddSet(context.Context, uuid.UUID, uuid.UUID, string, int, *float64, *float64) (*Set, error) {
	if s.addErr != nil {
		return nil, s.addErr
	}
	return s.set, nil
}
func (s *stubStore) DeleteSet(context.Context, uuid.UUID, uuid.UUID) error { return nil }
func (s *stubStore) FinishSession(context.Context, uuid.UUID, uuid.UUID) (*Session, error) {
	if s.session == nil {
		return nil, ErrNotFound
	}
	if len(s.session.Sets) == 0 {
		return nil, ErrSessionEmpty
	}
	ended := time.Now().UTC()
	out := *s.session
	out.EndedAt = &ended
	return &out, nil
}

func router(store Store) http.Handler {
	r := chi.NewRouter()
	r.Mount("/workout", RoutesWithStore(store))
	return r
}

func withUser(r *http.Request, id uuid.UUID) *http.Request {
	return r.WithContext(auth.WithUserID(r.Context(), id))
}

func TestStartAndCurrentSession(t *testing.T) {
	user := uuid.MustParse("11111111-0000-0000-0000-000000000001")
	h := router(&stubStore{})
	req := httptest.NewRequest(http.MethodPost, "/workout/sessions", bytes.NewBufferString(`{"title":"Lower"}`))
	req = withUser(req, user)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("start %d %s", rec.Code, rec.Body.String())
	}
}

func TestFinishEmptySession(t *testing.T) {
	user := uuid.MustParse("11111111-0000-0000-0000-000000000001")
	id := uuid.MustParse("22222222-0000-0000-0000-000000000002")
	now := time.Now().UTC()
	h := router(&stubStore{session: &Session{ID: id, Title: "Workout", StartedAt: now, CreatedAt: now, Sets: []Set{}}})
	req := httptest.NewRequest(http.MethodPost, "/workout/sessions/"+id.String()+"/finish", nil)
	req = withUser(req, user)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status %d", rec.Code)
	}
}

func TestAddSetOnFinishedSession(t *testing.T) {
	user := uuid.MustParse("11111111-0000-0000-0000-000000000001")
	id := uuid.MustParse("22222222-0000-0000-0000-000000000002")
	h := router(&stubStore{addErr: ErrSessionClosed})
	req := httptest.NewRequest(http.MethodPost, "/workout/sessions/"+id.String()+"/sets", bytes.NewBufferString(`{"exercise_name":"Squat","reps":5,"load_kg":80}`))
	req = withUser(req, user)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusConflict {
		t.Fatalf("status %d", rec.Code)
	}
}

func TestAddSetOK(t *testing.T) {
	user := uuid.MustParse("11111111-0000-0000-0000-000000000001")
	id := uuid.MustParse("22222222-0000-0000-0000-000000000002")
	load := 80.0
	h := router(&stubStore{set: &Set{ID: uuid.New(), SessionID: id, ExerciseName: "Squat", Reps: 5, LoadKg: &load, CreatedAt: time.Now().UTC()}})
	req := httptest.NewRequest(http.MethodPost, "/workout/sessions/"+id.String()+"/sets", bytes.NewBufferString(`{"exercise_name":"Squat","reps":5,"load_kg":80}`))
	req = withUser(req, user)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("status %d %s", rec.Code, rec.Body.String())
	}
	var set Set
	if err := json.NewDecoder(rec.Body).Decode(&set); err != nil {
		t.Fatal(err)
	}
	if set.ExerciseName != "Squat" || set.Reps != 5 {
		t.Fatalf("set %+v", set)
	}
}
