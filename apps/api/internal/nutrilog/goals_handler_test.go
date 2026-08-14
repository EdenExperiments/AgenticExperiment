package nutrilog

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/auth"
)

type memGoals struct {
	byUser map[uuid.UUID]Goals
}

func (m *memGoals) UpsertGoals(_ context.Context, userID uuid.UUID, g Goals) (*Goals, error) {
	if m.byUser == nil {
		m.byUser = map[uuid.UUID]Goals{}
	}
	g.UserID = userID
	m.byUser[userID] = g
	cp := g
	return &cp, nil
}

func (m *memGoals) GetGoals(_ context.Context, userID uuid.UUID) (*Goals, error) {
	g, ok := m.byUser[userID]
	if !ok {
		return nil, ErrNotFound
	}
	cp := g
	return &cp, nil
}

func TestHandlePutGoals_OK(t *testing.T) {
	h := NewHandler(&stubWeightStore{}, &memGoals{})
	body := `{"calorie_goal":2200,"protein_g":140,"carbs_g":200,"fat_g":70,"target_weight_kg":72.5}`
	req := httptest.NewRequest(http.MethodPut, "/goals", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(auth.WithUserID(req.Context(), testNutrilogUserID()))
	w := httptest.NewRecorder()
	h.HandlePutGoals(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("status %d: %s", w.Code, w.Body.String())
	}
	var g Goals
	if err := json.NewDecoder(w.Body).Decode(&g); err != nil {
		t.Fatal(err)
	}
	if g.CalorieGoal != 2200 || g.ProteinG == nil || *g.ProteinG != 140 {
		t.Fatalf("got %+v", g)
	}
}

func TestHandlePutGoals_RejectsNonPositiveCalories(t *testing.T) {
	h := NewHandler(&stubWeightStore{}, &memGoals{})
	req := httptest.NewRequest(http.MethodPut, "/goals", bytes.NewBufferString(`{"calorie_goal":0}`))
	req = req.WithContext(auth.WithUserID(req.Context(), testNutrilogUserID()))
	w := httptest.NewRecorder()
	h.HandlePutGoals(w, req)
	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status %d", w.Code)
	}
}

func TestHandleGetGoals_NotFoundAndIsolation(t *testing.T) {
	store := &memGoals{}
	h := NewHandler(&stubWeightStore{}, store)
	user := testNutrilogUserID()
	other := testNutrilogUserID2()

	req := httptest.NewRequest(http.MethodGet, "/goals", nil)
	req = req.WithContext(auth.WithUserID(req.Context(), user))
	w := httptest.NewRecorder()
	h.HandleGetGoals(w, req)
	if w.Code != http.StatusNotFound {
		t.Fatalf("empty get %d", w.Code)
	}

	put := httptest.NewRequest(http.MethodPut, "/goals", bytes.NewBufferString(`{"calorie_goal":1800}`))
	put = put.WithContext(auth.WithUserID(put.Context(), user))
	h.HandlePutGoals(httptest.NewRecorder(), put)

	otherReq := httptest.NewRequest(http.MethodGet, "/goals", nil)
	otherReq = otherReq.WithContext(auth.WithUserID(otherReq.Context(), other))
	ow := httptest.NewRecorder()
	h.HandleGetGoals(ow, otherReq)
	if ow.Code != http.StatusNotFound {
		t.Fatalf("other user %d want 404", ow.Code)
	}
}

func TestHandlePutGoals_Unauthorized(t *testing.T) {
	h := NewHandler(&stubWeightStore{}, &memGoals{})
	req := httptest.NewRequest(http.MethodPut, "/goals", bytes.NewBufferString(`{"calorie_goal":1800}`))
	w := httptest.NewRecorder()
	h.HandlePutGoals(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("status %d", w.Code)
	}
}
