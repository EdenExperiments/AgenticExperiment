package skills

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/meden/rpgtracker/internal/xpcurve"
)

// Skill is a user-owned skill with progression state.
type Skill struct {
	ID            uuid.UUID  `json:"id"`
	UserID        uuid.UUID  `json:"user_id"`
	Name          string     `json:"name"`
	Description   string     `json:"description"`
	Unit          string     `json:"unit"`
	PresetID      *uuid.UUID `json:"preset_id"`
	StartingLevel int        `json:"starting_level"`
	CurrentXP     int        `json:"current_xp"`
	CurrentLevel  int        `json:"current_level"`
	DeletedAt     *time.Time `json:"-"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// BlockerGate is one gate row for a skill.
type BlockerGate struct {
	ID              uuid.UUID  `json:"id"`
	SkillID         uuid.UUID  `json:"skill_id"`
	GateLevel       int        `json:"gate_level"`
	Title           string     `json:"title"`
	Description     string     `json:"description"`
	FirstNotifiedAt *time.Time `json:"first_notified_at"`
	IsCleared       bool       `json:"is_cleared"`
	ClearedAt       *time.Time `json:"cleared_at"`
}

// ErrInvalidStartingLevel is returned when startingLevel is outside the valid 1–99 range (D-018).
var ErrInvalidStartingLevel = errors.New("starting_level must be between 1 and 99 (D-018)")

// ErrNotFound is returned when a requested record does not exist or is not owned by the user.
var ErrNotFound = errors.New("not found")

// gateLevels is the fixed list of gate boundaries (one per tier, D-014).
var gateLevels = [10]int{9, 19, 29, 39, 49, 59, 69, 79, 89, 99}

// defaultGateTitle returns a tier-appropriate default gate title.
func defaultGateTitle(gateLevel int) string {
	tier := xpcurve.TierName(gateLevel)
	next := xpcurve.TierName(gateLevel + 1)
	return fmt.Sprintf("%s Gate: Prove Your %s Mastery", tier, next)
}

// defaultGateDescription returns a default gate description.
func defaultGateDescription(gateLevel int) string {
	tier := xpcurve.TierName(gateLevel)
	return fmt.Sprintf(
		"You have reached the end of the %s tier. Complete a meaningful challenge in this skill to unlock the next tier. Log your achievement to proceed.",
		tier,
	)
}

// CreateSkill inserts a new skill and its 10 blocker gates in a single transaction.
// startingLevel must be 1–99 (D-018). gateDescs[i] overrides the default description for gate i
// when non-empty; pass [10]string{} to use all defaults.
func CreateSkill(ctx context.Context, db *pgxpool.Pool, userID uuid.UUID, name, description, unit string, presetID *uuid.UUID, startingLevel int, gateDescs [10]string) (*Skill, error) {
	if startingLevel < 1 || startingLevel > 99 {
		return nil, ErrInvalidStartingLevel
	}
	startXP := xpcurve.XPToReachLevel(startingLevel)

	tx, err := db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("skills: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	s := &Skill{
		UserID:        userID,
		Name:          name,
		Description:   description,
		Unit:          unit,
		PresetID:      presetID,
		StartingLevel: startingLevel,
		CurrentXP:     startXP,
		CurrentLevel:  startingLevel,
	}
	err = tx.QueryRow(ctx, `
		INSERT INTO public.skills (user_id, name, description, unit, preset_id, starting_level, current_xp, current_level)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at, updated_at
	`, userID, name, description, unit, presetID, startingLevel, startXP, startingLevel).
		Scan(&s.ID, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("skills: insert: %w", err)
	}

	// Insert the 10 blocker gates.
	for i, gl := range gateLevels {
		title := defaultGateTitle(gl)
		desc := defaultGateDescription(gl)
		if gateDescs[i] != "" {
			desc = gateDescs[i]
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO public.blocker_gates (skill_id, gate_level, title, description)
			VALUES ($1, $2, $3, $4)
		`, s.ID, gl, title, desc)
		if err != nil {
			return nil, fmt.Errorf("skills: insert gate %d: %w", gl, err)
		}
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("skills: commit: %w", err)
	}
	return s, nil
}

// ListSkills returns all non-deleted skills for a user, sorted by most recently updated.
func ListSkills(ctx context.Context, db *pgxpool.Pool, userID uuid.UUID) ([]Skill, error) {
	rows, err := db.Query(ctx, `
		SELECT id, user_id, name, description, unit, preset_id,
		       starting_level, current_xp, current_level, created_at, updated_at
		FROM public.skills
		WHERE user_id = $1 AND deleted_at IS NULL
		ORDER BY updated_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("skills: list: %w", err)
	}
	defer rows.Close()

	var out []Skill
	for rows.Next() {
		var s Skill
		if err := rows.Scan(&s.ID, &s.UserID, &s.Name, &s.Description, &s.Unit, &s.PresetID,
			&s.StartingLevel, &s.CurrentXP, &s.CurrentLevel, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

// GetSkill returns a single non-deleted skill owned by userID.
func GetSkill(ctx context.Context, db *pgxpool.Pool, userID, skillID uuid.UUID) (*Skill, error) {
	var s Skill
	err := db.QueryRow(ctx, `
		SELECT id, user_id, name, description, unit, preset_id,
		       starting_level, current_xp, current_level, created_at, updated_at
		FROM public.skills
		WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
	`, skillID, userID).Scan(
		&s.ID, &s.UserID, &s.Name, &s.Description, &s.Unit, &s.PresetID,
		&s.StartingLevel, &s.CurrentXP, &s.CurrentLevel, &s.CreatedAt, &s.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("skills: get: %w", err)
	}
	return &s, nil
}

// UpdateSkill updates name and description of a skill owned by userID.
func UpdateSkill(ctx context.Context, db *pgxpool.Pool, userID, skillID uuid.UUID, name, description string) (*Skill, error) {
	var s Skill
	err := db.QueryRow(ctx, `
		UPDATE public.skills SET name=$3, description=$4, updated_at=NOW()
		WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL
		RETURNING id, user_id, name, description, unit, preset_id,
		          starting_level, current_xp, current_level, created_at, updated_at
	`, skillID, userID, name, description).Scan(
		&s.ID, &s.UserID, &s.Name, &s.Description, &s.Unit, &s.PresetID,
		&s.StartingLevel, &s.CurrentXP, &s.CurrentLevel, &s.CreatedAt, &s.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("skills: update: %w", err)
	}
	return &s, nil
}

// SoftDeleteSkill marks a skill as deleted without removing its data.
func SoftDeleteSkill(ctx context.Context, db *pgxpool.Pool, userID, skillID uuid.UUID) error {
	tag, err := db.Exec(ctx, `
		UPDATE public.skills SET deleted_at=NOW()
		WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL
	`, skillID, userID)
	if err != nil {
		return fmt.Errorf("skills: delete: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// GetBlockerGates returns all gates for a skill, ordered by gate_level.
// The caller is responsible for verifying that the skill belongs to the
// authenticated user before calling this function.
func GetBlockerGates(ctx context.Context, db *pgxpool.Pool, skillID uuid.UUID) ([]BlockerGate, error) {
	rows, err := db.Query(ctx, `
		SELECT id, skill_id, gate_level, title, description, first_notified_at, is_cleared, cleared_at
		FROM public.blocker_gates
		WHERE skill_id = $1
		ORDER BY gate_level
	`, skillID)
	if err != nil {
		return nil, fmt.Errorf("skills: get gates: %w", err)
	}
	defer rows.Close()

	var out []BlockerGate
	for rows.Next() {
		var g BlockerGate
		if err := rows.Scan(&g.ID, &g.SkillID, &g.GateLevel, &g.Title, &g.Description,
			&g.FirstNotifiedAt, &g.IsCleared, &g.ClearedAt); err != nil {
			return nil, err
		}
		out = append(out, g)
	}
	return out, rows.Err()
}

// EffectiveLevel returns the display level — capped at the lowest active (uncleared) gate.
// R-004: this lives in the repository layer, NOT in handler templates.
func EffectiveLevel(currentLevel int, gates []BlockerGate) int {
	for _, g := range gates {
		if !g.IsCleared && currentLevel >= g.GateLevel {
			return g.GateLevel
		}
	}
	return currentLevel
}
