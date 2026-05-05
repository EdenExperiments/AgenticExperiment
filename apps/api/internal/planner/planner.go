// Package planner provides types, prompt construction, and response parsing
// for the AI goal-planner feature. It is intentionally free of HTTP or database
// concerns so that it can be exercised in unit tests without live AI calls.
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
	// GoalStatement is the free-text description of what the user wants to achieve.
	GoalStatement string `json:"goal_statement"`
	// Deadline is the target completion date (optional).
	Deadline *time.Time `json:"deadline,omitempty"`
	// Context holds optional background information (current skill level, constraints, etc.).
	Context string `json:"context,omitempty"`
}

// Milestone is one concrete step in the plan.
type Milestone struct {
	Title       string `json:"title"`
	Description string `json:"description,omitempty"`
	WeekOffset  int    `json:"week_offset"` // 0-based weeks from start
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
	Objective    string        `json:"objective"`
	Milestones   []Milestone   `json:"milestones"`
	WeeklyCadence []WeekCadence `json:"weekly_cadence"`
	Risks        []Risk        `json:"risks"`
	FallbackPlan string        `json:"fallback_plan"`
}

// ─── Prompt construction ──────────────────────────────────────────────────────

const plannerSystemPrompt = `You are an expert goal coach. When given a goal, deadline, and context, you produce a structured, actionable plan.
You MUST respond with ONLY a valid JSON object — no prose, no markdown fences, no explanation.
The JSON must match this exact schema:
{
  "objective": "<one sentence restating the goal as a measurable objective>",
  "milestones": [
    {"title": "<milestone title>", "description": "<1-2 sentences>", "week_offset": <integer>=0}
  ],
  "weekly_cadence": [
    {"week": <integer>=1, "focus": "<theme>", "task_summary": "<what to do this week>"}
  ],
  "risks": [
    {"description": "<risk>", "mitigation": "<how to handle it>"}
  ],
  "fallback_plan": "<2-3 sentences describing what to do if the primary plan stalls>"
}
Requirements:
- milestones: 3-6 items, week_offset >= 0, ordered chronologically
- weekly_cadence: cover at least weeks 1-4 (or through the deadline if shorter)
- risks: 2-4 items
- fallback_plan: required, non-empty`

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

// ─── Response parsing ─────────────────────────────────────────────────────────

// ErrMalformedResponse is returned when the AI output cannot be parsed into a valid PlanResponse.
var ErrMalformedResponse = fmt.Errorf("planner: malformed AI response")

// ParseResponse parses raw AI text into a PlanResponse.
// It strips markdown code fences if the model wraps the JSON, then validates
// required fields. If validation fails, ErrMalformedResponse is returned together
// with a safe fallback plan so callers can decide whether to surface the error
// or return the fallback.
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

// stripFences removes ```json ... ``` or ``` ... ``` wrappers that some models emit.
func stripFences(s string) string {
	s = strings.TrimSpace(s)
	if !strings.HasPrefix(s, "```") {
		return s
	}
	// Remove opening fence line
	if i := strings.Index(s, "\n"); i != -1 {
		s = s[i+1:]
	}
	// Remove closing fence
	s = strings.TrimSuffix(strings.TrimSpace(s), "```")
	return strings.TrimSpace(s)
}

// validate checks that required plan fields are populated and within expected bounds.
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

// fallback constructs a minimal safe PlanResponse when the AI output is unusable.
func fallback(raw string) *PlanResponse {
	_ = raw // do not log — may contain sensitive model output
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
