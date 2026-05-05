package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/meden/rpgtracker/internal/api"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/planner"
)

// ─── AI service abstraction ───────────────────────────────────────────────────

// PlannerAICaller is the interface the goal-planner handler uses to call an AI.
// Using an interface keeps the handler testable without live AI calls.
type PlannerAICaller interface {
	// CallRaw sends system + user prompts to the AI and returns the raw text response.
	// apiKey must never be logged by the implementation.
	CallRaw(ctx context.Context, apiKey, systemPrompt, userPrompt string) (string, error)
}

// ─── HTTP caller (production) ─────────────────────────────────────────────────

// httpPlannerCaller is the live Anthropic-backed implementation.
type httpPlannerCaller struct {
	client *http.Client
}

func (c *httpPlannerCaller) CallRaw(ctx context.Context, apiKey, systemPrompt, userPrompt string) (string, error) {
	payload := map[string]any{
		"model":      "claude-haiku-4-5-20251001",
		"max_tokens": 2048,
		"system":     systemPrompt,
		"messages": []map[string]string{
			{"role": "user", "content": userPrompt},
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("planner: marshal: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.anthropic.com/v1/messages", strings.NewReader(string(body)))
	if err != nil {
		return "", fmt.Errorf("planner: new request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := c.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("planner: do: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		errBody, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return "", &plannerHTTPError{status: resp.StatusCode, body: string(errBody)}
	}

	var anthropicResp struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&anthropicResp); err != nil {
		return "", fmt.Errorf("planner: decode: %w", err)
	}
	if len(anthropicResp.Content) == 0 {
		return "", fmt.Errorf("planner: empty response from AI")
	}
	return anthropicResp.Content[0].Text, nil
}

// plannerHTTPError carries the upstream HTTP status so the handler can map it to a
// user-facing status code.
type plannerHTTPError struct {
	status int
	body   string
}

func (e *plannerHTTPError) Error() string {
	return fmt.Sprintf("AI returned HTTP %d", e.status)
}

// ─── Handler ──────────────────────────────────────────────────────────────────

// GoalPlanHandler handles AI-powered goal planning.
type GoalPlanHandler struct {
	keyStore KeyStore        // reuses the existing KeyStore interface from calibrate.go
	caller   PlannerAICaller
}

// NewGoalPlanHandler constructs a GoalPlanHandler backed by the DB and Anthropic API.
func NewGoalPlanHandler(db *pgxpool.Pool, masterKey []byte) *GoalPlanHandler {
	return &GoalPlanHandler{
		keyStore: &dbKeyStore{db: db, masterKey: masterKey},
		caller:   &httpPlannerCaller{client: &http.Client{Timeout: 60 * time.Second}},
	}
}

// NewGoalPlanHandlerForTest constructs a GoalPlanHandler with injected dependencies for tests.
func NewGoalPlanHandlerForTest(ks KeyStore, caller PlannerAICaller) *GoalPlanHandler {
	return &GoalPlanHandler{keyStore: ks, caller: caller}
}

// ─── Request body ─────────────────────────────────────────────────────────────

type goalPlanRequest struct {
	GoalStatement string     `json:"goal_statement"`
	Deadline      *time.Time `json:"deadline,omitempty"`
	Context       string     `json:"context,omitempty"`
}

// ─── HandlePostGoalPlan handles POST /api/v1/goals/plan ───────────────────────

// HandlePostGoalPlan converts a free-text goal statement into a structured plan
// using the user's stored AI key. If the AI response is malformed, a safe
// fallback plan is returned with a 200 status and a degraded_response flag.
func (h *GoalPlanHandler) HandlePostGoalPlan(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var body goalPlanRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	if strings.TrimSpace(body.GoalStatement) == "" {
		api.RespondError(w, http.StatusUnprocessableEntity, "goal_statement is required")
		return
	}

	// Retrieve the user's encrypted AI key.
	apiKey, err := h.keyStore.GetDecryptedKey(r.Context(), userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			api.RespondError(w, http.StatusPaymentRequired, "no AI key configured — add your Claude API key under account settings")
			return
		}
		log.Printf("ERROR: GoalPlan GetDecryptedKey user=%s: %v", userID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to retrieve API key")
		return
	}

	req := planner.PlanRequest{
		GoalStatement: strings.TrimSpace(body.GoalStatement),
		Deadline:      body.Deadline,
		Context:       strings.TrimSpace(body.Context),
	}

	rawText, err := h.caller.CallRaw(r.Context(), apiKey, planner.SystemPrompt(), planner.BuildPrompt(req))
	if err != nil {
		log.Printf("ERROR: GoalPlan AI call user=%s: %v", userID, err)
		var httpErr *plannerHTTPError
		if errors.As(err, &httpErr) {
			switch httpErr.status {
			case http.StatusUnauthorized:
				api.RespondError(w, http.StatusUnauthorized, "invalid Claude API key")
				return
			case http.StatusTooManyRequests:
				api.RespondError(w, http.StatusTooManyRequests, "Claude API rate limit reached")
				return
			}
		}
		api.RespondError(w, http.StatusBadGateway, "AI planner unavailable")
		return
	}

	plan, parseErr := planner.ParseResponse(rawText)
	if parseErr != nil {
		// Safe fallback: return the degraded plan with a flag so the client can inform the user.
		log.Printf("WARN: GoalPlan parse error user=%s: %v", userID, parseErr)
		api.RespondJSON(w, http.StatusOK, goalPlanEnvelope{Plan: plan, DegradedResponse: true})
		return
	}

	api.RespondJSON(w, http.StatusOK, goalPlanEnvelope{Plan: plan, DegradedResponse: false})
}

// goalPlanEnvelope wraps the plan with metadata.
type goalPlanEnvelope struct {
	Plan             *planner.PlanResponse `json:"plan"`
	DegradedResponse bool                  `json:"degraded_response"`
}
