package skills

import "time"

// ComputeStreak computes the new current and longest streak values.
//
// lastLogDate, when non-nil, is treated as a DATE value (midnight UTC) representing
// the calendar date of the last XP log. This matches how the DB stores DATE columns.
// The date portion (year/month/day) is extracted without timezone conversion.
//
// now is the current moment; the calendar date of "today" is derived by converting
// now to userTimezone before extracting the date components.
//
// Rules (D-029):
//   - If lastLogDate is nil (first ever log): streak = 1.
//   - If lastLogDate's date equals today's date in userTimezone: streak unchanged (same day, already counted).
//   - If lastLogDate's date is exactly yesterday in userTimezone: streak increments by 1.
//   - Otherwise (gap > 1 day): streak resets to 1.
//   - longestStreak never decreases.
func ComputeStreak(lastLogDate *time.Time, currentStreak int, longestStreak int, now time.Time, userTimezone string) (newStreak int, newLongest int) {
	loc, err := time.LoadLocation(userTimezone)
	if err != nil {
		loc = time.UTC
	}

	if lastLogDate == nil {
		// First log ever.
		newStreak = 1
		newLongest = longestStreak
		if newStreak > newLongest {
			newLongest = newStreak
		}
		return
	}

	// Today's calendar date in the user's timezone.
	nowInLoc := now.In(loc)
	nowYear, nowMonth, nowDay := nowInLoc.Date()

	// lastLogDate's calendar date — treated as a DATE (UTC midnight), so we extract
	// the year/month/day directly without any timezone shift.
	lastYear, lastMonth, lastDay := lastLogDate.UTC().Date()

	// Compute the difference in days by building time.Time values in UTC.
	todayUTC := time.Date(nowYear, nowMonth, nowDay, 0, 0, 0, 0, time.UTC)
	lastUTC := time.Date(lastYear, lastMonth, lastDay, 0, 0, 0, 0, time.UTC)

	diff := todayUTC.Sub(lastUTC)
	days := int(diff.Hours() / 24)

	switch {
	case days == 0:
		// Same calendar day — streak already counted, no change.
		newStreak = currentStreak
	case days == 1:
		// Consecutive day — increment streak.
		newStreak = currentStreak + 1
	default:
		// Gap (or future date) — reset streak to 1.
		newStreak = 1
	}

	newLongest = longestStreak
	if newStreak > newLongest {
		newLongest = newStreak
	}
	return
}

// StreakResult carries the streak state returned to callers after a LogXP call.
type StreakResult struct {
	Current int `json:"current"`
	Longest int `json:"longest"`
}
