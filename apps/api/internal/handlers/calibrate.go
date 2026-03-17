package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/meden/rpgtracker/internal/api"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/keys"
)

const calibratePrompt = `You are helping calibrate a skill tracker. Given the skill name and description, provide:
1. A suggested starting level (integer, 1-99, where 1=complete beginner, 50=advanced practitioner, 99=near-peak mastery)
2. A 2-3 sentence rationale explaining your suggestion
3. Exactly 10 gate descriptions (one per tier boundary) appropriate to this skill. Each gate description should be 1-2 sentences describing what mastery looks like at that tier boundary.

Respond with ONLY a valid JSON object in this exact format:
{
  "suggested_level": <integer 1-99>,
  "rationale": "<2-3 sentences>",
  "gate_descriptions": ["<gate at L9>", "<gate at L19>", "<gate at L29>", "<gate at L39>", "<gate at L49>", "<gate at L59>", "<gate at L69>", "<gate at L79>", "<gate at L89>", "<gate at L99>"]
}

Skill name: %s
Skill description: %s`

// CalibrateResponse is what the handler returns to clients.
type CalibrateResponse struct {
	SuggestedLevel   int      `json:"suggested_level"`
	Rationale        string   `json:"rationale"`
	GateDescriptions []string `json:"gate_descriptions"`
}

// KeyStore retrieves the user's decrypted API key.
type KeyStore interface {
	GetDecryptedKey(ctx context.Context, userID uuid.UUID) (string, error)
}

// ClaudeCaller sends a prompt to Claude and returns a parsed response.
type ClaudeCaller interface {
	Call(ctx context.Context, apiKey, prompt string) (*CalibrateResponse, int, error)
}

// CalibrateHandler handles AI calibration endpoints.
type CalibrateHandler struct {
	keyStore KeyStore
	caller   ClaudeCaller
}

// NewCalibrateHandler constructs a CalibrateHandler backed by the DB and Claude API.
func NewCalibrateHandler(db *pgxpool.Pool, masterKey []byte) *CalibrateHandler {
	return &CalibrateHandler{
		keyStore: &dbKeyStore{db: db, masterKey: masterKey},
		caller:   &httpClaudeCaller{client: &http.Client{Timeout: 30 * time.Second}},
	}
}

// NewCalibrateHandlerForTest constructs a CalibrateHandler with injected dependencies.
func NewCalibrateHandlerForTest(ks KeyStore, caller ClaudeCaller) *CalibrateHandler {
	return &CalibrateHandler{keyStore: ks, caller: caller}
}

// dbKeyStore wraps keys.GetDecryptedKey to satisfy the KeyStore interface.
type dbKeyStore struct {
	db        *pgxpool.Pool
	masterKey []byte
}

func (s *dbKeyStore) GetDecryptedKey(ctx context.Context, userID uuid.UUID) (string, error) {
	return keys.GetDecryptedKey(ctx, s.db, s.masterKey, userID)
}

// httpClaudeCaller sends requests to the Anthropic API.
type httpClaudeCaller struct {
	client *http.Client
}

func (c *httpClaudeCaller) Call(ctx context.Context, apiKey, prompt string) (*CalibrateResponse, int, error) {
	body, _ := json.Marshal(map[string]any{
		"model":      "claude-haiku-4-5-20251001",
		"max_tokens": 1024,
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
	})

	req, _ := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.anthropic.com/v1/messages", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, resp.StatusCode, fmt.Errorf("claude returned %d", resp.StatusCode)
	}

	var anthropicResp struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&anthropicResp); err != nil {
		return nil, 0, err
	}
	if len(anthropicResp.Content) == 0 {
		return nil, 0, fmt.Errorf("empty response from claude")
	}

	var result CalibrateResponse
	if err := json.Unmarshal([]byte(anthropicResp.Content[0].Text), &result); err != nil {
		return nil, 0, fmt.Errorf("claude response parse error: %w", err)
	}
	if result.SuggestedLevel < 1 {
		result.SuggestedLevel = 1
	}
	if result.SuggestedLevel > 99 {
		result.SuggestedLevel = 99
	}

	return &result, http.StatusOK, nil
}

// HandlePostCalibrate handles POST /api/v1/calibrate.
// Body (form-urlencoded): name (required), description (optional).
func (h *CalibrateHandler) HandlePostCalibrate(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if err := r.ParseForm(); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid request")
		return
	}
	name := strings.TrimSpace(r.FormValue("name"))
	description := strings.TrimSpace(r.FormValue("description"))
	if name == "" {
		api.RespondError(w, http.StatusUnprocessableEntity, "name is required")
		return
	}

	apiKey, err := h.keyStore.GetDecryptedKey(r.Context(), userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			api.RespondError(w, http.StatusBadRequest, "no api key configured")
		} else {
			api.RespondError(w, http.StatusInternalServerError, "failed to retrieve api key")
		}
		return
	}

	prompt := fmt.Sprintf(calibratePrompt, name, description)
	result, status, err := h.caller.Call(r.Context(), apiKey, prompt)
	if err != nil {
		switch status {
		case http.StatusUnauthorized:
			api.RespondError(w, http.StatusUnauthorized, "invalid claude api key")
		case http.StatusTooManyRequests:
			api.RespondError(w, http.StatusTooManyRequests, "claude api rate limit reached")
		default:
			api.RespondError(w, http.StatusBadGateway, "ai calibration unavailable")
		}
		return
	}
	api.RespondJSON(w, http.StatusOK, result)
}
