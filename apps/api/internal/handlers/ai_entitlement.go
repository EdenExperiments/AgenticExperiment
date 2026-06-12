package handlers

import (
	"context"
	"net/http"

	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/api"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/database"
	"github.com/meden/rpgtracker/internal/entitlements"
	"github.com/meden/rpgtracker/internal/keys"
)

// TierLookup resolves a user's subscription tier.
type TierLookup interface {
	TierForUser(ctx context.Context, userID uuid.UUID) (entitlements.Tier, error)
}

// APIKeyStatusStore reports whether a user has a stored API key without decryption.
type APIKeyStatusStore interface {
	HasAPIKey(ctx context.Context, userID uuid.UUID) (bool, error)
}

// AIEntitlementHandler handles GET /api/v1/account/ai-entitlement.
type AIEntitlementHandler struct {
	tierLookup TierLookup
	keyStore   APIKeyStatusStore
}

// NewAIEntitlementHandler constructs an AIEntitlementHandler (DB via context).
func NewAIEntitlementHandler() *AIEntitlementHandler {
	return &AIEntitlementHandler{
		tierLookup: entitlements.NewChecker(),
		keyStore:   &dbAPIKeyStatusStore{},
	}
}

// NewAIEntitlementHandlerForTest constructs an AIEntitlementHandler with injected dependencies.
func NewAIEntitlementHandlerForTest(tierLookup TierLookup, keyStore APIKeyStatusStore) *AIEntitlementHandler {
	return &AIEntitlementHandler{
		tierLookup: tierLookup,
		keyStore:   keyStore,
	}
}

type aiEntitlementResponse struct {
	Entitled         bool   `json:"entitled"`
	Reason           string `json:"reason"`
	SubscriptionTier string `json:"subscription_tier"`
	HasAPIKey        bool   `json:"has_api_key"`
}

// HandleGetAIEntitlement returns a composite readiness check for AI Goal Coach UI gating.
func (h *AIEntitlementHandler) HandleGetAIEntitlement(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	tier, err := h.tierLookup.TierForUser(r.Context(), userID)
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	hasKey, err := h.keyStore.HasAPIKey(r.Context(), userID)
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	entitled, reason := computeAIEntitlement(tier, hasKey)
	api.RespondJSON(w, http.StatusOK, aiEntitlementResponse{
		Entitled:         entitled,
		Reason:           reason,
		SubscriptionTier: string(tier),
		HasAPIKey:        hasKey,
	})
}

func computeAIEntitlement(tier entitlements.Tier, hasKey bool) (entitled bool, reason string) {
	if tier != entitlements.TierPro {
		return false, "subscription_required"
	}
	if !hasKey {
		return false, "no_api_key"
	}
	return true, "ready"
}

type dbAPIKeyStatusStore struct{}

func (s *dbAPIKeyStatusStore) HasAPIKey(ctx context.Context, userID uuid.UUID) (bool, error) {
	status, err := keys.GetKeyStatus(ctx, database.MustQuerier(ctx), userID)
	if err != nil {
		return false, err
	}
	return status.Exists, nil
}
