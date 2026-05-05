// Package planner provides types, prompt construction, and response parsing
// for the AI goal-planner feature. It is intentionally free of HTTP or database
// concerns so that it can be exercised in unit tests without live AI calls.
//
// NOTE: This is a minimal stub for Wave 3 T15 regression tests.
// The full implementation is in origin/cursor/ai-goal-planner-c6a8-0504.
// Tests in this package will be INTENTIONALLY RED until T12 is merged.
package planner

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// ─── Request / Response types ─────────────────────────────────────────────────

// PlanRequest is the validated input for the AI planner.
type PlanRequest struct {
	GoalStatement string     `json:"goal_statement"`
	Deadline      *time.Time `json:"deadline,omitempty"`
	Context       string     `json:"context,omitempty"`
}

// Milestone is one concrete step in the plan.
type Milestone struct {
	Title       string `json:"title"`
	Description string `json:"description,omitempty"`
	WeekOffset  int    `json:"week_offset"`
}

// WeekCadence describes recommended activities for one week.
type WeekCadence struct {
	Week        int    `json:"week"`
	Focus       string `json:"focus"`
	TaskSummary string `json:"task_summary"`
}

// Risk is an identified obstacle or failure mode.
type Risk struct {
	Description string `json:"description"`
	Mitigation  string `json:"mitigation,omitempty"`
}

// PlanResponse is the structured plan returned to the client.
type PlanResponse struct {
	Objective     string        `json:"objective"`
	Milestones    []Milestone   `json:"milestones"`
	WeeklyCadence []WeekCadence `json:"weekly_cadence"`
	Risks         []Risk        `json:"risks"`
	FallbackPlan  string        `json:"fallback_plan"`
}

// ErrMalformedResponse is returned when the AI output cannot be parsed into a valid PlanResponse.
var ErrMalformedResponse = fmt.Errorf("planner: malformed AI response")

// ParseResponse parses raw AI text into a PlanResponse.
func ParseResponse(raw string) (*PlanResponse, error) {
	cleaned := stripFences(raw)
	var plan PlanResponse
	if err := json.Unmarshal([]byte(cleaned), &plan); err != nil {
		return fallback(raw), fmt.Errorf("%w: json: %v", ErrMalformedResponse, err)
	}
	if err := validate(&plan); err != nil {
		return fallback(raw), fmt.Errorf("%w: %v", ErrMalformedResponse, err)
	}
	return &plan, nil
}

// BuildPrompt constructs the user-turn message for the AI from a PlanRequest.
func BuildPrompt(req PlanRequest) string {
	var sb strings.Builder
	sb.WriteString("Goal: ")
	sb.WriteString(req.GoalStatement)
	if req.Deadline != nil {
		sb.WriteString("\nDeadline: ")
		sb.WriteString(req.Deadline.Format("2006-01-02"))
	}
	if req.Context != "" {
		sb.WriteString("\nContext: ")
		sb.WriteString(req.Context)
	}
	return sb.String()
}

// SystemPrompt returns the system instruction string.
func SystemPrompt() string { return plannerSystemPrompt }

const plannerSystemPrompt = `You are an expert goal coach. Respond with ONLY a valid JSON object.`

func stripFences(s string) string {
	s = strings.TrimSpace(s)
	if !strings.HasPrefix(s, "```") {
		return s
	}
	if i := strings.Index(s, "\n"); i != -1 {
		s = s[i+1:]
	}
	s = strings.TrimSuffix(strings.TrimSpace(s), "```")
	return strings.TrimSpace(s)
}

func validate(p *PlanResponse) error {
	if strings.TrimSpace(p.Objective) == "" {
		return fmt.Errorf("objective is empty")
	}
	if len(p.Milestones) < 1 {
		return fmt.Errorf("milestones is empty")
	}
	if len(p.WeeklyCadence) < 1 {
		return fmt.Errorf("weekly_cadence is empty")
	}
	if strings.TrimSpace(p.FallbackPlan) == "" {
		return fmt.Errorf("fallback_plan is empty")
	}
	return nil
}

func fallback(_ string) *PlanResponse {
	return &PlanResponse{
		Objective: "Unable to parse AI-generated plan. Please try again.",
		Milestones: []Milestone{
			{Title: "Define your first concrete step", WeekOffset: 0},
		},
		WeeklyCadence: []WeekCadence{
			{Week: 1, Focus: "Getting started", TaskSummary: "Break your goal into small daily tasks."},
		},
		Risks: []Risk{
			{Description: "Plan could not be generated automatically.", Mitigation: "Retry or create your plan manually."},
		},
		FallbackPlan: "Work toward your goal using small, consistent daily actions and review progress weekly.",
	}
}
