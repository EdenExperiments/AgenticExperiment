// Package goals — forecast.go provides a deterministic, AI-free forecast engine.
//
// NOTE: This stub provides the complete goals domain types and forecast engine
// for Wave 3 T15 regression tests. Full DB-backed functions (CreateGoal, etc.)
// are stubs that return ErrNotFound — they will be replaced by T8/T13 merges.
package goals

import (
	"context"
	"errors"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ─── Sentinel errors ──────────────────────────────────────────────────────────

var ErrNotFound = errors.New("not found")
var ErrInvalidStatus = errors.New("status must be one of: active, completed, abandoned")
var ErrMeasurableIncomplete = errors.New("current_value and target_value must both be set or both omitted")

// ─── Status types ─────────────────────────────────────────────────────────────

type GoalStatus string

const (
	StatusActive    GoalStatus = "active"
	StatusCompleted GoalStatus = "completed"
	StatusAbandoned GoalStatus = "abandoned"
)

var ValidStatuses = map[GoalStatus]struct{}{
	StatusActive:    {},
	StatusCompleted: {},
	StatusAbandoned: {},
}

// ─── Domain types ─────────────────────────────────────────────────────────────

type Goal struct {
	ID           uuid.UUID  `json:"id"`
	UserID       uuid.UUID  `json:"user_id"`
	SkillID      *uuid.UUID `json:"skill_id"`
	Title        string     `json:"title"`
	Description  string     `json:"description"`
	Status       GoalStatus `json:"status"`
	TargetDate   *time.Time `json:"target_date"`
	CurrentValue *float64   `json:"current_value"`
	TargetValue  *float64   `json:"target_value"`
	Unit         string     `json:"unit"`
	Position     int        `json:"position"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

type Milestone struct {
	ID          uuid.UUID  `json:"id"`
	GoalID      uuid.UUID  `json:"goal_id"`
	UserID      uuid.UUID  `json:"user_id"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	IsDone      bool       `json:"is_done"`
	DoneAt      *time.Time `json:"done_at"`
	Position    int        `json:"position"`
	DueDate     *time.Time `json:"due_date"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type Checkin struct {
	ID            uuid.UUID  `json:"id"`
	GoalID        uuid.UUID  `json:"goal_id"`
	UserID        uuid.UUID  `json:"user_id"`
	Note          string     `json:"note"`
	ValueSnapshot *float64   `json:"value_snapshot"`
	CreatedAt     time.Time  `json:"created_at"`
}

// ─── Stub DB functions (replaced when T8 merges) ──────────────────────────────

func CreateGoal(_ context.Context, _ *pgxpool.Pool, _ uuid.UUID, _, _ string, _ *uuid.UUID, _ *time.Time, _, _ *float64, _ string, _ int) (*Goal, error) {
	return nil, ErrNotFound
}
func ListGoals(_ context.Context, _ *pgxpool.Pool, _ uuid.UUID, _ *GoalStatus) ([]Goal, error) {
	return nil, ErrNotFound
}
func GetGoal(_ context.Context, _ *pgxpool.Pool, _, _ uuid.UUID) (*Goal, error) {
	return nil, ErrNotFound
}
func UpdateGoal(_ context.Context, _ *pgxpool.Pool, _, _ uuid.UUID, _, _ string, _ *uuid.UUID, _ GoalStatus, _ *time.Time, _, _ *float64, _ string, _ int) (*Goal, error) {
	return nil, ErrNotFound
}
func DeleteGoal(_ context.Context, _ *pgxpool.Pool, _, _ uuid.UUID) error { return ErrNotFound }

func CreateMilestone(_ context.Context, _ *pgxpool.Pool, _, _ uuid.UUID, _, _ string, _ int, _ *time.Time) (*Milestone, error) {
	return nil, ErrNotFound
}
func ListMilestones(_ context.Context, _ *pgxpool.Pool, _, _ uuid.UUID) ([]Milestone, error) {
	return nil, ErrNotFound
}
func UpdateMilestone(_ context.Context, _ *pgxpool.Pool, _, _ uuid.UUID, _, _ string, _ bool, _ int, _ *time.Time) (*Milestone, error) {
	return nil, ErrNotFound
}
func DeleteMilestone(_ context.Context, _ *pgxpool.Pool, _, _ uuid.UUID) error { return ErrNotFound }

func CreateCheckin(_ context.Context, _ *pgxpool.Pool, _, _ uuid.UUID, _ string, _ *float64) (*Checkin, error) {
	return nil, ErrNotFound
}
func ListCheckins(_ context.Context, _ *pgxpool.Pool, _, _ uuid.UUID) ([]Checkin, error) {
	return nil, ErrNotFound
}

// ─── Forecast types ───────────────────────────────────────────────────────────

type TrackState string

const (
	TrackStateOnTrack  TrackState = "on_track"
	TrackStateOffTrack TrackState = "off_track"
	TrackStateAhead    TrackState = "ahead"
	TrackStateComplete TrackState = "complete"
	TrackStateNoData   TrackState = "no_data"
)

type DriftDirection string

const (
	DriftAhead   DriftDirection = "ahead"
	DriftBehind  DriftDirection = "behind"
	DriftOnPace  DriftDirection = "on_pace"
	DriftUnknown DriftDirection = "unknown"
)

type ForecastResult struct {
	TrackState         TrackState     `json:"track_state"`
	ConfidenceScore    float64        `json:"confidence_score"`
	DriftPct           *float64       `json:"drift_pct"`
	DriftDirection     DriftDirection `json:"drift_direction"`
	ExpectedProgress   *float64       `json:"expected_progress"`
	ActualProgress     *float64       `json:"actual_progress"`
	MilestoneDoneRatio *float64       `json:"milestone_done_ratio"`
	CheckinCount       int            `json:"checkin_count"`
	DaysRemaining      *int           `json:"days_remaining"`
	RecommendCheckin   bool           `json:"recommend_checkin"`
	RecommendReview    bool           `json:"recommend_review"`
	RecommendStretch   bool           `json:"recommend_stretch"`
}

type ForecastInput struct {
	Goal       Goal
	Checkins   []Checkin
	Milestones []Milestone
	Now        time.Time
}

// GetForecastData is the DB-backed implementation (stub — replaced by T13 merge).
func GetForecastData(_ context.Context, _ *pgxpool.Pool, _, _ uuid.UUID) (ForecastInput, error) {
	return ForecastInput{}, ErrNotFound
}

// ─── Forecast engine ──────────────────────────────────────────────────────────

func ComputeForecast(in ForecastInput) ForecastResult {
	now := in.Now
	if now.IsZero() {
		now = time.Now().UTC()
	}

	goal := in.Goal

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

	var actualProgress *float64
	if goal.CurrentValue != nil && goal.TargetValue != nil && *goal.TargetValue != 0 {
		ap := clamp01(*goal.CurrentValue / *goal.TargetValue)
		actualProgress = &ap
	}
	result.ActualProgress = actualProgress

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

	progressSignal := unifiedProgress(actualProgress, result.MilestoneDoneRatio)

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

	result.TrackState = deriveTrackState(driftPct, expectedProgress, daysRemaining)
	result.ConfidenceScore = deriveConfidence(progressSignal, expectedProgress, daysRemaining, len(in.Checkins), in.Milestones)
	result.RecommendCheckin = shouldRecommendCheckin(in.Checkins, daysRemaining, now)
	result.RecommendReview = shouldRecommendReview(driftPct, expectedProgress)
	result.RecommendStretch = shouldRecommendStretch(driftPct, expectedProgress)

	return result
}

func clamp01(v float64) float64 {
	if v < 0 {
		return 0
	}
	if v > 1 {
		return 1
	}
	return v
}

func unifiedProgress(measurable, milestoneRatio *float64) *float64 {
	if measurable != nil {
		return measurable
	}
	return milestoneRatio
}

func deriveTrackState(driftPct, expectedProgress *float64, daysRemaining *int) TrackState {
	if driftPct == nil {
		if expectedProgress == nil {
			return TrackStateNoData
		}
		return TrackStateNoData
	}
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

func deriveConfidence(progressSignal, expectedProgress *float64, daysRemaining *int, checkinCount int, milestones []Milestone) float64 {
	if progressSignal == nil || expectedProgress == nil {
		return 0.5
	}
	expected := *expectedProgress
	if expected < 0.02 {
		return 0.5
	}
	base := clamp01(*progressSignal / expected)
	checkinBonus := 0.0
	if checkinCount > 0 {
		checkinBonus = math.Min(0.10, math.Log1p(float64(checkinCount))*0.025)
	}
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
	if daysRemaining != nil && *daysRemaining < 0 {
		overdueDays := -(*daysRemaining)
		penalty := math.Min(0.5, float64(overdueDays)*0.02)
		score -= penalty
	}
	return math.Round(clamp01(score)*1000) / 1000
}

func shouldRecommendCheckin(checkins []Checkin, daysRemaining *int, now time.Time) bool {
	if daysRemaining != nil && *daysRemaining <= 0 {
		return false
	}
	if len(checkins) == 0 {
		return true
	}
	latest := checkins[0].CreatedAt
	return now.Sub(latest) > 7*24*time.Hour
}

func shouldRecommendReview(driftPct, expectedProgress *float64) bool {
	if driftPct == nil || expectedProgress == nil {
		return false
	}
	return *driftPct < -25 && *expectedProgress < 0.80
}

func shouldRecommendStretch(driftPct, expectedProgress *float64) bool {
	if driftPct == nil || expectedProgress == nil {
		return false
	}
	return *driftPct > 30 && *expectedProgress < 0.80
}
