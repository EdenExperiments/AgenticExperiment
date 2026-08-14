package mindtrack

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/auth"
)

type stubStore struct {
	mood    *MoodLog
	journal *JournalEntry
	moods   []MoodLog
}

func (s *stubStore) CreateMood(_ context.Context, _ uuid.UUID, valence, energy int, note string) (*MoodLog, error) {
	if valence < 1 || valence > 5 || energy < 1 || energy > 3 {
		return nil, ErrNotFound
	}
	return &MoodLog{ID: uuid.New(), LoggedAt: time.Now().UTC(), Valence: valence, Energy: energy, Note: note, CreatedAt: time.Now().UTC()}, nil
}
func (s *stubStore) ListMood(context.Context, uuid.UUID, int) ([]MoodLog, error) {
	if s.moods == nil {
		return []MoodLog{}, nil
	}
	return s.moods, nil
}
func (s *stubStore) CreateJournal(_ context.Context, _ uuid.UUID, body string) (*JournalEntry, error) {
	if strings.TrimSpace(body) == "" {
		return nil, ErrNotFound
	}
	now := time.Now().UTC()
	return &JournalEntry{ID: uuid.New(), Body: body, CreatedAt: now, UpdatedAt: now}, nil
}
func (s *stubStore) ListJournal(context.Context, uuid.UUID, int) ([]JournalEntry, error) {
	return []JournalEntry{}, nil
}
func (s *stubStore) UpdateJournal(context.Context, uuid.UUID, uuid.UUID, string) (*JournalEntry, error) {
	return nil, ErrNotFound
}
func (s *stubStore) DeleteJournal(context.Context, uuid.UUID, uuid.UUID) error { return ErrNotFound }

func router(store Store) http.Handler {
	r := chi.NewRouter()
	r.Mount("/mindtrack", RoutesWithStore(store))
	return r
}

func withUser(r *http.Request, id uuid.UUID) *http.Request {
	return r.WithContext(auth.WithUserID(r.Context(), id))
}

func TestCreateMoodOK(t *testing.T) {
	user := uuid.MustParse("11111111-0000-0000-0000-000000000001")
	h := router(&stubStore{})
	req := httptest.NewRequest(http.MethodPost, "/mindtrack/mood", bytes.NewBufferString(`{"valence":3,"energy":2,"note":"ok"}`))
	req = withUser(req, user)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("status %d %s", rec.Code, rec.Body.String())
	}
	var log MoodLog
	if err := json.NewDecoder(rec.Body).Decode(&log); err != nil {
		t.Fatal(err)
	}
	if log.Valence != 3 || log.Energy != 2 {
		t.Fatalf("mood %+v", log)
	}
}

func TestCreateJournalRequiresBody(t *testing.T) {
	user := uuid.MustParse("11111111-0000-0000-0000-000000000001")
	h := router(&stubStore{})
	req := httptest.NewRequest(http.MethodPost, "/mindtrack/journal", bytes.NewBufferString(`{"body":"   "}`))
	req = withUser(req, user)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status %d", rec.Code)
	}
}

func TestCreateJournalOK(t *testing.T) {
	user := uuid.MustParse("11111111-0000-0000-0000-000000000001")
	h := router(&stubStore{})
	req := httptest.NewRequest(http.MethodPost, "/mindtrack/journal", bytes.NewBufferString(`{"body":"quiet morning"}`))
	req = withUser(req, user)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("status %d %s", rec.Code, rec.Body.String())
	}
}

func TestNoAIClientImport(t *testing.T) {
	entries, err := os.ReadDir(".")
	if err != nil {
		t.Fatal(err)
	}
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".go") || strings.HasSuffix(entry.Name(), "_test.go") {
			continue
		}
		b, err := os.ReadFile(filepath.Join(".", entry.Name()))
		if err != nil {
			t.Fatal(err)
		}
		src := string(b)
		for _, needle := range []string{"internal/ai", "anthropic", "claude", "entitlements", "xp_events", "xpcurve"} {
			if strings.Contains(src, needle) {
				t.Errorf("%s must not mention %s", entry.Name(), needle)
			}
		}
	}
}
