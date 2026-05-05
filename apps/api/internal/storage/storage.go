package storage

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/google/uuid"
)

// storageClientTimeout is the per-request deadline for Supabase Storage HTTP calls.
const storageClientTimeout = 30 * time.Second

// SupabaseStorageClient uploads and removes avatar files using the Supabase Storage REST API.
// It satisfies the handlers.StorageClient interface.
type SupabaseStorageClient struct {
	supabaseURL    string
	secretKey      string
	httpClient     *http.Client
}

// NewSupabaseStorageClient creates a SupabaseStorageClient.
func NewSupabaseStorageClient(supabaseURL, secretKey string) *SupabaseStorageClient {
	return &SupabaseStorageClient{
		supabaseURL:    supabaseURL,
		secretKey:      secretKey,
		httpClient:     &http.Client{Timeout: storageClientTimeout},
	}
}

// PutAvatar uploads an avatar image to Supabase Storage, overwriting any existing file.
func (c *SupabaseStorageClient) PutAvatar(ctx context.Context, userID uuid.UUID, body io.Reader, contentType string) error {
	url := fmt.Sprintf("%s/storage/v1/object/avatars/%s/avatar", c.supabaseURL, userID)

	req, err := http.NewRequestWithContext(ctx, http.MethodPut, url, body)
	if err != nil {
		return fmt.Errorf("storage: build PUT request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.secretKey)
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("x-upsert", "true")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("storage: PUT avatar: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("storage: PUT avatar returned %d", resp.StatusCode)
	}
	return nil
}

// DeleteAvatar removes the avatar image from Supabase Storage.
// A 404 response is treated as success (idempotent).
func (c *SupabaseStorageClient) DeleteAvatar(ctx context.Context, userID uuid.UUID) error {
	url := fmt.Sprintf("%s/storage/v1/object/avatars/%s/avatar", c.supabaseURL, userID)

	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, url, nil)
	if err != nil {
		return fmt.Errorf("storage: build DELETE request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.secretKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("storage: DELETE avatar: %w", err)
	}
	defer resp.Body.Close()

	// Treat 404 as success — file may not exist yet
	if resp.StatusCode == http.StatusNotFound {
		return nil
	}
	if resp.StatusCode >= 300 {
		return fmt.Errorf("storage: DELETE avatar returned %d", resp.StatusCode)
	}
	return nil
}
