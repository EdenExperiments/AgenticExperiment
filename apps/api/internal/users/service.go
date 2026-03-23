package users

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrSkillNotOwned is returned when a skill_id does not exist or is not owned by the user.
var ErrSkillNotOwned = errors.New("skill not found or not owned by user")

// User represents a registered user's profile data.
type User struct {
	ID             uuid.UUID  `json:"id"`
	Email          string     `json:"email"`
	DisplayName    *string    `json:"display_name"`
	PrimarySkillID *uuid.UUID `json:"primary_skill_id"`
	AvatarURL      *string    `json:"avatar_url"`
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
		`SELECT id, email, display_name, primary_skill_id, avatar_url FROM public.users WHERE id = $1`,
		userID,
	).Scan(&u.ID, &u.Email, &u.DisplayName, &u.PrimarySkillID, &u.AvatarURL)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// SetAvatarURL updates the avatar_url for the given user and returns the updated record.
func SetAvatarURL(ctx context.Context, db *pgxpool.Pool, userID uuid.UUID, url string) (*User, error) {
	_, err := db.Exec(ctx,
		`UPDATE public.users SET avatar_url = $2, updated_at = now() WHERE id = $1`,
		userID, url,
	)
	if err != nil {
		return nil, err
	}

	var u User
	err = db.QueryRow(ctx,
		`SELECT id, email, display_name, primary_skill_id, avatar_url FROM public.users WHERE id = $1`,
		userID,
	).Scan(&u.ID, &u.Email, &u.DisplayName, &u.PrimarySkillID, &u.AvatarURL)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// ClearAvatarURL sets avatar_url to NULL for the given user and returns the updated record.
func ClearAvatarURL(ctx context.Context, db *pgxpool.Pool, userID uuid.UUID) (*User, error) {
	_, err := db.Exec(ctx,
		`UPDATE public.users SET avatar_url = NULL, updated_at = now() WHERE id = $1`,
		userID,
	)
	if err != nil {
		return nil, err
	}

	var u User
	err = db.QueryRow(ctx,
		`SELECT id, email, display_name, primary_skill_id, avatar_url FROM public.users WHERE id = $1`,
		userID,
	).Scan(&u.ID, &u.Email, &u.DisplayName, &u.PrimarySkillID, &u.AvatarURL)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// SetPrimarySkill pins or unpins a skill as the user's primary focus.
// If skillID matches the current primary_skill_id, it unpins (toggle off) and returns nil.
// If the skill is valid and owned, it pins and returns a pointer to the skill ID.
// Returns ErrSkillNotOwned if the skill doesn't exist or isn't owned by the user.
func SetPrimarySkill(ctx context.Context, db *pgxpool.Pool, userID, skillID uuid.UUID) (*uuid.UUID, error) {
	// Verify the skill exists and is owned by the user
	var exists bool
	err := db.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM public.skills WHERE id = $1 AND user_id = $2)`,
		skillID, userID,
	).Scan(&exists)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrSkillNotOwned
	}

	// Check current primary skill
	var current *uuid.UUID
	err = db.QueryRow(ctx,
		`SELECT primary_skill_id FROM public.users WHERE id = $1`,
		userID,
	).Scan(&current)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	// Toggle: if already pinned to this skill, unpin
	if current != nil && *current == skillID {
		_, err = db.Exec(ctx,
			`UPDATE public.users SET primary_skill_id = NULL, updated_at = now() WHERE id = $1`,
			userID,
		)
		if err != nil {
			return nil, err
		}
		return nil, nil
	}

	// Pin the skill
	_, err = db.Exec(ctx,
		`UPDATE public.users SET primary_skill_id = $1, updated_at = now() WHERE id = $2`,
		skillID, userID,
	)
	if err != nil {
		return nil, err
	}
	return &skillID, nil
}

// UpdateDisplayName sets a new display name for the given user.
func UpdateDisplayName(ctx context.Context, db *pgxpool.Pool, userID uuid.UUID, name string) error {
	_, err := db.Exec(ctx,
		`UPDATE public.users SET display_name = $1, updated_at = now() WHERE id = $2`,
		name, userID,
	)
	return err
}

// UpdateTimezone sets the IANA timezone for the given user.
func UpdateTimezone(ctx context.Context, db *pgxpool.Pool, userID uuid.UUID, timezone string) error {
	_, err := db.Exec(ctx,
		`UPDATE public.users SET timezone = $1, updated_at = now() WHERE id = $2`,
		timezone, userID,
	)
	return err
}
