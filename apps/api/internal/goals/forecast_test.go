package goals_test

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/goals"
)

// ─── helpers ──────────────────────────────────────────────────────────────────

func ptr(f float64) *float64 { return &f }
func ptrTime(t time.Time) *time.Time { return &t }

func baseGoal() goals.Goal {
	created := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	target := time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC)
	return goals.Goal{
		ID:           uuid.New(),
		UserID:       uuid.New(),
		Title:        "Run a marathon",
		Status:       goals.StatusActive,
		CreatedAt:    created,
		TargetDate:   ptrTime(target),
		CurrentValue: ptr(50),
		TargetValue:  ptr(100),
	}
}

// now is pinned to exactly 50 % of the year window (≈ 183 days in from Jan 1)
func midYearNow() time.Time {
	return time.Date(2026, 7, 2, 0, 0, 0, 0, time.UTC)
}

// ─── TrackState ───────────────────────────────────────────────────────────────

func TestForecast_OnTrack(t *testing.T) {
	// 50 % done, 50 % of time elapsed → on track.
	in := goals.ForecastInput{
		Goal: baseGoal(),
		Now:  midYearNow(),
	}
	result := goals.ComputeForecast(in)
	if result.TrackState != goals.TrackStateOnTrack {
		t.Errorf("expected on_track, got %q (drift=%v)", result.TrackState, result.DriftPct)
	}
}

func TestForecast_Ahead(t *testing.T) {
	// 80 % done, 50 % of time elapsed → ahead.
	g := baseGoal()
	g.CurrentValue = ptr(80)
	in := goals.ForecastInput{Goal: g, Now: midYearNow()}
	result := goals.ComputeForecast(in)
	if result.TrackState != goals.TrackStateAhead {
		t.Errorf("expected ahead, got %q", result.TrackState)
	}
	if result.DriftDirection != goals.DriftAhead {
		t.Errorf("expected drift direction ahead, got %q", result.DriftDirection)
	}
}

func TestForecast_OffTrack(t *testing.T) {
	// 20 % done, 50 % of time elapsed → off track.
	g := baseGoal()
	g.CurrentValue = ptr(20)
	in := goals.ForecastInput{Goal: g, Now: midYearNow()}
	result := goals.ComputeForecast(in)
	if result.TrackState != goals.TrackStateOffTrack {
		t.Errorf("expected off_track, got %q", result.TrackState)
	}
	if result.DriftDirection != goals.DriftBehind {
		t.Errorf("expected drift direction behind, got %q", result.DriftDirection)
	}
}

func TestForecast_Complete(t *testing.T) {
	g := baseGoal()
	g.Status = goals.StatusCompleted
	in := goals.ForecastInput{Goal: g, Now: midYearNow()}
	result := goals.ComputeForecast(in)
	if result.TrackState != goals.TrackStateComplete {
		t.Errorf("expected complete, got %q", result.TrackState)
	}
	if result.ConfidenceScore != 1.0 {
		t.Errorf("expected confidence 1.0 for completed goal, got %f", result.ConfidenceScore)
	}
}

func TestForecast_NoData_NoTargetDate(t *testing.T) {
	g := baseGoal()
	g.TargetDate = nil
	g.CurrentValue = nil
	g.TargetValue = nil
	in := goals.ForecastInput{Goal: g, Now: midYearNow()}
	result := goals.ComputeForecast(in)
	if result.TrackState != goals.TrackStateNoData {
		t.Errorf("expected no_data when target_date and progress absent, got %q", result.TrackState)
	}
}

func TestForecast_NoData_NoProgressSignal(t *testing.T) {
	g := baseGoal()
	g.CurrentValue = nil
	g.TargetValue = nil
	in := goals.ForecastInput{Goal: g, Now: midYearNow()}
	result := goals.ComputeForecast(in)
	// target_date present but no measurable progress and no milestones.
	if result.TrackState != goals.TrackStateNoData {
		t.Errorf("expected no_data when progress signal absent, got %q", result.TrackState)
	}
}

// ─── ConfidenceScore ──────────────────────────────────────────────────────────

func TestForecast_ConfidenceOnTrack(t *testing.T) {
	in := goals.ForecastInput{Goal: baseGoal(), Now: midYearNow()}
	result := goals.ComputeForecast(in)
	// At 50/50 pace, confidence should be close to 1.0 (before bonuses).
	if result.ConfidenceScore < 0.95 || result.ConfidenceScore > 1.0 {
		t.Errorf("expected confidence near 1.0 for on-track goal, got %f", result.ConfidenceScore)
	}
}

func TestForecast_ConfidenceLowWhenBehind(t *testing.T) {
	g := baseGoal()
	g.CurrentValue = ptr(10) // 10 % done at 50 % of time
	in := goals.ForecastInput{Goal: g, Now: midYearNow()}
	result := goals.ComputeForecast(in)
	if result.ConfidenceScore >= 0.5 {
		t.Errorf("expected low confidence when significantly behind, got %f", result.ConfidenceScore)
	}
}

func TestForecast_ConfidenceHighWhenAhead(t *testing.T) {
	g := baseGoal()
	g.CurrentValue = ptr(90) // 90 % done at 50 % of time
	in := goals.ForecastInput{Goal: g, Now: midYearNow()}
	result := goals.ComputeForecast(in)
	if result.ConfidenceScore < 0.9 {
		t.Errorf("expected high confidence when well ahead, got %f", result.ConfidenceScore)
	}
}

func TestForecast_ConfidenceNeutralWhenNoData(t *testing.T) {
	g := baseGoal()
	g.CurrentValue = nil
	g.TargetValue = nil
	in := goals.ForecastInput{Goal: g, Now: midYearNow()}
	result := goals.ComputeForecast(in)
	if result.ConfidenceScore != 0.5 {
		t.Errorf("expected neutral 0.5 confidence when no progress data, got %f", result.ConfidenceScore)
	}
}

func TestForecast_ConfidencePenaltyOverdue(t *testing.T) {
	g := baseGoal()
	// Target date is well in the past.
	past := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	g.TargetDate = ptrTime(past)
	g.CurrentValue = ptr(50) // still only half done
	in := goals.ForecastInput{Goal: g, Now: midYearNow()}
	result := goals.ComputeForecast(in)
	if result.ConfidenceScore >= 0.5 {
		t.Errorf("expected confidence penalty when overdue and incomplete, got %f", result.ConfidenceScore)
	}
}

// ─── DriftPct ─────────────────────────────────────────────────────────────────

func TestForecast_DriftPct_Positive(t *testing.T) {
	g := baseGoal()
	g.CurrentValue = ptr(80) // 80 % actual vs ~50 % expected
	in := goals.ForecastInput{Goal: g, Now: midYearNow()}
	result := goals.ComputeForecast(in)
	if result.DriftPct == nil {
		t.Fatal("expected drift_pct to be set")
	}
	if *result.DriftPct <= 0 {
		t.Errorf("expected positive drift, got %f", *result.DriftPct)
	}
}

func TestForecast_DriftPct_Negative(t *testing.T) {
	g := baseGoal()
	g.CurrentValue = ptr(20) // 20 % actual vs ~50 % expected
	in := goals.ForecastInput{Goal: g, Now: midYearNow()}
	result := goals.ComputeForecast(in)
	if result.DriftPct == nil {
		t.Fatal("expected drift_pct to be set")
	}
	if *result.DriftPct >= 0 {
		t.Errorf("expected negative drift, got %f", *result.DriftPct)
	}
}

func TestForecast_DriftNilWhenNoTargetDate(t *testing.T) {
	g := baseGoal()
	g.TargetDate = nil
	in := goals.ForecastInput{Goal: g, Now: midYearNow()}
	result := goals.ComputeForecast(in)
	if result.DriftPct != nil {
		t.Errorf("expected nil drift_pct when no target_date, got %v", result.DriftPct)
	}
}

// ─── Milestone fallback ───────────────────────────────────────────────────────

func TestForecast_MilestoneFallback(t *testing.T) {
	g := baseGoal()
	g.CurrentValue = nil // no measurable progress
	g.TargetValue = nil
	milestones := []goals.Milestone{
		{ID: uuid.New(), IsDone: true},
		{ID: uuid.New(), IsDone: true},
		{ID: uuid.New(), IsDone: false},
		{ID: uuid.New(), IsDone: false},
	}
	// 50 % milestones done, 50 % time elapsed → on_track.
	in := goals.ForecastInput{Goal: g, Milestones: milestones, Now: midYearNow()}
	result := goals.ComputeForecast(in)
	if result.MilestoneDoneRatio == nil {
		t.Fatal("expected milestone_done_ratio to be set")
	}
	if *result.MilestoneDoneRatio != 0.5 {
		t.Errorf("expected 0.5 milestone done ratio, got %f", *result.MilestoneDoneRatio)
	}
	if result.TrackState != goals.TrackStateOnTrack {
		t.Errorf("expected on_track via milestone fallback, got %q", result.TrackState)
	}
}

func TestForecast_NoMilestones_RatioNil(t *testing.T) {
	in := goals.ForecastInput{Goal: baseGoal(), Now: midYearNow()}
	result := goals.ComputeForecast(in)
	if result.MilestoneDoneRatio != nil {
		t.Errorf("expected nil milestone_done_ratio when no milestones, got %v", result.MilestoneDoneRatio)
	}
}

// ─── CheckinCount ─────────────────────────────────────────────────────────────

func TestForecast_CheckinCount(t *testing.T) {
	checkins := []goals.Checkin{
		{ID: uuid.New(), CreatedAt: midYearNow().Add(-time.Hour)},
		{ID: uuid.New(), CreatedAt: midYearNow().Add(-2 * time.Hour)},
	}
	in := goals.ForecastInput{
		Goal:     baseGoal(),
		Checkins: checkins,
		Now:      midYearNow(),
	}
	result := goals.ComputeForecast(in)
	if result.CheckinCount != 2 {
		t.Errorf("expected checkin_count=2, got %d", result.CheckinCount)
	}
}

// ─── DaysRemaining ────────────────────────────────────────────────────────────

func TestForecast_DaysRemaining_Future(t *testing.T) {
	in := goals.ForecastInput{Goal: baseGoal(), Now: midYearNow()}
	result := goals.ComputeForecast(in)
	if result.DaysRemaining == nil {
		t.Fatal("expected days_remaining to be set")
	}
	if *result.DaysRemaining <= 0 {
		t.Errorf("expected positive days_remaining, got %d", *result.DaysRemaining)
	}
}

func TestForecast_DaysRemaining_Nil_NoTargetDate(t *testing.T) {
	g := baseGoal()
	g.TargetDate = nil
	in := goals.ForecastInput{Goal: g, Now: midYearNow()}
	result := goals.ComputeForecast(in)
	if result.DaysRemaining != nil {
		t.Errorf("expected nil days_remaining when no target_date, got %d", *result.DaysRemaining)
	}
}

func TestForecast_DaysRemaining_Overdue(t *testing.T) {
	g := baseGoal()
	past := midYearNow().Add(-48 * time.Hour)
	g.TargetDate = ptrTime(past)
	in := goals.ForecastInput{Goal: g, Now: midYearNow()}
	result := goals.ComputeForecast(in)
	if result.DaysRemaining == nil || *result.DaysRemaining >= 0 {
		t.Errorf("expected negative days_remaining for past deadline, got %v", result.DaysRemaining)
	}
}

// ─── Recommendation flags ─────────────────────────────────────────────────────

func TestForecast_RecommendCheckin_NoCheckins(t *testing.T) {
	in := goals.ForecastInput{Goal: baseGoal(), Now: midYearNow()}
	result := goals.ComputeForecast(in)
	if !result.RecommendCheckin {
		t.Error("expected recommend_checkin=true when no check-ins recorded")
	}
}

func TestForecast_RecommendCheckin_RecentCheckin(t *testing.T) {
	// checked in 2 days ago — recent enough, no recommendation.
	checkins := []goals.Checkin{
		{ID: uuid.New(), CreatedAt: midYearNow().Add(-2 * 24 * time.Hour)},
	}
	in := goals.ForecastInput{
		Goal:     baseGoal(),
		Checkins: checkins,
		Now:      midYearNow(),
	}
	result := goals.ComputeForecast(in)
	if result.RecommendCheckin {
		t.Error("expected recommend_checkin=false when checked in recently")
	}
}

func TestForecast_RecommendCheckin_StaleCheckin(t *testing.T) {
	// checked in 10 days ago — stale.
	checkins := []goals.Checkin{
		{ID: uuid.New(), CreatedAt: midYearNow().Add(-10 * 24 * time.Hour)},
	}
	in := goals.ForecastInput{
		Goal:     baseGoal(),
		Checkins: checkins,
		Now:      midYearNow(),
	}
	result := goals.ComputeForecast(in)
	if !result.RecommendCheckin {
		t.Error("expected recommend_checkin=true when last check-in > 7 days ago")
	}
}

func TestForecast_RecommendCheckin_FalseWhenOverdue(t *testing.T) {
	g := baseGoal()
	past := midYearNow().Add(-48 * time.Hour)
	g.TargetDate = ptrTime(past)
	in := goals.ForecastInput{Goal: g, Now: midYearNow()}
	result := goals.ComputeForecast(in)
	if result.RecommendCheckin {
		t.Error("expected recommend_checkin=false after deadline has passed")
	}
}

func TestForecast_RecommendReview_SignificantlyBehind(t *testing.T) {
	g := baseGoal()
	g.CurrentValue = ptr(5) // 5 % done at ~50 % time → drift ≈ -45 %
	in := goals.ForecastInput{Goal: g, Now: midYearNow()}
	result := goals.ComputeForecast(in)
	if !result.RecommendReview {
		t.Errorf("expected recommend_review=true when significantly behind (drift=%v)", result.DriftPct)
	}
}

func TestForecast_RecommendReview_False_OnTrack(t *testing.T) {
	in := goals.ForecastInput{Goal: baseGoal(), Now: midYearNow()}
	result := goals.ComputeForecast(in)
	if result.RecommendReview {
		t.Error("expected recommend_review=false when on track")
	}
}

func TestForecast_RecommendStretch_Ahead(t *testing.T) {
	g := baseGoal()
	g.CurrentValue = ptr(95) // 95 % done at 50 % time → drift ≈ +45 %
	in := goals.ForecastInput{Goal: g, Now: midYearNow()}
	result := goals.ComputeForecast(in)
	if !result.RecommendStretch {
		t.Errorf("expected recommend_stretch=true when well ahead (drift=%v)", result.DriftPct)
	}
}

func TestForecast_RecommendStretch_False_OnTrack(t *testing.T) {
	in := goals.ForecastInput{Goal: baseGoal(), Now: midYearNow()}
	result := goals.ComputeForecast(in)
	if result.RecommendStretch {
		t.Error("expected recommend_stretch=false when on track")
	}
}

// ─── Edge cases ───────────────────────────────────────────────────────────────

func TestForecast_ZeroTargetValue_NoDiv(t *testing.T) {
	// target_value = 0 must not panic or produce NaN/Inf.
	g := baseGoal()
	g.TargetValue = ptr(0)
	g.CurrentValue = ptr(10)
	in := goals.ForecastInput{Goal: g, Now: midYearNow()}
	// Must not panic.
	result := goals.ComputeForecast(in)
	if result.ActualProgress != nil {
		t.Errorf("expected nil actual_progress when target_value=0, got %v", result.ActualProgress)
	}
}

func TestForecast_ProgressClampedAt1(t *testing.T) {
	// current_value > target_value should clamp to 1.0, not exceed.
	g := baseGoal()
	g.CurrentValue = ptr(200) // 200 % of target
	in := goals.ForecastInput{Goal: g, Now: midYearNow()}
	result := goals.ComputeForecast(in)
	if result.ActualProgress == nil {
		t.Fatal("expected actual_progress to be set")
	}
	if *result.ActualProgress != 1.0 {
		t.Errorf("expected actual_progress clamped to 1.0, got %f", *result.ActualProgress)
	}
}

func TestForecast_DeadlineInThePast_Overdue(t *testing.T) {
	g := baseGoal()
	// 30 days overdue
	pastTarget := midYearNow().Add(-30 * 24 * time.Hour)
	g.TargetDate = ptrTime(pastTarget)
	g.CurrentValue = ptr(50) // 50 % done but deadline passed
	in := goals.ForecastInput{Goal: g, Now: midYearNow()}
	result := goals.ComputeForecast(in)
	if result.TrackState != goals.TrackStateOffTrack {
		t.Errorf("expected off_track when deadline passed, got %q", result.TrackState)
	}
}

func TestForecast_AbandonedGoal_StillCalculated(t *testing.T) {
	// Abandoned goals are NOT short-circuited — only Completed is.
	g := baseGoal()
	g.Status = goals.StatusAbandoned
	in := goals.ForecastInput{Goal: g, Now: midYearNow()}
	result := goals.ComputeForecast(in)
	// Should return a valid result (not complete).
	if result.TrackState == goals.TrackStateComplete {
		t.Error("expected abandoned goal not to be treated as complete")
	}
}

func TestForecast_VeryEarlyInWindow_NeutralConfidence(t *testing.T) {
	g := baseGoal()
	// only 1 day into a year-long goal; current = 1 %
	g.CurrentValue = ptr(1)
	veryEarly := g.CreatedAt.Add(24 * time.Hour)
	in := goals.ForecastInput{Goal: g, Now: veryEarly}
	result := goals.ComputeForecast(in)
	// expected progress ≈ 0; confidence should fall back to neutral.
	if result.ConfidenceScore != 0.5 {
		t.Errorf("expected neutral confidence very early in window, got %f", result.ConfidenceScore)
	}
}

func TestForecast_ConfidenceWithCheckinBonus(t *testing.T) {
	// Use a goal that is slightly behind pace so the base score is below 1.0
	// and the check-in bonus can push it higher.
	g := baseGoal()
	g.CurrentValue = ptr(45) // 45 % done vs 50 % elapsed → slightly behind
	checkins := make([]goals.Checkin, 10)
	for i := range checkins {
		checkins[i] = goals.Checkin{
			ID:        uuid.New(),
			CreatedAt: midYearNow().Add(-time.Duration(i+1) * 24 * time.Hour),
		}
	}
	inWithCheckins := goals.ForecastInput{
		Goal:     g,
		Checkins: checkins,
		Now:      midYearNow(),
	}
	inWithout := goals.ForecastInput{Goal: g, Now: midYearNow()}
	rWith := goals.ComputeForecast(inWithCheckins)
	rWithout := goals.ComputeForecast(inWithout)
	if rWith.ConfidenceScore <= rWithout.ConfidenceScore {
		t.Errorf("expected confidence bonus from check-ins; with=%f without=%f",
			rWith.ConfidenceScore, rWithout.ConfidenceScore)
	}
}
