package handlers_test

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/handlers"
	"github.com/meden/rpgtracker/internal/planner"
)

// ─── Stubs ────────────────────────────────────────────────────────────────────

// stubPlannerCaller implements handlers.PlannerAICaller for tests.
type stubPlannerCaller struct {
	response string
	err      error
}

func (s *stubPlannerCaller) CallRaw(_ context.Context, _, _, _ string) (string, error) {
	return s.response, s.err
}

// validPlanJSON returns well-formed JSON that passes planner.ParseResponse.
func validPlanJSON() string {
	return `{
  "objective": "Complete a 5k run in under 30 minutes within 8 weeks.",
  "milestones": [
    {"title": "Run 2k", "description": "Foundation.", "week_offset": 2},
    {"title": "Run 5k", "description": "Goal distance.", "week_offset": 6}
  ],
  "weekly_cadence": [
    {"week": 1, "focus": "Base", "task_summary": "Walk/run 20 min daily."},
    {"week": 2, "focus": "Build", "task_summary": "Run 2k without stopping."},
    {"week": 3, "focus": "Endurance", "task_summary": "+10% each session."},
    {"week": 4, "focus": "Recovery", "task_summary": "Easy jog + stretch."}
  ],
  "risks": [
    {"description": "Injury", "mitigation": "Rest if pain persists."}
  ],
  "fallback_plan": "Reduce distance and add extra rest if needed."
}`
}

// ─── Helper ───────────────────────────────────────────────────────────────────

func makeGoalPlanRequest(body string) *http.Request {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/goals/plan", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(auth.WithUserID(req.Context(), uuid.New()))
	return req
}

// ─── Tests ────────────────────────────────────────────────────────────────────

func TestHandlePostGoalPlan_Returns200_ValidPlan(t *testing.T) {
	ks := &stubKeyStore{key: "sk-ant-test-key"}
	caller := &stubPlannerCaller{response: validPlanJSON()}
	h := handlers.NewGoalPlanHandlerForTest(ks, caller)

	body := `{"goal_statement":"Run a 5k in under 30 minutes"}`
	req := makeGoalPlanRequest(body)
	w := httptest.NewRecorder()
	h.HandlePostGoalPlan(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("got %d want 200: %s", w.Code, w.Body.String())
	}

	var resp struct {
		Plan             *planner.PlanResponse `json:"plan"`
		DegradedResponse bool                  `json:"degraded_response"`
	}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if resp.DegradedResponse {
		t.Error("degraded_response should be false for valid AI output")
	}
	if resp.Plan == nil {
		t.Fatal("plan must not be nil")
	}
	if resp.Plan.Objective == "" {
		t.Error("objective must not be empty")
	}
}

func TestHandlePostGoalPlan_Returns401_Unauthorized(t *testing.T) {
	ks := &stubKeyStore{key: "sk-ant-test-key"}
	caller := &stubPlannerCaller{response: validPlanJSON()}
	h := handlers.NewGoalPlanHandlerForTest(ks, caller)

	// No user ID in context
	req := httptest.NewRequest(http.MethodPost, "/api/v1/goals/plan",
		strings.NewReader(`{"goal_statement":"x"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.HandlePostGoalPlan(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("got %d want 401", w.Code)
	}
}

func TestHandlePostGoalPlan_Returns422_MissingGoalStatement(t *testing.T) {
	ks := &stubKeyStore{key: "sk-ant-test-key"}
	caller := &stubPlannerCaller{response: validPlanJSON()}
	h := handlers.NewGoalPlanHandlerForTest(ks, caller)

	req := makeGoalPlanRequest(`{"goal_statement":""}`)
	w := httptest.NewRecorder()
	h.HandlePostGoalPlan(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("got %d want 422", w.Code)
	}
}

func TestHandlePostGoalPlan_Returns400_BadJSON(t *testing.T) {
	ks := &stubKeyStore{key: "sk-ant-test-key"}
	caller := &stubPlannerCaller{response: validPlanJSON()}
	h := handlers.NewGoalPlanHandlerForTest(ks, caller)

	req := makeGoalPlanRequest("not-json")
	w := httptest.NewRecorder()
	h.HandlePostGoalPlan(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("got %d want 400", w.Code)
	}
}

func TestHandlePostGoalPlan_Returns402_NoAPIKey(t *testing.T) {
	ks := &stubKeyStore{err: pgx.ErrNoRows}
	caller := &stubPlannerCaller{}
	h := handlers.NewGoalPlanHandlerForTest(ks, caller)

	req := makeGoalPlanRequest(`{"goal_statement":"Become fluent in Spanish"}`)
	w := httptest.NewRecorder()
	h.HandlePostGoalPlan(w, req)

	if w.Code != http.StatusPaymentRequired {
		t.Fatalf("got %d want 402", w.Code)
	}
}

func TestHandlePostGoalPlan_Returns500_KeyStoreError(t *testing.T) {
	ks := &stubKeyStore{err: errors.New("db connection refused")}
	caller := &stubPlannerCaller{}
	h := handlers.NewGoalPlanHandlerForTest(ks, caller)

	req := makeGoalPlanRequest(`{"goal_statement":"Learn to code"}`)
	w := httptest.NewRecorder()
	h.HandlePostGoalPlan(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("got %d want 500", w.Code)
	}
}

func TestHandlePostGoalPlan_Returns502_AICallFailure(t *testing.T) {
	ks := &stubKeyStore{key: "sk-ant-test-key"}
	caller := &stubPlannerCaller{err: errors.New("network timeout")}
	h := handlers.NewGoalPlanHandlerForTest(ks, caller)

	req := makeGoalPlanRequest(`{"goal_statement":"Build a mobile app"}`)
	w := httptest.NewRecorder()
	h.HandlePostGoalPlan(w, req)

	if w.Code != http.StatusBadGateway {
		t.Fatalf("got %d want 502", w.Code)
	}
}

func TestHandlePostGoalPlan_Returns200_DegradedOnMalformedAIOutput(t *testing.T) {
	ks := &stubKeyStore{key: "sk-ant-test-key"}
	caller := &stubPlannerCaller{response: "Sorry, I cannot help with that."}
	h := handlers.NewGoalPlanHandlerForTest(ks, caller)

	req := makeGoalPlanRequest(`{"goal_statement":"Write a novel"}`)
	w := httptest.NewRecorder()
	h.HandlePostGoalPlan(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("got %d want 200 (degraded fallback): %s", w.Code, w.Body.String())
	}

	var resp struct {
		Plan             *planner.PlanResponse `json:"plan"`
		DegradedResponse bool                  `json:"degraded_response"`
	}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if !resp.DegradedResponse {
		t.Error("degraded_response should be true when AI output is malformed")
	}
	if resp.Plan == nil {
		t.Fatal("fallback plan must not be nil")
	}
	if resp.Plan.FallbackPlan == "" {
		t.Error("fallback plan's fallback_plan must not be empty")
	}
}

func TestHandlePostGoalPlan_Returns200_WithDeadlineAndContext(t *testing.T) {
	ks := &stubKeyStore{key: "sk-ant-test-key"}
	caller := &stubPlannerCaller{response: validPlanJSON()}
	h := handlers.NewGoalPlanHandlerForTest(ks, caller)

	deadline := time.Now().Add(8 * 7 * 24 * time.Hour).UTC().Format(time.RFC3339)
	body := fmt.Sprintf(`{"goal_statement":"Run a 5k","deadline":"%s","context":"Beginner runner"}`, deadline)
	req := makeGoalPlanRequest(body)
	w := httptest.NewRecorder()
	h.HandlePostGoalPlan(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("got %d want 200: %s", w.Code, w.Body.String())
	}
}

func TestHandlePostGoalPlan_MarkdownFenceStrippedSuccessfully(t *testing.T) {
	wrapped := "```json\n" + validPlanJSON() + "\n```"
	ks := &stubKeyStore{key: "sk-ant-test-key"}
	caller := &stubPlannerCaller{response: wrapped}
	h := handlers.NewGoalPlanHandlerForTest(ks, caller)

	req := makeGoalPlanRequest(`{"goal_statement":"Learn to paint"}`)
	w := httptest.NewRecorder()
	h.HandlePostGoalPlan(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("got %d want 200: %s", w.Code, w.Body.String())
	}

	var resp struct {
		DegradedResponse bool `json:"degraded_response"`
	}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if resp.DegradedResponse {
		t.Error("degraded_response should be false — fence stripping should succeed")
	}
}
