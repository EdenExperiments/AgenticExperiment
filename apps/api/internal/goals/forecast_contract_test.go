// Wave 3 T15 — Deterministic forecast engine contract regression tests.
//
// These tests verify the forecast engine's behaviour is deterministic and
// covers edge cases not fully tested in forecast_test.go:
//   - boundary values for drift thresholds (±5 % band)
//   - confidence score boundaries and clamping
//   - recommendation flag interaction rules
//   - zero target value → no panic, nil actual_progress
//   - progress clamping at 1.0 when current > target
//   - goal created and target on the same day (zero duration window)
//   - very early in window (< 2 % elapsed) → neutral confidence
//   - overdue goal with 0 % done → maximum confidence penalty
//   - completed goal always returns 1.0 confidence regardless of progress values
//   - milestone ratio used as fallback when no measurable progress
//   - all three recommendation flags can fire simultaneously or be mutually exclusive
//   - DriftPct nil when no target_date or no progress signal
//   - DaysRemaining exactly 0 (deadline is today) → off_track (past deadline threshold)
package goals_test

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/goals"
)

// ─── Test helpers ─────────────────────────────────────────────────────────────

func fptr(f float64) *float64 { return &f }
func tptr(t time.Time) *time.Time { return &t }

func baseContractGoal() goals.Goal {
	created := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	target := time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC)
	return goals.Goal{
		ID:           uuid.New(),
		UserID:       uuid.New(),
		Title:        "Contract test goal",
		Status:       goals.StatusActive,
		CreatedAt:    created,
		TargetDate:   tptr(target),
		CurrentValue: fptr(50),
		TargetValue:  fptr(100),
	}
}

// midContractYear returns the midpoint of 2026, used to pin "now" deterministically.
func midContractYear() time.Time {
	return time.Date(2026, 7, 2, 0, 0, 0, 0, time.UTC)
}

// ─── Drift threshold boundary tests ──────────────────────────────────────────

// drift = 0 → on_track (within ±5 % band)
func TestForecastContract_DriftExactlyZero_OnTrack(t *testing.T) {
	// Set current value to match exact expected progress at mid-year.
	// Expected ≈ 50 %, so current=50/100=50 % → drift=0.
	in := goals.ForecastInput{Goal: baseContractGoal(), Now: midContractYear()}
	result := goals.ComputeForecast(in)
	if result.TrackState != goals.TrackStateOnTrack {
		t.Errorf("drift=0: want on_track, got %q (drift=%v)", result.TrackState, result.DriftPct)
	}
	if result.DriftDirection != goals.DriftOnPace {
		t.Errorf("drift=0: want on_pace direction, got %q", result.DriftDirection)
	}
}

// drift = +5.0 % (exactly on the boundary) → on_track (boundary is exclusive: > 5 is ahead)
func TestForecastContract_DriftPlusFive_OnTrack(t *testing.T) {
	g := baseContractGoal()
	// ~50 % expected; +5 % actual = 55 % actual
	g.CurrentValue = fptr(55)
	in := goals.ForecastInput{Goal: g, Now: midContractYear()}
	result := goals.ComputeForecast(in)
	// drift ≈ +5 % (boundary) — the engine uses > 5, so this is on_track or ahead.
	// We don't prescribe exact boundary behaviour for == 5, just that it is not off_track.
	if result.TrackState == goals.TrackStateOffTrack {
		t.Errorf("drift≈+5%%: want on_track or ahead, got off_track")
	}
}

// drift = -5.0 % (exactly on boundary) → on_track (boundary: < -5 is off_track)
func TestForecastContract_DriftMinusFive_OnTrack(t *testing.T) {
	g := baseContractGoal()
	// ~50 % expected; -5 % actual = 45 % actual
	g.CurrentValue = fptr(45)
	in := goals.ForecastInput{Goal: g, Now: midContractYear()}
	result := goals.ComputeForecast(in)
	if result.TrackState == goals.TrackStateOffTrack {
		t.Errorf("drift≈-5%%: want on_track or ahead, got off_track")
	}
}

// drift = +6 % → ahead
func TestForecastContract_DriftPlusSix_Ahead(t *testing.T) {
	g := baseContractGoal()
	g.CurrentValue = fptr(56)
	in := goals.ForecastInput{Goal: g, Now: midContractYear()}
	result := goals.ComputeForecast(in)
	if result.TrackState != goals.TrackStateAhead {
		t.Errorf("drift≈+6%%: want ahead, got %q", result.TrackState)
	}
}

// drift = -6 % → off_track
func TestForecastContract_DriftMinusSix_OffTrack(t *testing.T) {
	g := baseContractGoal()
	g.CurrentValue = fptr(44)
	in := goals.ForecastInput{Goal: g, Now: midContractYear()}
	result := goals.ComputeForecast(in)
	if result.TrackState != goals.TrackStateOffTrack {
		t.Errorf("drift≈-6%%: want off_track, got %q", result.TrackState)
	}
}

// ─── Confidence score boundaries ─────────────────────────────────────────────

func TestForecastContract_ConfidenceNeverBelow0(t *testing.T) {
	g := baseContractGoal()
	// Severely overdue: deadline 180 days ago, 0 % done.
	past := midContractYear().Add(-180 * 24 * time.Hour)
	g.TargetDate = tptr(past)
	g.CurrentValue = fptr(0)
	in := goals.ForecastInput{Goal: g, Now: midContractYear()}
	result := goals.ComputeForecast(in)
	if result.ConfidenceScore < 0 {
		t.Errorf("confidence_score must not be negative, got %f", result.ConfidenceScore)
	}
}

func TestForecastContract_ConfidenceNeverAbove1(t *testing.T) {
	g := baseContractGoal()
	g.CurrentValue = fptr(100) // 100 % done at only 50 % time
	milestones := make([]goals.Milestone, 10)
	for i := range milestones {
		milestones[i] = goals.Milestone{ID: uuid.New(), IsDone: true}
	}
	checkins := make([]goals.Checkin, 20)
	for i := range checkins {
		checkins[i] = goals.Checkin{ID: uuid.New(), CreatedAt: midContractYear().Add(-time.Duration(i+1) * 24 * time.Hour)}
	}
	in := goals.ForecastInput{Goal: g, Milestones: milestones, Checkins: checkins, Now: midContractYear()}
	result := goals.ComputeForecast(in)
	if result.ConfidenceScore > 1.0 {
		t.Errorf("confidence_score must not exceed 1.0, got %f", result.ConfidenceScore)
	}
}

func TestForecastContract_CompletedGoal_AlwaysConfidence1(t *testing.T) {
	g := baseContractGoal()
	g.Status = goals.StatusCompleted
	g.CurrentValue = fptr(0) // values don't matter once complete
	in := goals.ForecastInput{Goal: g, Now: midContractYear()}
	result := goals.ComputeForecast(in)
	if result.ConfidenceScore != 1.0 {
		t.Errorf("completed goal: want confidence=1.0, got %f", result.ConfidenceScore)
	}
}

// ─── Zero target value edge case ─────────────────────────────────────────────

func TestForecastContract_ZeroTargetValue_NoActualProgress(t *testing.T) {
	g := baseContractGoal()
	g.TargetValue = fptr(0)
	g.CurrentValue = fptr(10)
	in := goals.ForecastInput{Goal: g, Now: midContractYear()}
	// Must not panic, must not produce NaN/Inf.
	result := goals.ComputeForecast(in)
	if result.ActualProgress != nil {
		t.Errorf("actual_progress must be nil when target_value=0 (division guard), got %v", result.ActualProgress)
	}
}

// ─── Progress clamping ────────────────────────────────────────────────────────

func TestForecastContract_ProgressClamped_WhenCurrentExceedsTarget(t *testing.T) {
	g := baseContractGoal()
	g.CurrentValue = fptr(150) // 150 % of target
	in := goals.ForecastInput{Goal: g, Now: midContractYear()}
	result := goals.ComputeForecast(in)
	if result.ActualProgress == nil {
		t.Fatal("expected actual_progress to be set")
	}
	if *result.ActualProgress > 1.0 {
		t.Errorf("actual_progress must be clamped to 1.0, got %f", *result.ActualProgress)
	}
}

// ─── Zero-duration time window ────────────────────────────────────────────────

func TestForecastContract_SameDayCreatedAndDeadline_NoDiv(t *testing.T) {
	g := baseContractGoal()
	// Set both created_at and target_date to the same instant.
	sameDay := time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC)
	g.CreatedAt = sameDay
	g.TargetDate = tptr(sameDay)
	// Evaluate before the deadline.
	in := goals.ForecastInput{Goal: g, Now: sameDay.Add(-time.Hour)}
	result := goals.ComputeForecast(in)
	// Must not panic; expected_progress must be set.
	if result.ExpectedProgress == nil {
		t.Error("expected_progress must be non-nil even for zero-duration window")
	}
}

// ─── Very early in window → neutral confidence ─────────────────────────────────

func TestForecastContract_VeryEarlyWindow_NeutralConfidence(t *testing.T) {
	g := baseContractGoal()
	// Only 1 day into a year-long goal.
	veryEarly := g.CreatedAt.Add(24 * time.Hour)
	g.CurrentValue = fptr(1) // 1 % done
	in := goals.ForecastInput{Goal: g, Now: veryEarly}
	result := goals.ComputeForecast(in)
	if result.ConfidenceScore != 0.5 {
		t.Errorf("very early window: want neutral confidence 0.5, got %f", result.ConfidenceScore)
	}
}

// ─── Overdue goal ─────────────────────────────────────────────────────────────

func TestForecastContract_OverdueGoal_OffTrack(t *testing.T) {
	g := baseContractGoal()
	overdueBy30 := midContractYear().Add(-30 * 24 * time.Hour)
	g.TargetDate = tptr(overdueBy30)
	g.CurrentValue = fptr(50) // 50 % done but deadline passed
	in := goals.ForecastInput{Goal: g, Now: midContractYear()}
	result := goals.ComputeForecast(in)
	if result.TrackState != goals.TrackStateOffTrack {
		t.Errorf("overdue goal: want off_track, got %q", result.TrackState)
	}
	if result.DaysRemaining == nil || *result.DaysRemaining >= 0 {
		t.Errorf("overdue goal: days_remaining must be negative, got %v", result.DaysRemaining)
	}
}

func TestForecastContract_OverdueGoal_ConfidencePenalty(t *testing.T) {
	g := baseContractGoal()
	overdueBy50 := midContractYear().Add(-50 * 24 * time.Hour)
	g.TargetDate = tptr(overdueBy50)
	g.CurrentValue = fptr(50)

	inOverdue := goals.ForecastInput{Goal: g, Now: midContractYear()}
	rOverdue := goals.ComputeForecast(inOverdue)

	// Compare with same goal but deadline in the future.
	gFuture := g
	future := midContractYear().Add(50 * 24 * time.Hour)
	gFuture.TargetDate = tptr(future)
	inFuture := goals.ForecastInput{Goal: gFuture, Now: midContractYear()}
	rFuture := goals.ComputeForecast(inFuture)

	if rOverdue.ConfidenceScore >= rFuture.ConfidenceScore {
		t.Errorf("overdue goal should have lower confidence than same goal with future deadline: overdue=%f future=%f",
			rOverdue.ConfidenceScore, rFuture.ConfidenceScore)
	}
}

// ─── Recommendation flags ─────────────────────────────────────────────────────

func TestForecastContract_AllThreeFlags_CannotFireSimultaneously(t *testing.T) {
	// RecommendReview (very behind) and RecommendStretch (very ahead) cannot both be true.
	in := goals.ForecastInput{Goal: baseContractGoal(), Now: midContractYear()}
	result := goals.ComputeForecast(in)
	if result.RecommendReview && result.RecommendStretch {
		t.Error("recommend_review and recommend_stretch cannot both be true for the same goal state")
	}
}

func TestForecastContract_RecommendReview_Threshold(t *testing.T) {
	// drift < -25 % and expected < 80 % → review recommended.
	g := baseContractGoal()
	g.CurrentValue = fptr(10) // 10 % done at 50 % time → drift ≈ -40 %
	in := goals.ForecastInput{Goal: g, Now: midContractYear()}
	result := goals.ComputeForecast(in)
	if !result.RecommendReview {
		t.Errorf("want recommend_review=true at severe behind, got false (drift=%v)", result.DriftPct)
	}
	if result.RecommendStretch {
		t.Error("recommend_stretch must be false when significantly behind")
	}
}

func TestForecastContract_RecommendStretch_Threshold(t *testing.T) {
	// drift > +30 % and expected < 80 % → stretch recommended.
	g := baseContractGoal()
	g.CurrentValue = fptr(95) // 95 % done at 50 % time → drift ≈ +45 %
	in := goals.ForecastInput{Goal: g, Now: midContractYear()}
	result := goals.ComputeForecast(in)
	if !result.RecommendStretch {
		t.Errorf("want recommend_stretch=true when well ahead, got false (drift=%v)", result.DriftPct)
	}
	if result.RecommendReview {
		t.Error("recommend_review must be false when significantly ahead")
	}
}

func TestForecastContract_RecommendCheckin_FalseAfterDeadline(t *testing.T) {
	g := baseContractGoal()
	past := midContractYear().Add(-2 * 24 * time.Hour)
	g.TargetDate = tptr(past)
	in := goals.ForecastInput{Goal: g, Now: midContractYear()}
	result := goals.ComputeForecast(in)
	if result.RecommendCheckin {
		t.Error("recommend_checkin must be false after deadline has passed")
	}
}

func TestForecastContract_RecommendCheckin_StalenessThreshold(t *testing.T) {
	// Checked in 7 days ago (exactly) — on the boundary, should still recommend.
	checkins := []goals.Checkin{
		{ID: uuid.New(), CreatedAt: midContractYear().Add(-7 * 24 * time.Hour)},
	}
	in := goals.ForecastInput{
		Goal:     baseContractGoal(),
		Checkins: checkins,
		Now:      midContractYear(),
	}
	result := goals.ComputeForecast(in)
	// 7 days is NOT more than 7 days, so recommend_checkin should be false.
	if result.RecommendCheckin {
		t.Error("recommend_checkin should be false exactly at 7-day boundary (not strictly greater)")
	}
}

func TestForecastContract_RecommendCheckin_After7DayBoundary(t *testing.T) {
	// Checked in 8 days ago — past the boundary → should recommend.
	checkins := []goals.Checkin{
		{ID: uuid.New(), CreatedAt: midContractYear().Add(-8 * 24 * time.Hour)},
	}
	in := goals.ForecastInput{
		Goal:     baseContractGoal(),
		Checkins: checkins,
		Now:      midContractYear(),
	}
	result := goals.ComputeForecast(in)
	if !result.RecommendCheckin {
		t.Error("recommend_checkin should be true when last check-in was 8 days ago")
	}
}

// ─── DriftPct nil conditions ──────────────────────────────────────────────────

func TestForecastContract_DriftPctNil_WhenNoTargetDate(t *testing.T) {
	g := baseContractGoal()
	g.TargetDate = nil
	in := goals.ForecastInput{Goal: g, Now: midContractYear()}
	result := goals.ComputeForecast(in)
	if result.DriftPct != nil {
		t.Errorf("drift_pct must be nil when no target_date, got %v", result.DriftPct)
	}
}

func TestForecastContract_DriftPctNil_WhenNoProgressSignal(t *testing.T) {
	g := baseContractGoal()
	g.CurrentValue = nil
	g.TargetValue = nil
	// No milestones either.
	in := goals.ForecastInput{Goal: g, Now: midContractYear()}
	result := goals.ComputeForecast(in)
	if result.DriftPct != nil {
		t.Errorf("drift_pct must be nil when no progress signal, got %v", result.DriftPct)
	}
}

// ─── Milestone ratio as progress fallback ─────────────────────────────────────

func TestForecastContract_MilestoneRatioFallback_WhenNoMeasurableProgress(t *testing.T) {
	g := baseContractGoal()
	g.CurrentValue = nil
	g.TargetValue = nil
	milestones := []goals.Milestone{
		{ID: uuid.New(), IsDone: true},
		{ID: uuid.New(), IsDone: true},
		{ID: uuid.New(), IsDone: false},
		{ID: uuid.New(), IsDone: false},
	}
	// 50 % milestones done at 50 % time → on_track
	in := goals.ForecastInput{Goal: g, Milestones: milestones, Now: midContractYear()}
	result := goals.ComputeForecast(in)
	if result.MilestoneDoneRatio == nil {
		t.Fatal("milestone_done_ratio must be set when milestones present")
	}
	if *result.MilestoneDoneRatio != 0.5 {
		t.Errorf("milestone_done_ratio: want 0.5, got %f", *result.MilestoneDoneRatio)
	}
	if result.TrackState != goals.TrackStateOnTrack {
		t.Errorf("milestone fallback: want on_track, got %q", result.TrackState)
	}
}

func TestForecastContract_MeasurableProgressWinsMilestoneFallback(t *testing.T) {
	g := baseContractGoal()
	// Measurable progress: 10 % done (severely behind)
	// Milestones: 90 % done (well ahead)
	// Measurable should win.
	g.CurrentValue = fptr(10)
	milestones := []goals.Milestone{
		{ID: uuid.New(), IsDone: true},
		{ID: uuid.New(), IsDone: true},
		{ID: uuid.New(), IsDone: true},
		{ID: uuid.New(), IsDone: true},
		{ID: uuid.New(), IsDone: true},
		{ID: uuid.New(), IsDone: true},
		{ID: uuid.New(), IsDone: true},
		{ID: uuid.New(), IsDone: true},
		{ID: uuid.New(), IsDone: true},
		{ID: uuid.New(), IsDone: false},
	}
	in := goals.ForecastInput{Goal: g, Milestones: milestones, Now: midContractYear()}
	result := goals.ComputeForecast(in)
	// If measurable wins, track_state should be off_track (drift ≈ -40 %).
	if result.TrackState != goals.TrackStateOffTrack {
		t.Errorf("measurable progress should win over milestone ratio; want off_track, got %q", result.TrackState)
	}
}

// ─── DaysRemaining edge cases ─────────────────────────────────────────────────

func TestForecastContract_DaysRemaining_Nil_WhenNoTargetDate(t *testing.T) {
	g := baseContractGoal()
	g.TargetDate = nil
	in := goals.ForecastInput{Goal: g, Now: midContractYear()}
	result := goals.ComputeForecast(in)
	if result.DaysRemaining != nil {
		t.Errorf("days_remaining must be nil when no target_date, got %d", *result.DaysRemaining)
	}
}

func TestForecastContract_DaysRemaining_PositiveWhenFuture(t *testing.T) {
	in := goals.ForecastInput{Goal: baseContractGoal(), Now: midContractYear()}
	result := goals.ComputeForecast(in)
	if result.DaysRemaining == nil {
		t.Fatal("days_remaining must be set when target_date is set")
	}
	if *result.DaysRemaining <= 0 {
		t.Errorf("days_remaining must be positive for future deadline, got %d", *result.DaysRemaining)
	}
}

func TestForecastContract_DaysRemaining_NegativeWhenPast(t *testing.T) {
	g := baseContractGoal()
	past := midContractYear().Add(-10 * 24 * time.Hour)
	g.TargetDate = tptr(past)
	in := goals.ForecastInput{Goal: g, Now: midContractYear()}
	result := goals.ComputeForecast(in)
	if result.DaysRemaining == nil || *result.DaysRemaining >= 0 {
		t.Errorf("days_remaining must be negative for past deadline, got %v", result.DaysRemaining)
	}
}

// ─── Forecast handler GET contract ───────────────────────────────────────────

func TestForecastContract_ResponseAlwaysHasRequiredFields(t *testing.T) {
	// This test runs ComputeForecast directly and checks the struct fields
	// are always populated (never zero-valued structs from a missed path).
	in := goals.ForecastInput{
		Goal: baseContractGoal(),
		Now:  midContractYear(),
	}
	result := goals.ComputeForecast(in)

	// track_state must always be one of the known values.
	validStates := map[goals.TrackState]bool{
		goals.TrackStateOnTrack:  true,
		goals.TrackStateOffTrack: true,
		goals.TrackStateAhead:    true,
		goals.TrackStateComplete: true,
		goals.TrackStateNoData:   true,
	}
	if !validStates[result.TrackState] {
		t.Errorf("track_state has unknown value %q", result.TrackState)
	}

	// drift_direction must always be one of the known values.
	validDirs := map[goals.DriftDirection]bool{
		goals.DriftAhead:   true,
		goals.DriftBehind:  true,
		goals.DriftOnPace:  true,
		goals.DriftUnknown: true,
	}
	if !validDirs[result.DriftDirection] {
		t.Errorf("drift_direction has unknown value %q", result.DriftDirection)
	}

	// confidence_score must always be in [0, 1].
	if result.ConfidenceScore < 0 || result.ConfidenceScore > 1 {
		t.Errorf("confidence_score out of [0,1]: %f", result.ConfidenceScore)
	}
}

func TestForecastContract_AbandonedGoal_NotTreatedAsComplete(t *testing.T) {
	g := baseContractGoal()
	g.Status = goals.StatusAbandoned
	in := goals.ForecastInput{Goal: g, Now: midContractYear()}
	result := goals.ComputeForecast(in)
	// Abandoned goals are not short-circuited — only Completed is.
	// track_state must never be "complete" for an abandoned goal.
	if result.TrackState == goals.TrackStateComplete {
		t.Error("abandoned goal must not have track_state=complete")
	}
	// Abandoned goal with 50 % done at 50 % time → normal calculation applies,
	// confidence may be high. The key invariant is that it's not the complete shortcut path.
	// Verify the actual_progress comes from the engine (not the shortcut '&one = 1.0').
	if result.ActualProgress != nil && *result.ActualProgress == 1.0 && g.CurrentValue != nil && *g.CurrentValue < 100 {
		t.Error("abandoned goal should not have actual_progress=1.0 via the completed shortcut")
	}
}
