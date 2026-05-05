package entitlements

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/auth"
)

// stubChecker implements the entitlement check without a DB.
// It lets tests set a fixed tier for the user.
type stubChecker struct {
	tier Tier
	err  error
}

func (s *stubChecker) Check(_ context.Context, _ uuid.UUID, f Feature) error {
	if s.err != nil {
		return s.err
	}
	return checkTierSatisfies(s.tier, f)
}

// RequireFeatureWithChecker is a test helper that builds the same middleware
// shape as Checker.RequireFeature but with an injected check function.
// This decouples middleware logic tests from the pgxpool.
func requireFeatureWithCheck(
	checkFn func(ctx context.Context, userID uuid.UUID, f Feature) error,
	f Feature,
) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, ok := auth.UserIDFromContext(r.Context())
			if !ok {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}
			if err := checkFn(r.Context(), userID, f); err != nil {
				if _, notEntitled := err.(*ErrNotEntitled); notEntitled {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusForbidden)
					return
				}
				w.WriteHeader(http.StatusInternalServerError)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func okHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
}

func TestRequireFeature_FreeUserBlocked(t *testing.T) {
	sc := &stubChecker{tier: TierFree}
	mw := requireFeatureWithCheck(sc.Check, FeatureAIGoalPlanner)

	req := httptest.NewRequest(http.MethodPost, "/goals/plan", nil)
	req = req.WithContext(auth.WithUserID(req.Context(), uuid.New()))
	w := httptest.NewRecorder()

	mw(okHandler()).ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("want 403, got %d", w.Code)
	}
}

func TestRequireFeature_ProUserAllowed(t *testing.T) {
	sc := &stubChecker{tier: TierPro}
	mw := requireFeatureWithCheck(sc.Check, FeatureAIGoalPlanner)

	req := httptest.NewRequest(http.MethodPost, "/goals/plan", nil)
	req = req.WithContext(auth.WithUserID(req.Context(), uuid.New()))
	w := httptest.NewRecorder()

	mw(okHandler()).ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("want 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestRequireFeature_UnauthenticatedUser(t *testing.T) {
	sc := &stubChecker{tier: TierPro}
	mw := requireFeatureWithCheck(sc.Check, FeatureAIGoalPlanner)

	// No user ID in context.
	req := httptest.NewRequest(http.MethodPost, "/goals/plan", nil)
	w := httptest.NewRecorder()

	mw(okHandler()).ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("want 401, got %d", w.Code)
	}
}

func TestRequireFeature_DBErrorFails(t *testing.T) {
	sc := &stubChecker{err: context.DeadlineExceeded}
	mw := requireFeatureWithCheck(sc.Check, FeatureAIGoalPlanner)

	req := httptest.NewRequest(http.MethodPost, "/goals/plan", nil)
	req = req.WithContext(auth.WithUserID(req.Context(), uuid.New()))
	w := httptest.NewRecorder()

	mw(okHandler()).ServeHTTP(w, req)

	// DB error should fail closed (500), not silently allow.
	if w.Code != http.StatusInternalServerError {
		t.Fatalf("want 500, got %d", w.Code)
	}
}
