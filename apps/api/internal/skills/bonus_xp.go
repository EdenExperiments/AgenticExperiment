package skills

import "math"

// ComputeBonus computes the bonus percentage and bonus XP for a completed or partial session.
//
// Thresholds:
//   - ratio >= 0.95: full bonus (25% standard, 10% active-use)
//   - 0.50 <= ratio < 0.95: partial bonus = round(fullPct * ratio)
//   - ratio < 0.50: no bonus (0%)
//
// bonusXP = round(baseXP * bonusPct / 100)
func ComputeBonus(completionRatio float64, requiresActiveUse bool, baseXP int) (pct int, bonusXP int) {
	fullPct := 25
	if requiresActiveUse {
		fullPct = 10
	}

	var bonusPct int
	switch {
	case completionRatio >= 0.95:
		bonusPct = fullPct
	case completionRatio >= 0.50:
		bonusPct = int(math.Round(float64(fullPct) * completionRatio))
	default:
		bonusPct = 0
	}

	bxp := int(math.Round(float64(baseXP) * float64(bonusPct) / 100.0))
	return bonusPct, bxp
}

// ComputeBonusAbandoned always returns 0% bonus and 0 bonus XP for abandoned sessions.
// Spec AC-C3: abandoned sessions never earn a bonus regardless of ratio or skill type.
func ComputeBonusAbandoned(_ float64, _ bool, _ int) (pct int, bonusXP int) {
	return 0, 0
}
