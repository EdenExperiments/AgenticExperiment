package xpcurve

import (
	"math"
	"testing"
)

func TestLevelForXP(t *testing.T) {
	cases := []struct {
		xp    int
		level int
	}{
		{100, 1},
		{12500, 10},
		{62000, 20},
		{171000, 30},
		{368000, 40},
		{687500, 50},
		{1170000, 60},
		{1862000, 70},
		{2816000, 80},
		{4131000, 90},
		{6000000, 100},
		{24000000, 200},
		{99999999, 200},
	}

	for _, tc := range cases {
		got := LevelForXP(tc.xp)
		if got != tc.level {
			t.Errorf("LevelForXP(%d) = %d, want %d", tc.xp, got, tc.level)
		}
	}
}

func TestXPToReachLevel(t *testing.T) {
	cases := []struct {
		level int
		xp    int
	}{
		{1, 100},
		{10, 12500},
		{100, 6000000},
		{200, 24000000},
	}

	for _, tc := range cases {
		got := XPToReachLevel(tc.level)
		if got != tc.xp {
			t.Errorf("XPToReachLevel(%d) = %d, want %d", tc.level, got, tc.xp)
		}
	}
}

func TestTierMultiplier(t *testing.T) {
	cases := []struct {
		level      int
		multiplier int
	}{
		{1, 100},
		{9, 100},
		{10, 125},
		{19, 125},
		{20, 155},
		{29, 155},
		{30, 190},
		{39, 190},
		{40, 230},
		{49, 230},
		{50, 275},
		{59, 275},
		{60, 325},
		{69, 325},
		{70, 380},
		{79, 380},
		{80, 440},
		{89, 440},
		{90, 510},
		{99, 510},
		{100, 600},
		{150, 600},
		{200, 600},
	}

	for _, tc := range cases {
		got := TierMultiplier(tc.level)
		if got != tc.multiplier {
			t.Errorf("TierMultiplier(%d) = %d, want %d", tc.level, got, tc.multiplier)
		}
	}
}

func TestTierNumber(t *testing.T) {
	cases := []struct {
		level int
		tier  int
	}{
		{1, 1},
		{9, 1},
		{10, 2},
		{19, 2},
		{99, 10},
		{100, 11},
		{200, 11},
	}

	for _, tc := range cases {
		got := TierNumber(tc.level)
		if got != tc.tier {
			t.Errorf("TierNumber(%d) = %d, want %d", tc.level, got, tc.tier)
		}
	}
}

func TestQuickLogChips(t *testing.T) {
	cases := []struct {
		level    int
		expected [4]int
	}{
		{1, [4]int{50, 100, 250, 500}},
		{100, [4]int{250, 500, 1250, 2500}},
	}

	for _, tc := range cases {
		got := QuickLogChips(tc.level)
		if got != tc.expected {
			t.Errorf("QuickLogChips(%d) = %v, want %v", tc.level, got, tc.expected)
		}
	}
}

func TestLevelForXP_NoInfiniteLoop(t *testing.T) {
	got := LevelForXP(math.MaxInt)
	if got != MaxLevel {
		t.Errorf("LevelForXP(math.MaxInt) = %d, want %d", got, MaxLevel)
	}
}

func TestTierName(t *testing.T) {
	cases := []struct {
		level int
		name  string
	}{
		{1, "Novice"},
		{10, "Apprentice"},
		{20, "Adept"},
		{30, "Journeyman"},
		{40, "Practitioner"},
		{50, "Expert"},
		{60, "Veteran"},
		{70, "Elite"},
		{80, "Master"},
		{90, "Grandmaster"},
		{100, "Legend"},
	}

	for _, tc := range cases {
		got := TierName(tc.level)
		if got != tc.name {
			t.Errorf("TierName(%d) = %q, want %q", tc.level, got, tc.name)
		}
	}
}
