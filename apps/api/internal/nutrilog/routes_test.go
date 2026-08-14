package nutrilog

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

type stubKitchen struct {
	fast     *Fast
	pantry   []PantryItem
	recipes  []Recipe
	diary    []DiaryEntry
	cookErr  error
	openErr  error
	created  *PantryItem
	recipe   *Recipe
	entry    *DiaryEntry
}

func (s *stubKitchen) OpenFast(_ context.Context, _ uuid.UUID, hours int) (*Fast, error) {
	if s.openErr != nil {
		return nil, s.openErr
	}
	if s.fast != nil {
		return s.fast, nil
	}
	now := time.Now().UTC()
	return &Fast{ID: uuid.New(), StartedAt: now, TargetHours: hours, CreatedAt: now}, nil
}
func (s *stubKitchen) GetOpenFast(context.Context, uuid.UUID) (*Fast, error) {
	if s.fast == nil {
		return nil, ErrNotFound
	}
	return s.fast, nil
}
func (s *stubKitchen) CloseFast(context.Context, uuid.UUID, uuid.UUID, string) (*Fast, error) {
	if s.fast == nil {
		return nil, ErrNotFound
	}
	ended := time.Now().UTC()
	out := *s.fast
	out.EndedAt = &ended
	reason := "completed"
	out.EndReason = &reason
	mins := 90
	out.DurationMin = &mins
	return &out, nil
}
func (s *stubKitchen) ListFasts(context.Context, uuid.UUID, int) ([]Fast, error) {
	if s.fast == nil {
		return []Fast{}, nil
	}
	return []Fast{*s.fast}, nil
}
func (s *stubKitchen) ListPantry(context.Context, uuid.UUID) ([]PantryItem, error) {
	if s.pantry == nil {
		return []PantryItem{}, nil
	}
	return s.pantry, nil
}
func (s *stubKitchen) AddPantryItem(_ context.Context, _ uuid.UUID, name, amount string) (*PantryItem, error) {
	item := &PantryItem{ID: uuid.New(), Name: name, AmountText: amount, CreatedAt: time.Now().UTC()}
	s.created = item
	return item, nil
}
func (s *stubKitchen) DeletePantryItem(context.Context, uuid.UUID, uuid.UUID) error { return nil }
func (s *stubKitchen) ListRecipes(context.Context, uuid.UUID) ([]Recipe, error) {
	if s.recipes == nil {
		return []Recipe{}, nil
	}
	return s.recipes, nil
}
func (s *stubKitchen) CreateRecipe(_ context.Context, _ uuid.UUID, recipe Recipe) (*Recipe, error) {
	recipe.ID = uuid.New()
	recipe.CreatedAt = time.Now().UTC()
	recipe.UpdatedAt = recipe.CreatedAt
	s.recipe = &recipe
	return s.recipe, nil
}
func (s *stubKitchen) DeleteRecipe(context.Context, uuid.UUID, uuid.UUID) error { return nil }
func (s *stubKitchen) CookRecipe(context.Context, uuid.UUID, uuid.UUID, float64) (*DiaryEntry, error) {
	if s.cookErr != nil {
		return nil, s.cookErr
	}
	return s.entry, nil
}
func (s *stubKitchen) ListDiary(context.Context, uuid.UUID, int) ([]DiaryEntry, error) {
	if s.diary == nil {
		return []DiaryEntry{}, nil
	}
	return s.diary, nil
}

func kitchenRouter(store KitchenStore) http.Handler {
	r := chi.NewRouter()
	r.Mount("/nutrilog", RoutesWithStore(store))
	return r
}

func withUser(r *http.Request, id uuid.UUID) *http.Request {
	return r.WithContext(auth.WithUserID(r.Context(), id))
}

func TestStartFastOK(t *testing.T) {
	user := uuid.MustParse("11111111-0000-0000-0000-000000000001")
	router := kitchenRouter(&stubKitchen{})
	req := httptest.NewRequest(http.MethodPost, "/nutrilog/fasts", bytes.NewBufferString(`{"target_hours":16}`))
	req.Header.Set("Content-Type", "application/json")
	req = withUser(req, user)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
	var fast Fast
	if err := json.NewDecoder(rec.Body).Decode(&fast); err != nil {
		t.Fatal(err)
	}
	if fast.TargetHours != 16 {
		t.Fatalf("target %d", fast.TargetHours)
	}
}

func TestStartFastRejectsIllegalHours(t *testing.T) {
	user := uuid.MustParse("11111111-0000-0000-0000-000000000001")
	router := kitchenRouter(&stubKitchen{openErr: ErrInvalidTarget})
	req := httptest.NewRequest(http.MethodPost, "/nutrilog/fasts", bytes.NewBufferString(`{"target_hours":48}`))
	req = withUser(req, user)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status %d", rec.Code)
	}
}

func TestCurrentFastNoContent(t *testing.T) {
	user := uuid.MustParse("11111111-0000-0000-0000-000000000001")
	router := kitchenRouter(&stubKitchen{})
	req := httptest.NewRequest(http.MethodGet, "/nutrilog/fasts/current", nil)
	req = withUser(req, user)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("status %d", rec.Code)
	}
}

func TestCookEmptyPantry(t *testing.T) {
	user := uuid.MustParse("11111111-0000-0000-0000-000000000001")
	router := kitchenRouter(&stubKitchen{cookErr: ErrEmptyPantry})
	body := `{"recipe_id":"22222222-0000-0000-0000-000000000002","servings":1}`
	req := httptest.NewRequest(http.MethodPost, "/nutrilog/cook", bytes.NewBufferString(body))
	req = withUser(req, user)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
	var payload map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
		t.Fatal(err)
	}
	if payload["error"] != "empty_pantry" {
		t.Fatalf("error %q", payload["error"])
	}
}

func TestAddPantryAndCreateRecipe(t *testing.T) {
	user := uuid.MustParse("11111111-0000-0000-0000-000000000001")
	stub := &stubKitchen{}
	router := kitchenRouter(stub)

	req := httptest.NewRequest(http.MethodPost, "/nutrilog/pantry", bytes.NewBufferString(`{"name":"eggs","amount_text":"6"}`))
	req = withUser(req, user)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("pantry status %d", rec.Code)
	}

	req = httptest.NewRequest(http.MethodPost, "/nutrilog/recipes", bytes.NewBufferString(`{"title":"Omelette","servings":1,"ingredients":[{"name":"eggs","amount_text":"3"}],"steps":["Cook"]}`))
	req = withUser(req, user)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("recipe status %d body %s", rec.Code, rec.Body.String())
	}
}
