package handlers_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/handlers"
	"github.com/meden/rpgtracker/internal/skills"
)

type stubXPStore struct {
	result *skills.LogXPResult
	err    error
}

func (s *stubXPStore) LogXP(_ context.Context, _, _ uuid.UUID, _ int, _ string) (*skills.LogXPResult, error) {
	return s.result, s.err
}

func TestHandlePostXP_Returns200(t *testing.T) {
	skillID := uuid.New()
	stub := &stubXPStore{result: &skills.LogXPResult{
		Skill:       &skills.Skill{Name: "Running"},
		XPAdded:     100,
		LevelBefore: 1,
		LevelAfter:  1,
	}}
	h := handlers.NewXPHandlerWithStore(stub)

	body := url.Values{"xp_delta": {"100"}}.Encode()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/skills/"+skillID.String()+"/xp",
		strings.NewReader(body))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = req.WithContext(auth.WithUserID(req.Context(), uuid.New()))

	// Inject chi URL param — required for chi.URLParam to work in tests
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", skillID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	rr := httptest.NewRecorder()
	h.HandlePostXP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("got %d want 200: %s", rr.Code, rr.Body.String())
	}
}

func TestHandlePostXP_RejectsMissingDelta(t *testing.T) {
	skillID := uuid.New()
	h := handlers.NewXPHandlerWithStore(&stubXPStore{})

	req := httptest.NewRequest(http.MethodPost, "/api/v1/skills/"+skillID.String()+"/xp",
		strings.NewReader(""))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = req.WithContext(auth.WithUserID(req.Context(), uuid.New()))

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", skillID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	rr := httptest.NewRecorder()
	h.HandlePostXP(rr, req)
	if rr.Code != http.StatusUnprocessableEntity {
		t.Fatalf("got %d want 422", rr.Code)
	}
}
