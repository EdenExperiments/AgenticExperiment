// Package entitlements defines subscription tiers and feature gates for premium
// AI capabilities. It is intentionally provider-agnostic: no billing IDs or
// payment-provider types appear here. The persistence boundary (reading the
// subscription_tier column) is in the Checker, not in billing code.
package entitlements

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Tier represents a subscription level.
type Tier string

const (
	TierFree Tier = "free"
	TierPro  Tier = "pro"
)

// Feature identifies a gated capability.
type Feature string

const (
	// FeatureAIGoalPlanner gates POST /api/v1/goals/plan.
	FeatureAIGoalPlanner Feature = "ai_goal_planner"

	// FeatureAIGoalForecast gates any goal forecast endpoint (currently not
	// implemented as a distinct route; gating declared here so that when the
	// endpoint ships it can be wired in without schema changes).
	// Decision: goal forecasting is premium because it incurs per-request AI cost.
	FeatureAIGoalForecast Feature = "ai_goal_forecast"
)

// featureRequirements maps each feature to the minimum tier that unlocks it.
var featureRequirements = map[Feature]Tier{
	FeatureAIGoalPlanner:  TierPro,
	FeatureAIGoalForecast: TierPro,
}

// ErrNotEntitled is returned when a user's tier does not satisfy the requirement.
type ErrNotEntitled struct {
	Feature  Feature
	UserTier Tier
	Required Tier
}

func (e *ErrNotEntitled) Error() string {
	return fmt.Sprintf("feature %q requires %q tier (user is %q)", e.Feature, e.Required, e.UserTier)
}

// Checker can look up a user's tier and assert feature access.
type Checker struct {
	db *pgxpool.Pool
}

// NewChecker constructs a Checker backed by the DB pool.
func NewChecker(db *pgxpool.Pool) *Checker {
	return &Checker{db: db}
}

// TierForUser returns the subscription tier stored for the given user.
// Defaults to TierFree when the row exists but the column is NULL (defensive
// against schema states before the migration is applied).
func (c *Checker) TierForUser(ctx context.Context, userID uuid.UUID) (Tier, error) {
	var tier string
	err := c.db.QueryRow(ctx,
		`SELECT COALESCE(subscription_tier, 'free') FROM public.users WHERE id = $1`,
		userID,
	).Scan(&tier)
	if err != nil {
		return TierFree, fmt.Errorf("entitlements: lookup tier for %s: %w", userID, err)
	}
	return Tier(tier), nil
}

// Check returns nil if the user is entitled to the feature, or *ErrNotEntitled.
func (c *Checker) Check(ctx context.Context, userID uuid.UUID, f Feature) error {
	userTier, err := c.TierForUser(ctx, userID)
	if err != nil {
		return err
	}
	return checkTierSatisfies(userTier, f)
}

// checkTierSatisfies is the pure function used in unit tests (no DB needed).
func checkTierSatisfies(tier Tier, f Feature) error {
	required, ok := featureRequirements[f]
	if !ok {
		// Unknown features are unrestricted so that unregistered callers don't block.
		return nil
	}
	if !tierGTE(tier, required) {
		return &ErrNotEntitled{Feature: f, UserTier: tier, Required: required}
	}
	return nil
}

// tierGTE returns true when have >= want in the tier hierarchy.
func tierGTE(have, want Tier) bool {
	order := tierOrder()
	return order[have] >= order[want]
}

// tierOrder defines the numeric rank of each tier.
// Higher rank = more access.
func tierOrder() map[Tier]int {
	return map[Tier]int{
		TierFree: 0,
		TierPro:  1,
	}
}
