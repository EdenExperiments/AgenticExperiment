package database

import (
	"context"
	"os"
	"testing"
)

func TestRunMigrations_EmptyDirectory(t *testing.T) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		t.Skip("DATABASE_URL not set; skipping integration test")
	}
	if err := RunMigrations(context.Background(), dbURL); err != nil {
		t.Fatalf("RunMigrations with empty directory returned error: %v", err)
	}
}
