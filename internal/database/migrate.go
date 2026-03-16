package database

import (
	"context"
	"fmt"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

// RunMigrations applies all pending up migrations from db/migrations/.
// It returns nil if there are no pending migrations (migrate.ErrNoChange is not an error).
// The application must not start serving traffic if this returns a non-nil error.
func RunMigrations(ctx context.Context, databaseURL string) error {
	m, err := migrate.New("file://db/migrations", databaseURL)
	if err != nil {
		return fmt.Errorf("database: create migrator: %w", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("database: run migrations: %w", err)
	}

	return nil
}
