package planner_test

import (
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/meden/rpgtracker/internal/planner"
)

// ─── ParseResponse tests ──────────────────────────────────────────────────────

func validJSON() string {
	return `{
  "objective": "Complete a 10k run within 12 weeks.",
  "milestones": [
    {"title": "Run 2k non-stop", "description": "Build base fitness.", "week_offset": 2},
    {"title": "Run 5k non-stop", "description": "Half-way marker.", "week_offset": 6},
    {"title": "Complete 10k", "description": "Goal achieved.", "week_offset": 12}
  ],
  "weekly_cadence": [
    {"week": 1, "focus": "Foundation", "task_summary": "Walk/run 20 min three times."},
    {"week": 2, "focus": "Build", "task_summary": "Run 2k without stopping."},
    {"week": 3, "focus": "Endurance", "task_summary": "Increase run by 10% each session."},
    {"week": 4, "focus": "Recovery", "task_summary": "Light jog + stretching."}
  ],
  "risks": [
    {"description": "Injury from overtraining", "mitigation": "Rest if pain persists beyond 48h."},
    {"description": "Motivation dip", "mitigation": "Find a running partner."}
  ],
  "fallback_plan": "If progress stalls, reduce weekly mileage by 25% and add an extra rest day."
}`
}

func TestParseResponse_ValidJSON(t *testing.T) {
	plan, err := planner.ParseResponse(validJSON())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if plan.Objective == "" {
		t.Error("objective should not be empty")
	}
	if len(plan.Milestones) != 3 {
		t.Errorf("want 3 milestones, got %d", len(plan.Milestones))
	}
	if len(plan.WeeklyCadence) != 4 {
		t.Errorf("want 4 weekly cadence entries, got %d", len(plan.WeeklyCadence))
	}
	if len(plan.Risks) != 2 {
		t.Errorf("want 2 risks, got %d", len(plan.Risks))
	}
	if plan.FallbackPlan == "" {
		t.Error("fallback_plan should not be empty")
	}
}

func TestParseResponse_MarkdownFences_Stripped(t *testing.T) {
	wrapped := "```json\n" + validJSON() + "\n```"
	plan, err := planner.ParseResponse(wrapped)
	if err != nil {
		t.Fatalf("unexpected error parsing fenced JSON: %v", err)
	}
	if plan.Objective == "" {
		t.Error("objective should not be empty after fence stripping")
	}
}

func TestParseResponse_PlainFences_Stripped(t *testing.T) {
	wrapped := "```\n" + validJSON() + "\n```"
	plan, err := planner.ParseResponse(wrapped)
	if err != nil {
		t.Fatalf("unexpected error parsing plain-fenced JSON: %v", err)
	}
	if plan.Objective == "" {
		t.Error("objective should not be empty")
	}
}

func TestParseResponse_InvalidJSON_ReturnsFallback(t *testing.T) {
	plan, err := planner.ParseResponse("this is not json at all")
	if err == nil {
		t.Fatal("expected error for invalid JSON, got nil")
	}
	if !errors.Is(err, planner.ErrMalformedResponse) {
		t.Errorf("expected ErrMalformedResponse, got: %v", err)
	}
	// Fallback plan must always be populated
	if plan == nil {
		t.Fatal("fallback plan must not be nil")
	}
	if plan.FallbackPlan == "" {
		t.Error("fallback plan fallback_plan should not be empty")
	}
}

func TestParseResponse_MissingObjective_ReturnsFallback(t *testing.T) {
	j := `{
  "objective": "",
  "milestones": [{"title": "Step 1", "week_offset": 1}],
  "weekly_cadence": [{"week": 1, "focus": "Go", "task_summary": "Do it."}],
  "risks": [],
  "fallback_plan": "Do something."
}`
	_, err := planner.ParseResponse(j)
	if !errors.Is(err, planner.ErrMalformedResponse) {
		t.Errorf("expected ErrMalformedResponse for empty objective, got: %v", err)
	}
}

func TestParseResponse_EmptyMilestones_ReturnsFallback(t *testing.T) {
	j := `{
  "objective": "Run a marathon",
  "milestones": [],
  "weekly_cadence": [{"week": 1, "focus": "Go", "task_summary": "Do it."}],
  "risks": [],
  "fallback_plan": "Do something."
}`
	_, err := planner.ParseResponse(j)
	if !errors.Is(err, planner.ErrMalformedResponse) {
		t.Errorf("expected ErrMalformedResponse for empty milestones, got: %v", err)
	}
}

func TestParseResponse_EmptyWeeklyCadence_ReturnsFallback(t *testing.T) {
	j := `{
  "objective": "Run a marathon",
  "milestones": [{"title": "Step 1", "week_offset": 1}],
  "weekly_cadence": [],
  "risks": [],
  "fallback_plan": "Do something."
}`
	_, err := planner.ParseResponse(j)
	if !errors.Is(err, planner.ErrMalformedResponse) {
		t.Errorf("expected ErrMalformedResponse for empty weekly_cadence, got: %v", err)
	}
}

func TestParseResponse_EmptyFallbackPlan_ReturnsFallback(t *testing.T) {
	j := `{
  "objective": "Run a marathon",
  "milestones": [{"title": "Step 1", "week_offset": 1}],
  "weekly_cadence": [{"week": 1, "focus": "Go", "task_summary": "Do it."}],
  "risks": [],
  "fallback_plan": ""
}`
	_, err := planner.ParseResponse(j)
	if !errors.Is(err, planner.ErrMalformedResponse) {
		t.Errorf("expected ErrMalformedResponse for empty fallback_plan, got: %v", err)
	}
}

func TestParseResponse_ExtraFields_Ignored(t *testing.T) {
	j := `{
  "objective": "Learn Spanish",
  "milestones": [{"title": "Basics", "week_offset": 0}],
  "weekly_cadence": [{"week": 1, "focus": "Vocab", "task_summary": "Learn 10 words/day."}],
  "risks": [{"description": "Motivation", "mitigation": "Use an app."}],
  "fallback_plan": "Use Duolingo daily as a backup.",
  "unknown_field": "this should be silently ignored"
}`
	plan, err := planner.ParseResponse(j)
	if err != nil {
		t.Fatalf("unexpected error with extra fields: %v", err)
	}
	if plan.Objective != "Learn Spanish" {
		t.Errorf("objective mismatch: %q", plan.Objective)
	}
}

// ─── BuildPrompt tests ────────────────────────────────────────────────────────

func TestBuildPrompt_ContainsGoalStatement(t *testing.T) {
	req := planner.PlanRequest{GoalStatement: "Run a marathon"}
	prompt := planner.BuildPrompt(req)
	if !strings.Contains(prompt, "Run a marathon") {
		t.Errorf("prompt missing goal statement: %q", prompt)
	}
}

func TestBuildPrompt_ContainsDeadline(t *testing.T) {
	d := time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC)
	req := planner.PlanRequest{GoalStatement: "Run a marathon", Deadline: &d}
	prompt := planner.BuildPrompt(req)
	if !strings.Contains(prompt, "2026-12-31") {
		t.Errorf("prompt missing deadline: %q", prompt)
	}
}

func TestBuildPrompt_NoDeadline_OmitsDeadlineLine(t *testing.T) {
	req := planner.PlanRequest{GoalStatement: "Read 12 books"}
	prompt := planner.BuildPrompt(req)
	if strings.Contains(prompt, "Deadline") {
		t.Errorf("prompt should not contain 'Deadline' when no deadline set: %q", prompt)
	}
}

func TestBuildPrompt_ContextIncluded(t *testing.T) {
	req := planner.PlanRequest{
		GoalStatement: "Learn guitar",
		Context:       "Complete beginner, 30 minutes per day available",
	}
	prompt := planner.BuildPrompt(req)
	if !strings.Contains(prompt, "Complete beginner") {
		t.Errorf("prompt missing context: %q", prompt)
	}
}

// ─── SystemPrompt sanity check ────────────────────────────────────────────────

func TestSystemPrompt_NotEmpty(t *testing.T) {
	sp := planner.SystemPrompt()
	if strings.TrimSpace(sp) == "" {
		t.Error("system prompt must not be empty")
	}
	if !strings.Contains(sp, "JSON") {
		t.Error("system prompt should mention JSON output requirement")
	}
}
