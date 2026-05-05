package entitlements

import (
	"errors"
	"net/http"

	"github.com/meden/rpgtracker/internal/api"
	"github.com/meden/rpgtracker/internal/auth"
)

// RequireFeature returns a chi-compatible middleware that rejects the request
// with 403 if the authenticated user is not entitled to the given feature.
//
// Usage (in server.go):
//
//	r.With(entitlementChecker.RequireFeature(entitlements.FeatureAIGoalPlanner)).
//	    Post("/goals/plan", planHandler.HandlePostGoalPlan)
func (c *Checker) RequireFeature(f Feature) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, ok := auth.UserIDFromContext(r.Context())
			if !ok {
				api.RespondError(w, http.StatusUnauthorized, "unauthorized")
				return
			}

			if err := c.Check(r.Context(), userID, f); err != nil {
				var notEntitled *ErrNotEntitled
				if errors.As(err, &notEntitled) {
					api.RespondJSON(w, http.StatusForbidden, map[string]string{
						"error": "subscription_required",
						"detail": "this feature requires a Pro subscription — " +
							"upgrade at account settings",
						"feature":  string(notEntitled.Feature),
						"required": string(notEntitled.Required),
					})
					return
				}
				// DB or unexpected error — don't silently allow; fail closed.
				api.RespondError(w, http.StatusInternalServerError, "entitlement check failed")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
