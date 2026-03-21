package handlers_test

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/handlers"
	"github.com/meden/rpgtracker/internal/skills"
)

// stubGateStore implements handlers.GateStore for tests.
type stubGateStore struct {
	submission    *skills.GateSubmission
	gateCleared   bool
	err           error
	cooldownActive bool
	// Tracks whether a gate_submissions row was inserted.
	rowInserted bool
}

func (s *stubGateStore) GetGate(_ context.Context, _, _ uuid.UUID) (*skills.BlockerGate, error) {
	if s.err != nil {
		return nil, s.err
	}
	notifiedAt := time.Now().Add(-24 * time.Hour)
	return &skills.BlockerGate{
		ID:              uuid.New(),
		IsCleared:       s.gateCleared,
		FirstNotifiedAt: &notifiedAt,
	}, nil
}

func (s *stubGateStore) GetActiveCooldown(_ context.Context, _, _ uuid.UUID) (*time.Time, error) {
	if s.cooldownActive {
		tomorrow := time.Now().Add(24 * time.Hour)
		return &tomorrow, nil
	}
	return nil, nil
}

func (s *stubGateStore) InsertSubmission(
	_ context.Context,
	req skills.CreateGateSubmissionRequest,
) (*skills.GateSubmission, error) {
	if s.err != nil {
		return nil, s.err
	}
	s.rowInserted = true
	return s.submission, nil
}

func (s *stubGateStore) ClearGate(_ context.Context, _ uuid.UUID) error {
	s.gateCleared = true
	return nil
}

// stubRawClaude implements the raw Claude caller for gate tests.
type stubRawClaude struct {
	response string
	err      error
}

func (s *stubRawClaude) CallRaw(_ context.Context, _, _, _ string) (string, error) {
	return s.response, s.err
}

func gateRequest(gateID uuid.UUID, values url.Values) *http.Request {
	req := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/blocker-gates/"+gateID.String()+"/submit",
		strings.NewReader(values.Encode()),
	)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = req.WithContext(auth.WithUserID(req.Context(), uuid.New()))
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", gateID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	return req
}

// minEvidenceWhat returns a string of length >= 50.
func minEvidenceWhat() string {
	return strings.Repeat("a", 50)
}

// minEvidenceHow returns a string of length >= 50.
func minEvidenceHow() string {
	return strings.Repeat("b", 50)
}

// minEvidenceFeeling returns a string of length >= 20.
func minEvidenceFeeling() string {
	return strings.Repeat("c", 20)
}

// TestGateSubmitValidation verifies that evidence_what < 50 chars returns 422 with field error map.
func TestGateSubmitValidation(t *testing.T) {
	gateID := uuid.New()
	submissionID := uuid.New()
	stub := &stubGateStore{
		submission: &skills.GateSubmission{
			ID:            submissionID,
			Verdict:       "self_reported",
			AttemptNumber: 1,
		},
	}
	h := handlers.NewGateHandlerWithStore(stub, nil)

	form := url.Values{
		"path":              {"self_report"},
		"evidence_what":     {"too short"}, // < 50 chars — must fail
		"evidence_how":      {minEvidenceHow()},
		"evidence_feeling":  {minEvidenceFeeling()},
		"self_confirm":      {"true"},
	}
	req := gateRequest(gateID, form)
	w := httptest.NewRecorder()
	h.HandlePostGateSubmit(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if resp["error"] != "validation_failed" {
		t.Errorf("error field: got %v want \"validation_failed\"", resp["error"])
	}
	fields, ok := resp["fields"].(map[string]interface{})
	if !ok || fields == nil {
		t.Fatal("fields map missing from 422 response")
	}
	if _, exists := fields["evidence_what"]; !exists {
		t.Error("fields.evidence_what should be present in validation error response")
	}
}

// TestGateSubmitCooldown verifies that a submission within cooldown window returns 429.
func TestGateSubmitCooldown(t *testing.T) {
	gateID := uuid.New()
	stub := &stubGateStore{
		cooldownActive: true,
	}
	h := handlers.NewGateHandlerWithStore(stub, nil)

	form := url.Values{
		"path":             {"self_report"},
		"evidence_what":    {minEvidenceWhat()},
		"evidence_how":     {minEvidenceHow()},
		"evidence_feeling": {minEvidenceFeeling()},
		"self_confirm":     {"true"},
	}
	req := gateRequest(gateID, form)
	w := httptest.NewRecorder()
	h.HandlePostGateSubmit(w, req)

	if w.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429 during cooldown, got %d: %s", w.Code, w.Body.String())
	}
}

// TestGateSubmitSelfReport verifies the self-report path:
// - gate_submissions row created with verdict=self_reported
// - blocker_gates.is_cleared set to true
func TestGateSubmitSelfReport(t *testing.T) {
	gateID := uuid.New()
	submissionID := uuid.New()
	stub := &stubGateStore{
		submission: &skills.GateSubmission{
			ID:            submissionID,
			Verdict:       "self_reported",
			AttemptNumber: 1,
		},
	}
	h := handlers.NewGateHandlerWithStore(stub, nil)

	form := url.Values{
		"path":             {"self_report"},
		"evidence_what":    {minEvidenceWhat()},
		"evidence_how":     {minEvidenceHow()},
		"evidence_feeling": {minEvidenceFeeling()},
		"self_confirm":     {"true"},
	}
	req := gateRequest(gateID, form)
	w := httptest.NewRecorder()
	h.HandlePostGateSubmit(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 for self-report, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}

	// gate_cleared must be true
	gateCleared, _ := resp["gate_cleared"].(bool)
	if !gateCleared {
		t.Error("gate_cleared: expected true for self_report submission")
	}

	submission, _ := resp["submission"].(map[string]interface{})
	if submission == nil {
		t.Fatal("submission field missing from response")
	}
	verdict, _ := submission["verdict"].(string)
	if verdict != "self_reported" {
		t.Errorf("submission.verdict: got %q want \"self_reported\"", verdict)
	}

	// verify the gate_submissions row was inserted
	if !stub.rowInserted {
		t.Error("gate_submissions row must be inserted for self_report path")
	}
	// verify the gate was cleared in the store
	if !stub.gateCleared {
		t.Error("blocker_gates.is_cleared must be set to true for self_report path")
	}
}

// TestGateSubmitAIFailure verifies that when the Claude API call fails:
// - response is HTTP 502
// - no gate_submissions row is inserted (spec G3: "No submission is stored")
func TestGateSubmitAIFailure(t *testing.T) {
	gateID := uuid.New()
	stub := &stubGateStore{}
	// Claude caller returns an error.
	failingClaude := &stubRawClaude{err: errors.New("claude api unavailable")}
	h := handlers.NewGateHandlerWithStore(stub, failingClaude)

	form := url.Values{
		"path":             {"ai"},
		"evidence_what":    {minEvidenceWhat()},
		"evidence_how":     {minEvidenceHow()},
		"evidence_feeling": {minEvidenceFeeling()},
	}
	req := gateRequest(gateID, form)
	w := httptest.NewRecorder()
	h.HandlePostGateSubmit(w, req)

	if w.Code != http.StatusBadGateway {
		t.Fatalf("expected 502 on Claude failure, got %d: %s", w.Code, w.Body.String())
	}

	// No gate_submissions row should be inserted on AI failure.
	if stub.rowInserted {
		t.Error("gate_submissions row must NOT be inserted when Claude API fails")
	}
}

// TestAccountTimezoneInvalid verifies that PATCH /api/v1/account with an invalid
// IANA timezone string returns 422 (spec D-029).
func TestAccountTimezoneInvalid(t *testing.T) {
	h := handlers.NewUserHandler(nil)

	form := url.Values{
		"timezone": {"Not/A/Zone"},
	}
	req := httptest.NewRequest(
		http.MethodPatch,
		"/api/v1/account",
		strings.NewReader(form.Encode()),
	)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = req.WithContext(auth.WithUserID(req.Context(), uuid.New()))

	w := httptest.NewRecorder()
	h.HandlePatchAccount(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422 for invalid timezone, got %d: %s", w.Code, w.Body.String())
	}
}
