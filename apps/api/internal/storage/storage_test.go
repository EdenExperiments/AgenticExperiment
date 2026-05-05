package storage

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestNewSupabaseStorageClient_HasTimeout(t *testing.T) {
	c := NewSupabaseStorageClient("https://example.supabase.co", "secret-key")
	if c.httpClient.Timeout == 0 {
		t.Error("expected non-zero HTTP client timeout, got 0")
	}
}

func TestPutAvatar_Timeout(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(2 * time.Second)
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	c := &SupabaseStorageClient{supabaseURL: srv.URL, secretKey: "key", httpClient: &http.Client{Timeout: 50 * time.Millisecond}}

	err := c.PutAvatar(context.Background(), uuid.New(), strings.NewReader("data"), "image/png")
	if err == nil {
		t.Fatal("expected PutAvatar to return an error on timeout, got nil")
	}
}

func TestDeleteAvatar_Timeout(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(2 * time.Second)
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	c := &SupabaseStorageClient{supabaseURL: srv.URL, secretKey: "key", httpClient: &http.Client{Timeout: 50 * time.Millisecond}}

	err := c.DeleteAvatar(context.Background(), uuid.New())
	if err == nil {
		t.Fatal("expected DeleteAvatar to return an error on timeout, got nil")
	}
}

func TestPutAvatar_NonOKStatus(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusForbidden)
	}))
	defer srv.Close()

	c := &SupabaseStorageClient{supabaseURL: srv.URL, secretKey: "key", httpClient: &http.Client{Timeout: 5 * time.Second}}

	err := c.PutAvatar(context.Background(), uuid.New(), io.NopCloser(strings.NewReader("data")), "image/png")
	if err == nil {
		t.Fatal("expected PutAvatar to return an error on non-200 status, got nil")
	}
}

func TestDeleteAvatar_NotFoundIsSuccess(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer srv.Close()

	c := &SupabaseStorageClient{supabaseURL: srv.URL, secretKey: "key", httpClient: &http.Client{Timeout: 5 * time.Second}}

	err := c.DeleteAvatar(context.Background(), uuid.New())
	if err != nil {
		t.Fatalf("expected DeleteAvatar with 404 to succeed (idempotent), got: %v", err)
	}
}

func TestPutAvatar_ContextCancellation(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(2 * time.Second)
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	c := &SupabaseStorageClient{supabaseURL: srv.URL, secretKey: "key", httpClient: &http.Client{Timeout: 30 * time.Second}}

	err := c.PutAvatar(ctx, uuid.New(), strings.NewReader("data"), "image/png")
	if err == nil {
		t.Fatal("expected PutAvatar to return an error when context is cancelled, got nil")
	}
}
