package keys_test

import (
	"context"
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/meden/rpgtracker/internal/keys"
)

func TestSaveAndGetDecryptedKey(t *testing.T) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		t.Skip("DATABASE_URL not set")
	}

	ctx := context.Background()
	db, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		t.Fatalf("failed to connect to database: %v", err)
	}
	defer db.Close()

	// Use a 32-byte master key for AES-256
	masterKey := []byte("test-master-key-exactly-32-bytes")

	// Use a fixed user UUID for the test (clean up after)
	userID := uuid.MustParse("00000000-0000-0000-0000-000000000099")

	// Clean up before and after test
	_, _ = db.Exec(ctx, `DELETE FROM public.user_ai_keys WHERE user_id = $1`, userID)
	defer func() {
		_, _ = db.Exec(ctx, `DELETE FROM public.user_ai_keys WHERE user_id = $1`, userID)
	}()

	plaintextKey := "sk-ant-api03-testkey1234"

	err = keys.SaveKey(ctx, db, masterKey, userID, plaintextKey)
	if err != nil {
		t.Fatalf("SaveKey failed: %v", err)
	}

	got, err := keys.GetDecryptedKey(ctx, db, masterKey, userID)
	if err != nil {
		t.Fatalf("GetDecryptedKey failed: %v", err)
	}

	if got != plaintextKey {
		t.Errorf("decrypted key = %q, want %q", got, plaintextKey)
	}
}

func TestSaveKey_InvalidFormat(t *testing.T) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		t.Skip("DATABASE_URL not set")
	}

	ctx := context.Background()
	db, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		t.Fatalf("failed to connect to database: %v", err)
	}
	defer db.Close()

	masterKey := []byte("test-master-key-exactly-32-bytes")
	userID := uuid.MustParse("00000000-0000-0000-0000-000000000098")

	err = keys.SaveKey(ctx, db, masterKey, userID, "not-a-valid-key")
	if err == nil {
		t.Fatal("expected error for invalid key format, got nil")
	}
	if err.Error() != "invalid key format" {
		t.Errorf("error = %q, want %q", err.Error(), "invalid key format")
	}
}

func TestGetKeyStatus(t *testing.T) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		t.Skip("DATABASE_URL not set")
	}

	ctx := context.Background()
	db, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		t.Fatalf("failed to connect to database: %v", err)
	}
	defer db.Close()

	masterKey := []byte("test-master-key-exactly-32-bytes")
	userID := uuid.MustParse("00000000-0000-0000-0000-000000000097")

	// Clean up
	_, _ = db.Exec(ctx, `DELETE FROM public.user_ai_keys WHERE user_id = $1`, userID)
	defer func() {
		_, _ = db.Exec(ctx, `DELETE FROM public.user_ai_keys WHERE user_id = $1`, userID)
	}()

	// Before saving: status should say Exists=false
	status, err := keys.GetKeyStatus(ctx, db, userID)
	if err != nil {
		t.Fatalf("GetKeyStatus failed: %v", err)
	}
	if status.Exists {
		t.Error("expected Exists=false before saving key")
	}

	// Save a key
	plaintextKey := "sk-ant-api03-statustestkey1234"
	if err := keys.SaveKey(ctx, db, masterKey, userID, plaintextKey); err != nil {
		t.Fatalf("SaveKey failed: %v", err)
	}

	// After saving: status should say Exists=true with correct hint
	status, err = keys.GetKeyStatus(ctx, db, userID)
	if err != nil {
		t.Fatalf("GetKeyStatus failed: %v", err)
	}
	if !status.Exists {
		t.Error("expected Exists=true after saving key")
	}
	wantHint := plaintextKey[len(plaintextKey)-4:]
	if status.Hint != wantHint {
		t.Errorf("hint = %q, want %q", status.Hint, wantHint)
	}
	if status.ValidatedAt == nil {
		t.Error("expected ValidatedAt to be set")
	}

	// Delete key and verify status
	if err := keys.DeleteKey(ctx, db, userID); err != nil {
		t.Fatalf("DeleteKey failed: %v", err)
	}
	status, err = keys.GetKeyStatus(ctx, db, userID)
	if err != nil {
		t.Fatalf("GetKeyStatus failed after delete: %v", err)
	}
	if status.Exists {
		t.Error("expected Exists=false after deleting key")
	}
}
