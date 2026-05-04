// Package goals — forecast.go provides a deterministic, AI-free forecast
// engine for goals. All inputs are plain Go values; no DB calls happen here.
package goals

import (
	"math"
	"time"
)

// ─── Output types ─────────────────────────────────────────────────────────────

// TrackState describes whether a goal is on- or off-track relative to its
// expected pace at the current moment.
type TrackState string

const (
	TrackStateOnTrack  TrackState = "on_track"
	TrackStateOffTrack TrackState = "off_track"
	TrackStateAhead    TrackState = "ahead"
	TrackStateComplete TrackState = "complete"
	TrackStateNoData   TrackState = "no_data"
)

// DriftDirection indicates whether the goal is running ahead of, behind, or
// exactly at the expected pace.
type DriftDirection string

const (
	DriftAhead    DriftDirection = "ahead"
	DriftBehind   DriftDirection = "behind"
	DriftOnPace   DriftDirection = "on_pace"
	DriftUnknown  DriftDirection = "unknown"
)

// ForecastResult is the full deterministic forecast for a single goal at a
// given point in time. All fields are safe to serialise directly to JSON.
type ForecastResult struct {
	// TrackState classifies the current pace relative to target.
	TrackState TrackState `json:"track_state"`

	// ConfidenceScore is 0.0–1.0. Higher values indicate the goal is more
	// likely to be completed on time at the current rate of progress.
	ConfidenceScore float64 `json:"confidence_score"`

	// DriftPct is the signed percentage of expected progress that has
	// actually been achieved. Positive = ahead; negative = behind.
	// Nil when a target_date or measurable progress is unavailable.
	DriftPct *float64 `json:"drift_pct"`

	// DriftDirection summarises the sign of DriftPct.
	DriftDirection DriftDirection `json:"drift_direction"`

	// ExpectedProgress is the fraction of work [0,1] that should be done by
	// now, given a linear pace between created_at and target_date.
	// Nil when target_date is absent.
	ExpectedProgress *float64 `json:"expected_progress"`

	// ActualProgress is the fraction of measurable work [0,1] done so far.
	// Nil when the goal has no current_value / target_value pair.
	ActualProgress *float64 `json:"actual_progress"`

	// MilestoneDoneRatio is done_milestones / total_milestones. Nil when
	// there are no milestones.
	MilestoneDoneRatio *float64 `json:"milestone_done_ratio"`

	// CheckinCount is the number of check-ins recorded so far.
	CheckinCount int `json:"checkin_count"`

	// DaysRemaining is the number of whole days until target_date. Negative
	// means the deadline has passed. Nil when target_date is not set.
	DaysRemaining *int `json:"days_remaining"`

	// RecommendCheckin is true when no check-in has been recorded recently
	// (> 7 days) and the goal has a target_date in the future.
	RecommendCheckin bool `json:"recommend_checkin"`

	// RecommendReview is true when the goal is significantly off-track
	// (driftPct < –25 %) and more than 20 % of the time window remains.
	RecommendReview bool `json:"recommend_review"`

	// RecommendStretch is true when the goal is significantly ahead of pace
	// (driftPct > +30 %) with meaningful time remaining.
	RecommendStretch bool `json:"recommend_stretch"`
}

// ─── Input ────────────────────────────────────────────────────────────────────

// ForecastInput contains all data needed to compute a forecast without hitting
// the database a second time. The caller (handler) is responsible for fetching
// and populating these fields.
type ForecastInput struct {
	Goal       Goal
	Checkins   []Checkin   // newest first; may be empty
	Milestones []Milestone // order does not matter; may be empty
	Now        time.Time   // injection point for deterministic tests
}

// ─── Engine ───────────────────────────────────────────────────────────────────

// ComputeForecast derives a ForecastResult from ForecastInput using only
// arithmetic — no randomness, no AI, no external calls.
func ComputeForecast(in ForecastInput) ForecastResult {
	now := in.Now
	if now.IsZero() {
		now = time.Now().UTC()
	}

	goal := in.Goal

	// ── Shortcut: already completed / abandoned ────────────────────────────
	if goal.Status == StatusCompleted {
		one := 1.0
		return ForecastResult{
			TrackState:      TrackStateComplete,
			ConfidenceScore: 1.0,
			ActualProgress:  &one,
			CheckinCount:    len(in.Checkins),
		}
	}

	result := ForecastResult{
		CheckinCount:   len(in.Checkins),
		TrackState:     TrackStateNoData,
		DriftDirection: DriftUnknown,
	}

	// ── Time window ────────────────────────────────────────────────────────
	var expectedProgress *float64
	var daysRemaining *int
	if goal.TargetDate != nil {
		target := goal.TargetDate.UTC()
		totalDuration := target.Sub(goal.CreatedAt.UTC())
		elapsed := now.Sub(goal.CreatedAt.UTC())

		ep := 0.0
		if totalDuration > 0 {
			ep = clamp01(elapsed.Seconds() / totalDuration.Seconds())
		} else if !now.Before(target) {
			ep = 1.0
		}
		expectedProgress = &ep

		days := int(math.Ceil(target.Sub(now).Hours() / 24))
		daysRemaining = &days
	}
	result.ExpectedProgress = expectedProgress
	result.DaysRemaining = daysRemaining

	// ── Measurable progress ────────────────────────────────────────────────
	var actualProgress *float64
	if goal.CurrentValue != nil && goal.TargetValue != nil && *goal.TargetValue != 0 {
		ap := clamp01(*goal.CurrentValue / *goal.TargetValue)
		actualProgress = &ap
	}
	result.ActualProgress = actualProgress

	// ── Milestone ratio ────────────────────────────────────────────────────
	if len(in.Milestones) > 0 {
		done := 0
		for _, m := range in.Milestones {
			if m.IsDone {
				done++
			}
		}
		ratio := float64(done) / float64(len(in.Milestones))
		result.MilestoneDoneRatio = &ratio
	}

	// ── Derive a unified "actual progress" signal for drift ───────────────
	// Priority: measurable value > milestone ratio > checkin-implied (none).
	progressSignal := unifiedProgress(actualProgress, result.MilestoneDoneRatio)

	// ── Drift ──────────────────────────────────────────────────────────────
	var driftPct *float64
	if progressSignal != nil && expectedProgress != nil {
		d := (*progressSignal - *expectedProgress) * 100.0
		driftPct = &d
		result.DriftPct = &d

		switch {
		case d > 5:
			result.DriftDirection = DriftAhead
		case d < -5:
			result.DriftDirection = DriftBehind
		default:
			result.DriftDirection = DriftOnPace
		}
	}

	// ── Track state ────────────────────────────────────────────────────────
	result.TrackState = deriveTrackState(driftPct, expectedProgress, daysRemaining)

	// ── Confidence score ───────────────────────────────────────────────────
	result.ConfidenceScore = deriveConfidence(
		progressSignal,
		expectedProgress,
		daysRemaining,
		len(in.Checkins),
		in.Milestones,
	)

	// ── Recommendation flags ───────────────────────────────────────────────
	result.RecommendCheckin = shouldRecommendCheckin(in.Checkins, daysRemaining, now)
	result.RecommendReview = shouldRecommendReview(driftPct, expectedProgress)
	result.RecommendStretch = shouldRecommendStretch(driftPct, expectedProgress)

	return result
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

// clamp01 clamps v to [0, 1].
func clamp01(v float64) float64 {
	if v < 0 {
		return 0
	}
	if v > 1 {
		return 1
	}
	return v
}

// unifiedProgress returns the best available progress fraction.
// Measurable value wins; milestone ratio is the fallback.
func unifiedProgress(measurable, milestoneRatio *float64) *float64 {
	if measurable != nil {
		return measurable
	}
	return milestoneRatio
}

// deriveTrackState maps drift and deadline context to a TrackState value.
func deriveTrackState(driftPct, expectedProgress *float64, daysRemaining *int) TrackState {
	if driftPct == nil {
		if expectedProgress == nil {
			return TrackStateNoData
		}
		// We have a time window but no progress signal — treat as no data.
		return TrackStateNoData
	}

	// Past deadline with incomplete progress.
	if daysRemaining != nil && *daysRemaining < 0 {
		return TrackStateOffTrack
	}

	switch {
	case *driftPct > 5:
		return TrackStateAhead
	case *driftPct < -5:
		return TrackStateOffTrack
	default:
		return TrackStateOnTrack
	}
}

// deriveConfidence computes a [0,1] confidence score. The algorithm is
// intentionally simple and transparent:
//
//   - Base score comes from the ratio of actual progress to expected progress.
//   - Bonus for frequent check-ins (up to +0.10).
//   - Bonus for milestone completion ratio (up to +0.05).
//   - Penalty when the deadline has already passed.
//   - Returns 0.5 when there is insufficient data.
func deriveConfidence(
	progressSignal, expectedProgress *float64,
	daysRemaining *int,
	checkinCount int,
	milestones []Milestone,
) float64 {
	if progressSignal == nil || expectedProgress == nil {
		// Insufficient data: neutral score.
		return 0.5
	}

	expected := *expectedProgress
	// Require at least 2 % of the time window to have elapsed before we form
	// a view. Below that threshold the signal is too noisy to be meaningful.
	if expected < 0.02 {
		return 0.5
	}

	// Base: how does actual compare to expected pace?
	base := clamp01(*progressSignal / expected)

	// Check-in engagement bonus (max +0.10, logarithmic).
	checkinBonus := 0.0
	if checkinCount > 0 {
		checkinBonus = math.Min(0.10, math.Log1p(float64(checkinCount))*0.025)
	}

	// Milestone completion bonus (max +0.05).
	msBonus := 0.0
	if len(milestones) > 0 {
		done := 0
		for _, m := range milestones {
			if m.IsDone {
				done++
			}
		}
		msBonus = float64(done) / float64(len(milestones)) * 0.05
	}

	score := base + checkinBonus + msBonus

	// Penalty: deadline has passed and goal not complete.
	if daysRemaining != nil && *daysRemaining < 0 {
		overdueDays := -(*daysRemaining)
		penalty := math.Min(0.5, float64(overdueDays)*0.02)
		score -= penalty
	}

	return math.Round(clamp01(score)*1000) / 1000 // round to 3 dp
}

// shouldRecommendCheckin returns true when the user hasn't checked in recently
// (more than 7 days) and the goal deadline is still in the future.
func shouldRecommendCheckin(checkins []Checkin, daysRemaining *int, now time.Time) bool {
	if daysRemaining != nil && *daysRemaining <= 0 {
		return false // past deadline — no point
	}
	if len(checkins) == 0 {
		return true
	}
	// checkins are newest-first per ListCheckins ordering.
	latest := checkins[0].CreatedAt
	return now.Sub(latest) > 7*24*time.Hour
}

// shouldRecommendReview returns true when the goal is significantly behind
// and there is still meaningful time remaining (expected < 80 %).
func shouldRecommendReview(driftPct, expectedProgress *float64) bool {
	if driftPct == nil || expectedProgress == nil {
		return false
	}
	return *driftPct < -25 && *expectedProgress < 0.80
}

// shouldRecommendStretch returns true when the goal is comfortably ahead and
// the user still has meaningful time remaining to raise the bar.
func shouldRecommendStretch(driftPct, expectedProgress *float64) bool {
	if driftPct == nil || expectedProgress == nil {
		return false
	}
	return *driftPct > 30 && *expectedProgress < 0.80
}
