package skills_test

import (
	"testing"
	"time"

	"github.com/meden/rpgtracker/internal/skills"
)

// TestStreakNewSkill verifies that the first log always produces streak=1.
func TestStreakNewSkill(t *testing.T) {
	now := time.Now()
	// lastLogDate is nil for a new skill (never logged).
	current, longest := skills.ComputeStreak(nil, 0, 0, now, "UTC")
	if current != 1 {
		t.Errorf("current_streak: got %d want 1 for first log", current)
	}
	if longest != 1 {
		t.Errorf("longest_streak: got %d want 1 for first log", longest)
	}
}

// TestStreakConsecutiveDays verifies that logging today after logging yesterday increments streak by 1.
func TestStreakConsecutiveDays(t *testing.T) {
	tz := "UTC"
	loc, _ := time.LoadLocation(tz)
	yesterday := time.Now().In(loc).AddDate(0, 0, -1).Truncate(24 * time.Hour)

	current, longest := skills.ComputeStreak(&yesterday, 1, 1, time.Now(), tz)
	if current != 2 {
		t.Errorf("current_streak: got %d want 2 for consecutive days", current)
	}
	if longest < 2 {
		t.Errorf("longest_streak: got %d want >= 2", longest)
	}
}

// TestStreakGapResets verifies that a gap of 1 calendar day resets the current streak to 1.
func TestStreakGapResets(t *testing.T) {
	tz := "UTC"
	loc, _ := time.LoadLocation(tz)
	// Last log was 2 days ago — gap of 1 day (yesterday had no log).
	twoDaysAgo := time.Now().In(loc).AddDate(0, 0, -2).Truncate(24 * time.Hour)

	current, longest := skills.ComputeStreak(&twoDaysAgo, 5, 10, time.Now(), tz)
	if current != 1 {
		t.Errorf("current_streak: got %d want 1 after gap reset", current)
	}
	// longest_streak must not decrease (was 10, stays 10).
	if longest != 10 {
		t.Errorf("longest_streak: got %d want 10 (must not decrease after gap)", longest)
	}
}

// TestStreakLongestNeverDecreases verifies the longest_streak invariant:
// even when current streak drops after a gap, longest must stay at the historical max.
func TestStreakLongestNeverDecreases(t *testing.T) {
	tz := "UTC"
	loc, _ := time.LoadLocation(tz)
	twoDaysAgo := time.Now().In(loc).AddDate(0, 0, -2).Truncate(24 * time.Hour)

	_, longest := skills.ComputeStreak(&twoDaysAgo, 30, 50, time.Now(), tz)
	if longest < 50 {
		t.Errorf("longest_streak: got %d want >= 50 (must never decrease from historical max)", longest)
	}
}

// TestStreakTimezone verifies that the streak is computed relative to the user's timezone,
// not UTC. A log near midnight may fall on a different calendar date depending on timezone.
func TestStreakTimezone(t *testing.T) {
	// Use America/New_York (UTC-5 in standard time).
	// Simulate: it is currently 01:00 UTC (which is 20:00 previous day in New_York).
	// Last log was at 22:00 UTC two days ago (17:00 New_York, same calendar day as "yesterday" in NY).
	tz := "America/New_York"
	loc, err := time.LoadLocation(tz)
	if err != nil {
		t.Skipf("timezone not available: %v", err)
	}

	// Current time: 2026-03-21 01:00 UTC = 2026-03-20 21:00 in New_York
	now := time.Date(2026, 3, 21, 1, 0, 0, 0, time.UTC)
	// Last log: 2026-03-20 22:00 UTC = 2026-03-20 18:00 in New_York (same calendar day as "now" in NY)
	lastLogUTC := time.Date(2026, 3, 20, 22, 0, 0, 0, time.UTC)
	lastLogLocal := lastLogUTC.In(loc).Truncate(24 * time.Hour)

	// In New_York: now is 2026-03-20; last log was 2026-03-20 → same day → should NOT extend streak
	// (it counts as today's log, so streak stays at 1 if yesterday had no log)
	current, _ := skills.ComputeStreak(&lastLogLocal, 1, 1, now, tz)
	// Streak should remain 1 (same calendar day, not a new day in that timezone)
	if current != 1 {
		t.Errorf("current_streak: got %d want 1 (same calendar day in user timezone)", current)
	}
}
