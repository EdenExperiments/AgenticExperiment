package nutrilog

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/auth"
)

type stubOFF struct {
	hits []Food
	err  error
}

func (s stubOFF) Search(_ context.Context, _ string) ([]Food, error) {
	return s.hits, s.err
}

type memFoods struct {
	byUser map[uuid.UUID][]Food
}

func (m *memFoods) UpsertCachedFood(_ context.Context, userID uuid.UUID, f Food) (*Food, error) {
	if m.byUser == nil {
		m.byUser = map[uuid.UUID][]Food{}
	}
	if f.ID == uuid.Nil {
		f.ID = uuid.New()
	}
	list := m.byUser[userID]
	for i, existing := range list {
		if f.OffID != nil && existing.OffID != nil && *existing.OffID == *f.OffID {
			list[i] = f
			m.byUser[userID] = list
			cp := f
			return &cp, nil
		}
	}
	m.byUser[userID] = append(list, f)
	cp := f
	return &cp, nil
}

func (m *memFoods) CreateCustomFood(ctx context.Context, userID uuid.UUID, f Food) (*Food, error) {
	f.OffID = nil
	return m.UpsertCachedFood(ctx, userID, f)
}

func (m *memFoods) SearchCachedFoods(_ context.Context, userID uuid.UUID, query string) ([]Food, error) {
	out := []Food{}
	q := strings.ToLower(query)
	for _, f := range m.byUser[userID] {
		if strings.Contains(strings.ToLower(f.Name), q) {
			out = append(out, f)
		}
	}
	return out, nil
}

type memDiary struct {
	byUser map[uuid.UUID][]DiaryEntry
}

func (m *memDiary) CreateEntry(_ context.Context, userID uuid.UUID, e DiaryEntry) (*DiaryEntry, error) {
	if m.byUser == nil {
		m.byUser = map[uuid.UUID][]DiaryEntry{}
	}
	e.ID = uuid.New()
	m.byUser[userID] = append(m.byUser[userID], e)
	cp := e
	return &cp, nil
}

func (m *memDiary) ListEntriesOnDay(_ context.Context, userID uuid.UUID, day time.Time) ([]DiaryEntry, error) {
	start := time.Date(day.UTC().Year(), day.UTC().Month(), day.UTC().Day(), 0, 0, 0, 0, time.UTC)
	end := start.Add(24 * time.Hour)
	out := []DiaryEntry{}
	for _, e := range m.byUser[userID] {
		if !e.EatenAt.Before(start) && e.EatenAt.Before(end) {
			out = append(out, e)
		}
	}
	return out, nil
}

func (m *memDiary) DeleteEntry(_ context.Context, userID, id uuid.UUID) error {
	list := m.byUser[userID]
	for i, e := range list {
		if e.ID == id {
			m.byUser[userID] = append(list[:i], list[i+1:]...)
			return nil
		}
	}
	return ErrNotFound
}

func diaryHandler() (*Handler, *memGoals, *memDiary, *memFoods) {
	g := &memGoals{}
	d := &memDiary{}
	f := &memFoods{}
	h := NewHandler(&stubWeightStore{}, g)
	h.diary = d
	h.foods = f
	return h, g, d, f
}

func TestSearchFoods_DegradesToCacheWhenOFFDown(t *testing.T) {
	h, _, _, foods := diaryHandler()
	h.search = stubOFF{err: errors.New("down")}
	_, _ = foods.CreateCustomFood(context.Background(), testNutrilogUserID(), Food{Name: "Oat cache", Calories: 380})
	req := httptest.NewRequest(http.MethodGet, "/foods/search?q=oat", nil)
	req = req.WithContext(auth.WithUserID(req.Context(), testNutrilogUserID()))
	w := httptest.NewRecorder()
	h.HandleSearchFoods(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("status %d: %s", w.Code, w.Body.String())
	}
	var resp struct {
		Source string `json:"source"`
		Foods  []Food `json:"foods"`
	}
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.Source != "cache" || len(resp.Foods) != 1 {
		t.Fatalf("got %+v", resp)
	}
}

func TestDiarySnapshotDoesNotChangeWhenCacheUpdates(t *testing.T) {
	h, _, diary, foods := diaryHandler()
	offID := "123"
	user := testNutrilogUserID()
	body := `{"name":"Oats","calories":100,"protein_g":4,"carbs_g":18,"fat_g":2,"serving_qty":2,"off_id":"123"}`
	req := httptest.NewRequest(http.MethodPost, "/diary", bytes.NewBufferString(body))
	req = req.WithContext(auth.WithUserID(req.Context(), user))
	w := httptest.NewRecorder()
	h.HandlePostDiary(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("status %d: %s", w.Code, w.Body.String())
	}
	var entry DiaryEntry
	json.NewDecoder(w.Body).Decode(&entry)
	if entry.Calories != 200 {
		t.Fatalf("snapshot calories %d want 200", entry.Calories)
	}
	_, _ = foods.UpsertCachedFood(context.Background(), user, Food{OffID: &offID, Name: "Oats", Calories: 999})
	listed, _ := diary.ListEntriesOnDay(context.Background(), user, time.Now().UTC())
	if listed[0].Calories != 200 {
		t.Fatalf("history rewritten to %d", listed[0].Calories)
	}
}

func TestRemainingTodayIsGoalMinusDiarySnapshots(t *testing.T) {
	h, goals, _, _ := diaryHandler()
	user := testNutrilogUserID()
	_, _ = goals.UpsertGoals(context.Background(), user, Goals{CalorieGoal: 2000})
	post := httptest.NewRequest(http.MethodPost, "/diary", bytes.NewBufferString(`{"name":"Rice","calories":300,"protein_g":6,"carbs_g":60,"fat_g":1,"serving_qty":1}`))
	post = post.WithContext(auth.WithUserID(post.Context(), user))
	h.HandlePostDiary(httptest.NewRecorder(), post)

	req := httptest.NewRequest(http.MethodGet, "/remaining", nil)
	req = req.WithContext(auth.WithUserID(req.Context(), user))
	w := httptest.NewRecorder()
	h.HandleGetRemaining(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("status %d: %s", w.Code, w.Body.String())
	}
	var rem Remaining
	json.NewDecoder(w.Body).Decode(&rem)
	if rem.CaloriesEaten != 300 || rem.CaloriesRemaining != 1700 {
		t.Fatalf("got %+v", rem)
	}
}

func TestDiaryDeleteOtherUser404(t *testing.T) {
	h, _, _, _ := diaryHandler()
	user := testNutrilogUserID()
	post := httptest.NewRequest(http.MethodPost, "/diary", bytes.NewBufferString(`{"name":"Rice","calories":300,"protein_g":0,"carbs_g":0,"fat_g":0,"serving_qty":1}`))
	post = post.WithContext(auth.WithUserID(post.Context(), user))
	pw := httptest.NewRecorder()
	h.HandlePostDiary(pw, post)
	var entry DiaryEntry
	json.NewDecoder(pw.Body).Decode(&entry)

	req := httptest.NewRequest(http.MethodDelete, "/diary/"+entry.ID.String(), nil)
	req = req.WithContext(auth.WithUserID(req.Context(), testNutrilogUserID2()))
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", entry.ID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	w := httptest.NewRecorder()
	h.HandleDeleteDiary(w, req)
	if w.Code != http.StatusNotFound {
		t.Fatalf("status %d", w.Code)
	}
}

func TestCustomFoodIsPerUser(t *testing.T) {
	h, _, _, _ := diaryHandler()
	req := httptest.NewRequest(http.MethodPost, "/foods", bytes.NewBufferString(`{"name":"House oats","calories":380,"protein_g":13,"carbs_g":60,"fat_g":7}`))
	req = req.WithContext(auth.WithUserID(req.Context(), testNutrilogUserID()))
	w := httptest.NewRecorder()
	h.HandlePostFood(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("status %d: %s", w.Code, w.Body.String())
	}
}
