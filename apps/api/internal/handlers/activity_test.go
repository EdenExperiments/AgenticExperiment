package handlers_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/handlers"
	"github.com/meden/rpgtracker/internal/skills"
)

// stubActivityStore implements ActivityStore for tests.
type stubActivityStore struct {
	events      []skills.ActivityEvent
	err         error
	lastSkillID *uuid.UUID // captures the skillID passed to GetRecentActivity
}

func (s *stubActivityStore) GetRecentActivity(_ context.Context, _ uuid.UUID, skillID *uuid.UUID, limit int) ([]skills.ActivityEvent, error) {
	s.lastSkillID = skillID
	if s.err != nil {
		return nil, s.err
	}
	events := s.events
	if skillID != nil {
		var filtered []skills.ActivityEvent
		for _, e := range events {
			if e.SkillID == *skillID {
				filtered = append(filtered, e)
			}
		}
		events = filtered
	}
	if limit < len(events) {
		return events[:limit], nil
	}
	return events, nil
}

func TestHandleGetActivity_ReturnsEvents(t *testing.T) {
	userID := uuid.New()
	events := []skills.ActivityEvent{
		{ID: uuid.New(), SkillID: uuid.New(), SkillName: "Guitar", XPDelta: 25, LogNote: "Practice", CreatedAt: time.Now()},
		{ID: uuid.New(), SkillID: uuid.New(), SkillName: "Running", XPDelta: 50, LogNote: "", CreatedAt: time.Now()},
	}
	store := &stubActivityStore{events: events}
	h := handlers.NewActivityHandlerWithStore(store)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/activity", nil)
	req = req.WithContext(userCtx(userID))
	w := httptest.NewRecorder()
	h.HandleGetActivity(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp []skills.ActivityEvent
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}
	if len(resp) != 2 {
		t.Fatalf("expected 2 events, got %d", len(resp))
	}
	if resp[0].SkillName != "Guitar" {
		t.Errorf("expected Guitar, got %s", resp[0].SkillName)
	}
	if resp[0].XPDelta != 25 {
		t.Errorf("expected 25, got %d", resp[0].XPDelta)
	}
}

func TestHandleGetActivity_Unauthorized(t *testing.T) {
	h := handlers.NewActivityHandlerWithStore(&stubActivityStore{})
	req := httptest.NewRequest(http.MethodGet, "/api/v1/activity", nil)
	w := httptest.NewRecorder()
	h.HandleGetActivity(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestHandleGetActivity_RespectsLimitParam(t *testing.T) {
	userID := uuid.New()
	events := make([]skills.ActivityEvent, 10)
	for i := range events {
		events[i] = skills.ActivityEvent{ID: uuid.New(), SkillID: uuid.New(), SkillName: "Skill", XPDelta: 10, CreatedAt: time.Now()}
	}
	store := &stubActivityStore{events: events}
	h := handlers.NewActivityHandlerWithStore(store)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/activity?limit=5", nil)
	req = req.WithContext(userCtx(userID))
	w := httptest.NewRecorder()
	h.HandleGetActivity(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp []skills.ActivityEvent
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}
	if len(resp) != 5 {
		t.Fatalf("expected 5 events, got %d", len(resp))
	}
}

func TestHandleGetActivity_ReturnsEmptyArray(t *testing.T) {
	userID := uuid.New()
	store := &stubActivityStore{events: []skills.ActivityEvent{}}
	h := handlers.NewActivityHandlerWithStore(store)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/activity", nil)
	req = req.WithContext(userCtx(userID))
	w := httptest.NewRecorder()
	h.HandleGetActivity(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	body := w.Body.String()
	var resp []skills.ActivityEvent
	if err := json.Unmarshal([]byte(body), &resp); err != nil {
		t.Fatal(err)
	}
	if len(resp) != 0 {
		t.Fatalf("expected empty array, got %d events", len(resp))
	}
}

func TestHandleGetActivity_FiltersbySkillID(t *testing.T) {
	userID := uuid.New()
	skillA := uuid.New()
	skillB := uuid.New()
	events := []skills.ActivityEvent{
		{ID: uuid.New(), SkillID: skillA, SkillName: "Guitar", XPDelta: 25, CreatedAt: time.Now()},
		{ID: uuid.New(), SkillID: skillB, SkillName: "Running", XPDelta: 50, CreatedAt: time.Now()},
		{ID: uuid.New(), SkillID: skillA, SkillName: "Guitar", XPDelta: 10, CreatedAt: time.Now()},
	}
	store := &stubActivityStore{events: events}
	h := handlers.NewActivityHandlerWithStore(store)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/activity?skill_id="+skillA.String(), nil)
	req = req.WithContext(userCtx(userID))
	w := httptest.NewRecorder()
	h.HandleGetActivity(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp []skills.ActivityEvent
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}
	if len(resp) != 2 {
		t.Fatalf("expected 2 filtered events, got %d", len(resp))
	}
	for _, e := range resp {
		if e.SkillName != "Guitar" {
			t.Errorf("expected Guitar, got %s", e.SkillName)
		}
	}

	// Verify skillID was passed to store
	if store.lastSkillID == nil {
		t.Fatal("expected skillID to be passed to store, got nil")
	}
	if *store.lastSkillID != skillA {
		t.Fatalf("expected skillID %s, got %s", skillA, *store.lastSkillID)
	}
}
