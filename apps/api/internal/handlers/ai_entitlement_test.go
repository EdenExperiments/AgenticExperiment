package handlers_test

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/entitlements"
	"github.com/meden/rpgtracker/internal/handlers"
)

// stubTierLookup implements handlers.TierLookup for unit tests.
type stubTierLookup struct {
	tier entitlements.Tier
	err  error
}

func (s *stubTierLookup) TierForUser(_ context.Context, _ uuid.UUID) (entitlements.Tier, error) {
	return s.tier, s.err
}

// stubAPIKeyStatusStore implements handlers.APIKeyStatusStore for unit tests.
type stubAPIKeyStatusStore struct {
	hasKey bool
	err    error
}

func (s *stubAPIKeyStatusStore) HasAPIKey(_ context.Context, _ uuid.UUID) (bool, error) {
	return s.hasKey, s.err
}

// TestAIEntitlement_TierAndKeyCombinations verifies AC-1: response shape and reason priority
// for all four subscription_tier × has_api_key combinations.
func TestAIEntitlement_TierAndKeyCombinations(t *testing.T) {
	userID := uuid.New()

	cases := []struct {
		name          string
		tier          entitlements.Tier
		hasKey        bool
		wantEntitled  bool
		wantReason    string
		wantTier      string
		wantHasAPIKey bool
	}{
		{
			name:          "free_no_key",
			tier:          entitlements.TierFree,
			hasKey:        false,
			wantEntitled:  false,
			wantReason:    "subscription_required",
			wantTier:      "free",
			wantHasAPIKey: false,
		},
		{
			name:          "free_with_key",
			tier:          entitlements.TierFree,
			hasKey:        true,
			wantEntitled:  false,
			wantReason:    "subscription_required",
			wantTier:      "free",
			wantHasAPIKey: true,
		},
		{
			name:          "pro_no_key",
			tier:          entitlements.TierPro,
			hasKey:        false,
			wantEntitled:  false,
			wantReason:    "no_api_key",
			wantTier:      "pro",
			wantHasAPIKey: false,
		},
		{
			name:          "pro_with_key",
			tier:          entitlements.TierPro,
			hasKey:        true,
			wantEntitled:  true,
			wantReason:    "ready",
			wantTier:      "pro",
			wantHasAPIKey: true,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			h := handlers.NewAIEntitlementHandlerForTest(
				&stubTierLookup{tier: tc.tier},
				&stubAPIKeyStatusStore{hasKey: tc.hasKey},
			)

			req := httptest.NewRequest(http.MethodGet, "/api/v1/account/ai-entitlement", nil)
			req = req.WithContext(auth.WithUserID(req.Context(), userID))
			w := httptest.NewRecorder()

			h.HandleGetAIEntitlement(w, req)

			if w.Code != http.StatusOK {
				t.Fatalf("status: got %d want 200: %s", w.Code, w.Body.String())
			}

			var resp map[string]interface{}
			if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
				t.Fatalf("invalid JSON: %v", err)
			}

			for _, field := range []string{"entitled", "reason", "subscription_tier", "has_api_key"} {
				if _, ok := resp[field]; !ok {
					t.Errorf("missing required field %q: %s", field, w.Body.String())
				}
			}

			if resp["entitled"] != tc.wantEntitled {
				t.Errorf("entitled: got %v want %v", resp["entitled"], tc.wantEntitled)
			}
			if resp["reason"] != tc.wantReason {
				t.Errorf("reason: got %v want %v", resp["reason"], tc.wantReason)
			}
			if resp["subscription_tier"] != tc.wantTier {
				t.Errorf("subscription_tier: got %v want %v", resp["subscription_tier"], tc.wantTier)
			}
			if resp["has_api_key"] != tc.wantHasAPIKey {
				t.Errorf("has_api_key: got %v want %v", resp["has_api_key"], tc.wantHasAPIKey)
			}

			assertAIEntitlementNoKeyLeakage(t, w.Body.String())
		})
	}
}

// TestAIEntitlement_Unauthenticated_Returns401 verifies unauthenticated requests are rejected.
func TestAIEntitlement_Unauthenticated_Returns401(t *testing.T) {
	h := handlers.NewAIEntitlementHandlerForTest(
		&stubTierLookup{tier: entitlements.TierPro},
		&stubAPIKeyStatusStore{hasKey: true},
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/account/ai-entitlement", nil)
	w := httptest.NewRecorder()

	h.HandleGetAIEntitlement(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("want 401, got %d: %s", w.Code, w.Body.String())
	}
}

// TestAIEntitlement_TierLookupError_Returns500 verifies unexpected tier lookup errors fail closed.
func TestAIEntitlement_TierLookupError_Returns500(t *testing.T) {
	h := handlers.NewAIEntitlementHandlerForTest(
		&stubTierLookup{err: errors.New("db unavailable")},
		&stubAPIKeyStatusStore{hasKey: true},
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/account/ai-entitlement", nil)
	req = req.WithContext(auth.WithUserID(req.Context(), uuid.New()))
	w := httptest.NewRecorder()

	h.HandleGetAIEntitlement(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("want 500, got %d: %s", w.Code, w.Body.String())
	}
}

// TestAIEntitlement_KeyStatusError_Returns500 verifies unexpected key-store errors fail closed.
func TestAIEntitlement_KeyStatusError_Returns500(t *testing.T) {
	h := handlers.NewAIEntitlementHandlerForTest(
		&stubTierLookup{tier: entitlements.TierPro},
		&stubAPIKeyStatusStore{err: errors.New("db unavailable")},
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/account/ai-entitlement", nil)
	req = req.WithContext(auth.WithUserID(req.Context(), uuid.New()))
	w := httptest.NewRecorder()

	h.HandleGetAIEntitlement(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("want 500, got %d: %s", w.Code, w.Body.String())
	}
}

// assertAIEntitlementNoKeyLeakage verifies AC-2 / D-015: no key material in the response body.
func assertAIEntitlementNoKeyLeakage(t *testing.T, body string) {
	t.Helper()
	for _, field := range []string{
		"api_key", "key", "key_hint", "hint",
		"encrypted_key", "encrypted_dek", "dek", "plaintext",
	} {
		if strings.Contains(strings.ToLower(body), `"`+field+`"`) {
			t.Errorf("response must not expose field %q: %s", field, body)
		}
	}
	if strings.Contains(body, "sk-ant-") {
		t.Errorf("response must not contain API key material: %s", body)
	}
}
