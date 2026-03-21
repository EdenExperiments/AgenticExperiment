package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// newHTTPClient returns a default HTTP client with a 30s timeout for Claude API calls.
func newHTTPClient() *http.Client {
	return &http.Client{Timeout: 30 * time.Second}
}

// httpRawClaudeCaller calls the Anthropic API with a system + user prompt
// and returns the raw text content.
type httpRawClaudeCaller struct {
	client *http.Client
}

// CallRaw sends a system + user prompt to Claude and returns the raw text response.
func (c *httpRawClaudeCaller) CallRaw(ctx context.Context, apiKey, systemPrompt, userPrompt string) (string, error) {
	messages := []map[string]string{
		{"role": "user", "content": userPrompt},
	}

	payload := map[string]any{
		"model":      "claude-haiku-4-5-20251001",
		"max_tokens": 1024,
		"system":     systemPrompt,
		"messages":   messages,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("callraw: marshal: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.anthropic.com/v1/messages", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("callraw: new request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := c.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("callraw: do: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("callraw: claude returned %d", resp.StatusCode)
	}

	var anthropicResp struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&anthropicResp); err != nil {
		return "", fmt.Errorf("callraw: decode: %w", err)
	}
	if len(anthropicResp.Content) == 0 {
		return "", fmt.Errorf("callraw: empty response from claude")
	}

	return anthropicResp.Content[0].Text, nil
}
