package users

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// User represents a registered user's profile data.
type User struct {
	ID          uuid.UUID
	Email       string
	DisplayName *string
}

// GetOrCreateUser upserts a user row by ID and returns the current record.
// On conflict (user already created by Supabase trigger) it does nothing and
// returns the existing row.
func GetOrCreateUser(ctx context.Context, db *pgxpool.Pool, userID uuid.UUID, email string) (*User, error) {
	_, err := db.Exec(ctx,
		`INSERT INTO public.users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
		userID, email,
	)
	if err != nil {
		return nil, err
	}

	var u User
	err = db.QueryRow(ctx,
		`SELECT id, email, display_name FROM public.users WHERE id = $1`,
		userID,
	).Scan(&u.ID, &u.Email, &u.DisplayName)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// UpdateDisplayName sets a new display name for the given user.
func UpdateDisplayName(ctx context.Context, db *pgxpool.Pool, userID uuid.UUID, name string) error {
	_, err := db.Exec(ctx,
		`UPDATE public.users SET display_name = $1, updated_at = now() WHERE id = $2`,
		name, userID,
	)
	return err
}
