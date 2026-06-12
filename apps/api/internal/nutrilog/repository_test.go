//go:build integration

// Run with: cd apps/api && go test -tags integration ./internal/nutrilog/...
// Requires DATABASE_URL pointing to a migrated local database.
// Requires a seed user row with id = '00000000-0000-0000-0000-000000000001'.
package nutrilog

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

var seedUserID = uuid.MustParse("00000000-0000-0000-0000-000000000001")

func testDB(t *testing.T) *pgxpool.Pool {
	t.Helper()
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		t.Skip("DATABASE_URL not set")
	}
	db, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		t.Fatalf("connect to DB: %v", err)
	}
	t.Cleanup(db.Close)
	return db
}

// AC-1: migration creates nl_weight_logs with user_id FK to public.users.
func TestMigration_NLWeightLogsTableSchema(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()

	var exists bool
	err := db.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM information_schema.tables
			WHERE table_schema = 'public' AND table_name = 'nl_weight_logs'
		)`).Scan(&exists)
	if err != nil {
		t.Fatalf("check table exists: %v", err)
	}
	if !exists {
		t.Fatal("expected public.nl_weight_logs table to exist after migration")
	}

	requiredColumns := []string{"id", "user_id", "weight_kg", "note", "measured_at", "created_at"}
	for _, col := range requiredColumns {
		var colExists bool
		err := db.QueryRow(ctx, `
			SELECT EXISTS (
				SELECT 1 FROM information_schema.columns
				WHERE table_schema = 'public'
				  AND table_name = 'nl_weight_logs'
				  AND column_name = $1
			)`, col).Scan(&colExists)
		if err != nil {
			t.Fatalf("check column %s: %v", col, err)
		}
		if !colExists {
			t.Errorf("missing column nl_weight_logs.%s", col)
		}
	}

	var fkExists bool
	err = db.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM information_schema.table_constraints tc
			JOIN information_schema.key_column_usage kcu
			  ON tc.constraint_name = kcu.constraint_name
			 AND tc.table_schema = kcu.table_schema
			JOIN information_schema.constraint_column_usage ccu
			  ON ccu.constraint_name = tc.constraint_name
			 AND ccu.table_schema = tc.table_schema
			WHERE tc.table_schema = 'public'
			  AND tc.table_name = 'nl_weight_logs'
			  AND tc.constraint_type = 'FOREIGN KEY'
			  AND kcu.column_name = 'user_id'
			  AND ccu.table_name = 'users'
		)`).Scan(&fkExists)
	if err != nil {
		t.Fatalf("check user_id FK: %v", err)
	}
	if !fkExists {
		t.Error("expected nl_weight_logs.user_id FK to public.users")
	}
}

func TestCreateWeightLog_PersistsAndListsForUser(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	measuredAt := time.Now().UTC().Truncate(time.Second)

	log, err := CreateWeightLog(ctx, db, seedUserID, 72.5, "integration test", measuredAt)
	if err != nil {
		t.Fatalf("CreateWeightLog: %v", err)
	}
	if log.ID == uuid.Nil {
		t.Fatal("expected non-nil id")
	}
	if log.WeightKg != 72.5 {
		t.Errorf("weight_kg: got %v want 72.5", log.WeightKg)
	}

	t.Cleanup(func() {
		_ = DeleteWeightLog(ctx, db, seedUserID, log.ID)
	})

	logs, err := ListWeightLogs(ctx, db, seedUserID, 50)
	if err != nil {
		t.Fatalf("ListWeightLogs: %v", err)
	}
	found := false
	for _, row := range logs {
		if row.ID == log.ID {
			found = true
			break
		}
	}
	if !found {
		t.Error("created weight log not returned by ListWeightLogs")
	}
}

func TestDeleteWeightLog_RemovesOwnRow(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()

	log, err := CreateWeightLog(ctx, db, seedUserID, 70.0, "", time.Now().UTC())
	if err != nil {
		t.Fatalf("CreateWeightLog: %v", err)
	}

	if err := DeleteWeightLog(ctx, db, seedUserID, log.ID); err != nil {
		t.Fatalf("DeleteWeightLog: %v", err)
	}

	_, err = GetWeightLog(ctx, db, seedUserID, log.ID)
	if err != ErrNotFound {
		t.Fatalf("expected ErrNotFound after delete, got %v", err)
	}
}

func TestDeleteWeightLog_NotFoundForOtherUser(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	otherUser := uuid.MustParse("22222222-0000-0000-0000-000000000002")

	log, err := CreateWeightLog(ctx, db, seedUserID, 71.0, "", time.Now().UTC())
	if err != nil {
		t.Fatalf("CreateWeightLog: %v", err)
	}
	t.Cleanup(func() {
		_ = DeleteWeightLog(ctx, db, seedUserID, log.ID)
	})

	err = DeleteWeightLog(ctx, db, otherUser, log.ID)
	if err != ErrNotFound {
		t.Fatalf("expected ErrNotFound when deleting another user's log, got %v", err)
	}
}
