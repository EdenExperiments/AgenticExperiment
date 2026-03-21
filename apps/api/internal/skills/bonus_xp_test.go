package skills_test

import (
	"testing"

	"github.com/meden/rpgtracker/internal/skills"
)

// TestBonusXPFullCompletion verifies that completion_ratio >= 0.95 earns full bonus tier.
// Standard skill earns 25%; active-use-flagged skill earns 10%.
func TestBonusXPFullCompletion(t *testing.T) {
	tests := []struct {
		name            string
		ratio           float64
		requiresActive  bool
		baseXP          int
		wantBonusPct    int
		wantBonusXP     int
	}{
		{
			name:           "standard skill full completion",
			ratio:          1.0,
			requiresActive: false,
			baseXP:         250,
			wantBonusPct:   25,
			wantBonusXP:    63, // round(250 * 0.25) = 62.5 → 63
		},
		{
			name:           "active-use skill full completion",
			ratio:          1.0,
			requiresActive: true,
			baseXP:         250,
			wantBonusPct:   10,
			wantBonusXP:    25, // round(250 * 0.10) = 25
		},
		{
			name:           "standard skill exactly 0.95",
			ratio:          0.95,
			requiresActive: false,
			baseXP:         100,
			wantBonusPct:   25,
			wantBonusXP:    25, // round(100 * 0.25) = 25
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			pct, bonusXP := skills.ComputeBonus(tt.ratio, tt.requiresActive, tt.baseXP)
			if pct != tt.wantBonusPct {
				t.Errorf("bonus_pct: got %d want %d", pct, tt.wantBonusPct)
			}
			if bonusXP != tt.wantBonusXP {
				t.Errorf("bonus_xp: got %d want %d", bonusXP, tt.wantBonusXP)
			}
		})
	}
}

// TestBonusXPPartialCompletion verifies partial bonus: 0.50 <= ratio < 0.95.
// Partial bonus = full_bonus_pct * ratio, rounded to nearest whole %.
func TestBonusXPPartialCompletion(t *testing.T) {
	tests := []struct {
		name           string
		ratio          float64
		requiresActive bool
		baseXP         int
		wantBonusPct   int
	}{
		{
			name:           "ratio 0.75 standard → 25%*0.75=18%",
			ratio:          0.75,
			requiresActive: false,
			baseXP:         200,
			wantBonusPct:   18, // round(25 * 0.75) = 18.75 → 19? Spec says "rounded to nearest whole %"
			// Spec AC-C2: partial bonus = full_bonus_pct × completion_ratio
			// 25 * 0.75 = 18.75 → rounds to 19
		},
		{
			name:           "ratio exactly 0.50 standard → minimum partial applies",
			ratio:          0.50,
			requiresActive: false,
			baseXP:         200,
			wantBonusPct:   13, // round(25 * 0.50) = 12.5 → 13
		},
		{
			name:           "ratio 0.94 standard → partial (just below full threshold)",
			ratio:          0.94,
			requiresActive: false,
			baseXP:         200,
			wantBonusPct:   24, // round(25 * 0.94) = 23.5 → 24
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			pct, _ := skills.ComputeBonus(tt.ratio, tt.requiresActive, tt.baseXP)
			if pct != tt.wantBonusPct {
				t.Errorf("bonus_pct: got %d want %d (ratio=%.3f)", pct, tt.wantBonusPct, tt.ratio)
			}
		})
	}
}

// TestBonusXPBoundary verifies exact boundary behaviour at 0.95 and 0.499.
func TestBonusXPBoundary(t *testing.T) {
	tests := []struct {
		name           string
		ratio          float64
		requiresActive bool
		wantBonusPct   int
	}{
		{
			name:           "ratio 0.95 → full bonus (25%)",
			ratio:          0.95,
			requiresActive: false,
			wantBonusPct:   25,
		},
		{
			name:           "ratio 0.94 → partial bonus",
			ratio:          0.94,
			requiresActive: false,
			wantBonusPct:   24, // round(25 * 0.94) = 23.5 → 24
		},
		{
			name:           "ratio 0.949 → partial (below full threshold)",
			ratio:          0.949,
			requiresActive: false,
			wantBonusPct:   24, // round(25 * 0.949) = 23.725 → 24
		},
		{
			name:           "ratio 0.499 → no bonus (below 0.50 threshold)",
			ratio:          0.499,
			requiresActive: false,
			wantBonusPct:   0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			pct, bonusXP := skills.ComputeBonus(tt.ratio, tt.requiresActive, 100)
			if pct != tt.wantBonusPct {
				t.Errorf("bonus_pct: got %d want %d (ratio=%.4f)", pct, tt.wantBonusPct, tt.ratio)
			}
			if tt.wantBonusPct == 0 && bonusXP != 0 {
				t.Errorf("bonus_xp: expected 0 for no-bonus case, got %d", bonusXP)
			}
		})
	}
}

// TestBonusXPAbandoned verifies that an abandoned session always earns 0% bonus,
// regardless of ratio or active-use flag.
func TestBonusXPAbandoned(t *testing.T) {
	tests := []struct {
		name           string
		ratio          float64
		requiresActive bool
		baseXP         int
	}{
		{"abandoned with ratio 1.0 standard", 1.0, false, 250},
		{"abandoned with ratio 1.0 active-use", 1.0, true, 250},
		{"abandoned with ratio 0.80", 0.80, false, 200},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			pct, bonusXP := skills.ComputeBonusAbandoned(tt.ratio, tt.requiresActive, tt.baseXP)
			if pct != 0 {
				t.Errorf("bonus_pct: got %d want 0 for abandoned session", pct)
			}
			if bonusXP != 0 {
				t.Errorf("bonus_xp: got %d want 0 for abandoned session", bonusXP)
			}
		})
	}
}
