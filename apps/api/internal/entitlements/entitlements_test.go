package entitlements

import (
	"testing"
)

// ─── Tier ordering ────────────────────────────────────────────────────────────

func TestTierGTE(t *testing.T) {
	cases := []struct {
		have Tier
		want Tier
		ok   bool
	}{
		{TierFree, TierFree, true},
		{TierPro, TierPro, true},
		{TierPro, TierFree, true},  // pro satisfies free requirement
		{TierFree, TierPro, false}, // free does NOT satisfy pro requirement
	}

	for _, tc := range cases {
		got := tierGTE(tc.have, tc.want)
		if got != tc.ok {
			t.Errorf("tierGTE(%q, %q) = %v; want %v", tc.have, tc.want, got, tc.ok)
		}
	}
}

// ─── Feature gating (pure, no DB) ────────────────────────────────────────────

func TestCheckTierSatisfies_FreeUserBlockedFromAIPlanner(t *testing.T) {
	err := checkTierSatisfies(TierFree, FeatureAIGoalPlanner)
	if err == nil {
		t.Fatal("expected error for free user on ai_goal_planner, got nil")
	}
	notEntitled, ok := err.(*ErrNotEntitled)
	if !ok {
		t.Fatalf("expected *ErrNotEntitled, got %T: %v", err, err)
	}
	if notEntitled.UserTier != TierFree {
		t.Errorf("UserTier = %q; want %q", notEntitled.UserTier, TierFree)
	}
	if notEntitled.Required != TierPro {
		t.Errorf("Required = %q; want %q", notEntitled.Required, TierPro)
	}
	if notEntitled.Feature != FeatureAIGoalPlanner {
		t.Errorf("Feature = %q; want %q", notEntitled.Feature, FeatureAIGoalPlanner)
	}
}

func TestCheckTierSatisfies_ProUserAllowedAIPlanner(t *testing.T) {
	if err := checkTierSatisfies(TierPro, FeatureAIGoalPlanner); err != nil {
		t.Fatalf("expected nil for pro user on ai_goal_planner, got: %v", err)
	}
}

func TestCheckTierSatisfies_FreeUserBlockedFromAIForecast(t *testing.T) {
	if err := checkTierSatisfies(TierFree, FeatureAIGoalForecast); err == nil {
		t.Fatal("expected error for free user on ai_goal_forecast, got nil")
	}
}

func TestCheckTierSatisfies_ProUserAllowedAIForecast(t *testing.T) {
	if err := checkTierSatisfies(TierPro, FeatureAIGoalForecast); err != nil {
		t.Fatalf("expected nil for pro user on ai_goal_forecast, got: %v", err)
	}
}

func TestCheckTierSatisfies_UnknownFeatureAllowed(t *testing.T) {
	// Unknown features must not accidentally block users.
	if err := checkTierSatisfies(TierFree, Feature("unknown_feature")); err != nil {
		t.Fatalf("unknown feature should be unrestricted, got: %v", err)
	}
}

// ─── ErrNotEntitled message ───────────────────────────────────────────────────

func TestErrNotEntitled_ErrorString(t *testing.T) {
	e := &ErrNotEntitled{
		Feature:  FeatureAIGoalPlanner,
		UserTier: TierFree,
		Required: TierPro,
	}
	got := e.Error()
	if got == "" {
		t.Fatal("ErrNotEntitled.Error() returned empty string")
	}
}
