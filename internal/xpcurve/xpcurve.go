// Package xpcurve implements the XP progression formula for RpgTracker.
// It is the single source of truth for level computation and is used by
// every handler that writes or displays XP. All arithmetic is pure integer math.
package xpcurve

const MaxLevel = 200

// TierMultiplier returns the base multiplier for a given level.
func TierMultiplier(level int) int {
	switch {
	case level < 10:
		return 100 // Tier 1:  Novice
	case level < 20:
		return 125 // Tier 2:  Apprentice
	case level < 30:
		return 155 // Tier 3:  Adept
	case level < 40:
		return 190 // Tier 4:  Journeyman
	case level < 50:
		return 230 // Tier 5:  Practitioner
	case level < 60:
		return 275 // Tier 6:  Expert
	case level < 70:
		return 325 // Tier 7:  Veteran
	case level < 80:
		return 380 // Tier 8:  Elite
	case level < 90:
		return 440 // Tier 9:  Master
	case level < 100:
		return 510 // Tier 10: Grandmaster
	default:
		return 600 // Tier 11: Legend
	}
}

// TierNumber returns the 1-based tier number for a given level (1=Novice … 11=Legend).
func TierNumber(level int) int {
	if level >= 100 {
		return 11
	}
	return level/10 + 1
}

// XPToReachLevel returns cumulative XP required to reach a given level.
func XPToReachLevel(level int) int {
	return TierMultiplier(level) * level * level
}

// LevelForXP returns the highest level whose threshold <= totalXP, capped at MaxLevel.
func LevelForXP(totalXP int) int {
	level := 1
	for level < MaxLevel && XPToReachLevel(level+1) <= totalXP {
		level++
	}
	return level
}

// XPForCurrentLevel returns XP accumulated within the current level band.
func XPForCurrentLevel(totalXP int) int {
	threshold := XPToReachLevel(LevelForXP(totalXP))
	if totalXP < threshold {
		return totalXP
	}
	return totalXP - threshold
}

// XPToNextLevel returns XP remaining to reach the next level; 0 if at MaxLevel.
func XPToNextLevel(totalXP int) int {
	level := LevelForXP(totalXP)
	if level >= MaxLevel {
		return 0
	}
	return XPToReachLevel(level+1) - totalXP
}

// TierName returns the tier name for a given level.
func TierName(level int) string {
	switch {
	case level < 10:
		return "Novice"
	case level < 20:
		return "Apprentice"
	case level < 30:
		return "Adept"
	case level < 40:
		return "Journeyman"
	case level < 50:
		return "Practitioner"
	case level < 60:
		return "Expert"
	case level < 70:
		return "Veteran"
	case level < 80:
		return "Elite"
	case level < 90:
		return "Master"
	case level < 100:
		return "Grandmaster"
	default:
		return "Legend"
	}
}

// TierColorClass returns the CSS class token for the tier (matches TASK-103 CSS vars).
func TierColorClass(level int) string {
	switch {
	case level < 10:
		return "tier-novice"
	case level < 20:
		return "tier-apprentice"
	case level < 30:
		return "tier-adept"
	case level < 40:
		return "tier-journeyman"
	case level < 50:
		return "tier-practitioner"
	case level < 60:
		return "tier-expert"
	case level < 70:
		return "tier-veteran"
	case level < 80:
		return "tier-elite"
	case level < 90:
		return "tier-master"
	case level < 100:
		return "tier-grandmaster"
	default:
		return "tier-legend"
	}
}

// QuickLogChips returns the four preset XP chip amounts for the given level.
// Base amounts [50,100,250,500] scale by 40% per tier, rounded to nearest 25.
// Integer formula: raw = b * (10 + 4*(tier-1)); result = ((raw+125)/250)*25
// This avoids floating-point while producing identical results to math.Round(b*scale/25)*25.
func QuickLogChips(level int) [4]int {
	tier := TierNumber(level)
	base := [4]int{50, 100, 250, 500}
	var result [4]int
	for i, b := range base {
		raw := b * (10 + 4*(tier-1))
		result[i] = ((raw + 125) / 250) * 25
	}
	return result
}
