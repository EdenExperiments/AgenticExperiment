package handlers_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/handlers"
)

// stubKeyStore implements handlers.KeyStore for tests.
type stubKeyStore struct {
	key string
	err error
}

func (s *stubKeyStore) GetDecryptedKey(_ context.Context, _ uuid.UUID) (string, error) {
	return s.key, s.err
}

// stubClaudeCaller implements handlers.ClaudeCaller for tests.
type stubClaudeCaller struct {
	result *handlers.CalibrateResponse
	status int
	err    error
}

func (s *stubClaudeCaller) Call(_ context.Context, _, _ string) (*handlers.CalibrateResponse, int, error) {
	return s.result, s.status, s.err
}

func TestHandlePostCalibrate_Returns200_WithMockClaude(t *testing.T) {
	ks := &stubKeyStore{key: "sk-ant-test-key"}
	caller := &stubClaudeCaller{
		result: &handlers.CalibrateResponse{
			SuggestedLevel:   25,
			Rationale:        "Test rationale.",
			GateDescriptions: make([]string, 10),
		},
		status: http.StatusOK,
	}
	h := handlers.NewCalibrateHandlerForTest(ks, caller)

	form := url.Values{"name": {"Piano"}, "description": {"Classical piano practice"}}.Encode()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/calibrate", strings.NewReader(form))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = req.WithContext(auth.WithUserID(req.Context(), uuid.New()))

	w := httptest.NewRecorder()
	h.HandlePostCalibrate(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("got %d want 200: %s", w.Code, w.Body.String())
	}
	var resp handlers.CalibrateResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if resp.SuggestedLevel != 25 {
		t.Errorf("suggested_level: got %d want 25", resp.SuggestedLevel)
	}
}

func TestHandlePostCalibrate_Returns400_WhenNoKey(t *testing.T) {
	ks := &stubKeyStore{err: pgx.ErrNoRows}
	h := handlers.NewCalibrateHandlerForTest(ks, nil)

	form := url.Values{"name": {"Piano"}}.Encode()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/calibrate", strings.NewReader(form))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = req.WithContext(auth.WithUserID(req.Context(), uuid.New()))

	w := httptest.NewRecorder()
	h.HandlePostCalibrate(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("got %d want 400", w.Code)
	}
}
