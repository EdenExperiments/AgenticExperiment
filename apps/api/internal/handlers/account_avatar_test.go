package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/handlers"
	"github.com/meden/rpgtracker/internal/users"
)

// ---- stub UserStore for avatar tests ----

type stubAvatarStore struct {
	user *users.User
}

func (s *stubAvatarStore) GetOrCreateUser(_ context.Context, userID uuid.UUID, email string) (*users.User, error) {
	if s.user != nil {
		return s.user, nil
	}
	return &users.User{ID: userID, Email: email}, nil
}

func (s *stubAvatarStore) SetPrimarySkill(_ context.Context, _, _ uuid.UUID) (*uuid.UUID, error) {
	return nil, nil
}

func (s *stubAvatarStore) SetAvatarURL(_ context.Context, userID uuid.UUID, url string) (*users.User, error) {
	u := &users.User{ID: userID, AvatarURL: &url}
	s.user = u
	return u, nil
}

func (s *stubAvatarStore) ClearAvatarURL(_ context.Context, userID uuid.UUID) (*users.User, error) {
	u := &users.User{ID: userID, AvatarURL: nil}
	s.user = u
	return u, nil
}

func (s *stubAvatarStore) GetAccountStats(_ context.Context, _ uuid.UUID) (*handlers.AccountStats, error) {
	return &handlers.AccountStats{}, nil
}

// ---- stub StorageClient ----

type mockStorageClient struct {
	putErr    error
	deleteErr error
}

func (m *mockStorageClient) PutAvatar(_ context.Context, _ uuid.UUID, _ io.Reader, _ string) error {
	return m.putErr
}

func (m *mockStorageClient) DeleteAvatar(_ context.Context, _ uuid.UUID) error {
	return m.deleteErr
}

// ---- helpers ----

// buildMultipartJPEG creates a multipart/form-data body with a real JPEG header.
func buildMultipartJPEG(t *testing.T, sizeBytes int) (*bytes.Buffer, string) {
	t.Helper()
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("avatar", "avatar.jpg")
	if err != nil {
		t.Fatalf("multipart create: %v", err)
	}
	// Valid JPEG magic bytes
	jpegHeader := []byte{0xFF, 0xD8, 0xFF, 0xE0}
	padding := make([]byte, sizeBytes-len(jpegHeader))
	_, _ = part.Write(jpegHeader)
	_, _ = part.Write(padding)
	writer.Close()
	return body, writer.FormDataContentType()
}

// buildMultipartGIF creates a multipart/form-data body with a real GIF header.
func buildMultipartGIF(t *testing.T) (*bytes.Buffer, string) {
	t.Helper()
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("avatar", "avatar.gif")
	if err != nil {
		t.Fatalf("multipart create: %v", err)
	}
	// Valid GIF89a magic bytes
	gifHeader := []byte{'G', 'I', 'F', '8', '9', 'a', 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00}
	_, _ = part.Write(gifHeader)
	// Pad to 512 bytes so DetectContentType can identify it
	padding := make([]byte, 512-len(gifHeader))
	_, _ = part.Write(padding)
	writer.Close()
	return body, writer.FormDataContentType()
}

// ---- ACL-1: POST /api/v1/account/avatar with valid JPEG returns 200 and avatar_url non-empty ----

func TestPostAvatar_ACL1_ValidJPEGReturns200WithAvatarURL(t *testing.T) {
	userID := uuid.New()
	store := &stubAvatarStore{}
	storage := &mockStorageClient{}

	h := handlers.NewUserHandlerWithAvatarStore(store, storage)

	body, ct := buildMultipartJPEG(t, 1024) // 1KB — under 2MB limit
	req := httptest.NewRequest(http.MethodPost, "/api/v1/account/avatar", body)
	req.Header.Set("Content-Type", ct)
	req = req.WithContext(auth.WithUserID(req.Context(), userID))

	w := httptest.NewRecorder()
	h.HandlePostAvatar(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("ACL-1: expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("ACL-1: invalid JSON: %v", err)
	}

	avatarURL, exists := resp["avatar_url"]
	if !exists {
		t.Fatalf("ACL-1: avatar_url field missing from response: %s", w.Body.String())
	}
	if avatarURL == nil || avatarURL == "" {
		t.Fatalf("ACL-1: expected non-empty avatar_url, got %v", avatarURL)
	}
}

// ---- ACL-2: POST /api/v1/account/avatar with file >2MB returns 400 ----

func TestPostAvatar_ACL2_FileTooLargeReturns400(t *testing.T) {
	userID := uuid.New()
	store := &stubAvatarStore{}
	storage := &mockStorageClient{}

	h := handlers.NewUserHandlerWithAvatarStore(store, storage)

	const twoPlusMB = 2*1024*1024 + 1
	body, ct := buildMultipartJPEG(t, twoPlusMB)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/account/avatar", body)
	req.Header.Set("Content-Type", ct)
	req = req.WithContext(auth.WithUserID(req.Context(), userID))

	w := httptest.NewRecorder()
	h.HandlePostAvatar(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("ACL-2: expected 400 for file >2MB, got %d: %s", w.Code, w.Body.String())
	}
}

// ---- ACL-3: POST /api/v1/account/avatar with unsupported type (GIF) returns 400 ----

func TestPostAvatar_ACL3_UnsupportedTypeReturns400(t *testing.T) {
	userID := uuid.New()
	store := &stubAvatarStore{}
	storage := &mockStorageClient{}

	h := handlers.NewUserHandlerWithAvatarStore(store, storage)

	body, ct := buildMultipartGIF(t)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/account/avatar", body)
	req.Header.Set("Content-Type", ct)
	req = req.WithContext(auth.WithUserID(req.Context(), userID))

	w := httptest.NewRecorder()
	h.HandlePostAvatar(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("ACL-3: expected 400 for GIF upload, got %d: %s", w.Code, w.Body.String())
	}
}

// ---- ACL-4: POST /api/v1/account/avatar without auth returns 401 ----

func TestPostAvatar_ACL4_NoAuthReturns401(t *testing.T) {
	store := &stubAvatarStore{}
	storage := &mockStorageClient{}

	h := handlers.NewUserHandlerWithAvatarStore(store, storage)

	body, ct := buildMultipartJPEG(t, 1024)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/account/avatar", body)
	req.Header.Set("Content-Type", ct)
	// No auth context set

	w := httptest.NewRecorder()
	h.HandlePostAvatar(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("ACL-4: expected 401 for unauthenticated request, got %d: %s", w.Code, w.Body.String())
	}
}

// ---- ACL-5: DELETE /api/v1/account/avatar sets avatar_url to NULL and returns 200 ----

func TestDeleteAvatar_ACL5_SetsAvatarURLNullAndReturns200(t *testing.T) {
	userID := uuid.New()
	existingURL := fmt.Sprintf("https://example.com/avatars/%s/avatar", userID)
	store := &stubAvatarStore{
		user: &users.User{
			ID:        userID,
			Email:     "test@example.com",
			AvatarURL: &existingURL,
		},
	}
	storage := &mockStorageClient{}

	h := handlers.NewUserHandlerWithAvatarStore(store, storage)

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/account/avatar", nil)
	req = req.WithContext(auth.WithUserID(req.Context(), userID))

	w := httptest.NewRecorder()
	h.HandleDeleteAvatar(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("ACL-5: expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("ACL-5: invalid JSON: %v", err)
	}

	if avatarURL, exists := resp["avatar_url"]; !exists || avatarURL != nil {
		t.Fatalf("ACL-5: expected avatar_url=null in response, got %v", resp["avatar_url"])
	}
}

// TestDeleteAvatar_ACL5_Idempotent verifies that DELETE when avatar_url is already NULL still returns 200.
func TestDeleteAvatar_ACL5_Idempotent(t *testing.T) {
	userID := uuid.New()
	store := &stubAvatarStore{
		user: &users.User{
			ID:        userID,
			Email:     "test@example.com",
			AvatarURL: nil, // already null
		},
	}
	storage := &mockStorageClient{}

	h := handlers.NewUserHandlerWithAvatarStore(store, storage)

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/account/avatar", nil)
	req = req.WithContext(auth.WithUserID(req.Context(), userID))

	w := httptest.NewRecorder()
	h.HandleDeleteAvatar(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("ACL-5 idempotent: expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

// ---- ACL-6: GET /api/v1/account includes avatar_url field (null when no avatar) ----

func TestGetAccount_ACL6_IncludesAvatarURLField(t *testing.T) {
	userID := uuid.New()
	store := &stubAvatarStore{
		user: &users.User{
			ID:        userID,
			Email:     "test@example.com",
			AvatarURL: nil, // no avatar
		},
	}
	storage := &mockStorageClient{}

	h := handlers.NewUserHandlerWithAvatarStore(store, storage)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/account", nil)
	req = req.WithContext(auth.WithUserID(req.Context(), userID))

	w := httptest.NewRecorder()
	h.HandleGetAccount(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("ACL-6: expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("ACL-6: invalid JSON: %v", err)
	}

	if _, exists := resp["avatar_url"]; !exists {
		t.Fatalf("ACL-6: avatar_url field missing from GET /api/v1/account response: %s", w.Body.String())
	}
	// When no avatar, avatar_url must be null (nil in JSON)
	if resp["avatar_url"] != nil {
		t.Fatalf("ACL-6: expected avatar_url=null, got %v", resp["avatar_url"])
	}
}

// TestGetAccount_ACL6_WithAvatar verifies that avatar_url is present and non-null when set.
func TestGetAccount_ACL6_WithAvatar(t *testing.T) {
	userID := uuid.New()
	avatarURL := "https://example.com/avatars/user-id/avatar?v=1711234567"
	store := &stubAvatarStore{
		user: &users.User{
			ID:        userID,
			Email:     "test@example.com",
			AvatarURL: &avatarURL,
		},
	}
	storage := &mockStorageClient{}

	h := handlers.NewUserHandlerWithAvatarStore(store, storage)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/account", nil)
	req = req.WithContext(auth.WithUserID(req.Context(), userID))

	w := httptest.NewRecorder()
	h.HandleGetAccount(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("ACL-6 with avatar: expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("ACL-6 with avatar: invalid JSON: %v", err)
	}

	if resp["avatar_url"] != avatarURL {
		t.Fatalf("ACL-6 with avatar: expected avatar_url=%s, got %v", avatarURL, resp["avatar_url"])
	}
}
