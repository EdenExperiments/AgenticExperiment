package skills

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Skill is a user-owned skill record from the skills table.
type Skill struct {
	ID          uuid.UUID
	UserID      uuid.UUID
	Name        string
	Description string
	Unit        string
	PresetID    *uuid.UUID // nil = created from scratch
}

// CreateSkill inserts a new skill for the given user and returns the created record.
// presetID may be nil for scratch-created skills.
func CreateSkill(ctx context.Context, db *pgxpool.Pool, userID uuid.UUID, name, description, unit string, presetID *uuid.UUID) (*Skill, error) {
	s := &Skill{
		UserID:      userID,
		Name:        name,
		Description: description,
		Unit:        unit,
		PresetID:    presetID,
	}
	err := db.QueryRow(ctx, `
		INSERT INTO public.skills (user_id, name, description, unit, preset_id)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`, userID, name, description, unit, presetID).Scan(&s.ID)
	if err != nil {
		return nil, fmt.Errorf("skills: create skill: %w", err)
	}
	return s, nil
}
