package handlers_test

// TestGoalPlanEntitlementGate verifies that the entitlement middleware correctly
// blocks free-tier users and allows pro-tier users from the goal planner handler.
//
// NOTE: The entitlement middleware itself is unit-tested in the entitlements package.
// These tests exercise the handler in isolation — they do NOT test the middleware
// wire-up in server.go (which requires an integration test with a live DB).
// The purpose here is to confirm the handler itself is agnostic to tier logic
// (i.e., it does NOT duplicate tier checks internally) and that the handler
// returns expected responses when a valid tier is already approved upstream.
//
// The middleware gate tests live in:
//   - internal/entitlements/entitlements_test.go  (pure logic)
//   - internal/entitlements/middleware_test.go     (HTTP middleware behaviour)

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/handlers"
)

// TestHandlePostGoalPlan_NoAPIKey_Returns402
// Confirms the handler rejects a request when no AI key is stored for the user.
// This simulates a pro user who hasn't yet configured their Claude API key.
func TestHandlePostGoalPlan_NoAPIKey_Returns402(t *testing.T) {
	ks := &stubKeyStore{err: pgx.ErrNoRows}
	caller := &stubPlannerCaller{}
	h := handlers.NewGoalPlanHandlerForTest(ks, caller)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/goals/plan",
		strings.NewReader(`{"goal_statement":"Run a 5k"}`))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(auth.WithUserID(req.Context(), uuid.New()))
	w := httptest.NewRecorder()

	h.HandlePostGoalPlan(w, req)

	if w.Code != http.StatusPaymentRequired {
		t.Fatalf("want 402 (no API key), got %d: %s", w.Code, w.Body.String())
	}
}

// TestHandlePostGoalPlan_MissingGoalStatement_Returns422
// Confirms the handler validates the goal_statement field even for pro users.
func TestHandlePostGoalPlan_MissingGoalStatement_Returns422(t *testing.T) {
	ks := &stubKeyStore{key: "sk-ant-test"}
	caller := &stubPlannerCaller{response: validPlanJSON()}
	h := handlers.NewGoalPlanHandlerForTest(ks, caller)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/goals/plan",
		strings.NewReader(`{"goal_statement":""}`))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(auth.WithUserID(req.Context(), uuid.New()))
	w := httptest.NewRecorder()

	h.HandlePostGoalPlan(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("want 422 (empty goal_statement), got %d: %s", w.Code, w.Body.String())
	}
}
