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
	CategoryID    *uuid.UUID `json:"category_id"`
	CategoryName  *string    `json:"category_name"`
	CategorySlug  *string    `json:"category_slug"`
	CategoryEmoji *string    `json:"category_emoji"`
	IsFavourite   bool       `json:"is_favourite"`
	Tags          []Tag      `json:"tags"`
	StartingLevel int        `json:"starting_level"`
	CurrentXP     int        `json:"current_xp"`
	CurrentLevel  int        `json:"current_level"`
	DeletedAt     *time.Time `json:"-"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// Tag is a user-defined tag linked to skills.
type Tag struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
}

// TagWithCount extends Tag with the number of skills using it.
type TagWithCount struct {
	Tag
	SkillCount int `json:"skill_count"`
}

// ErrInvalidCategory is returned when a category_id does not exist.
var ErrInvalidCategory = errors.New("invalid category")

// ErrTooManyTags is returned when more than 5 tags are provided.
var ErrTooManyTags = errors.New("maximum 5 tags per skill")

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

// autoClearEvidence is the system-generated evidence text stored in gate_submissions
// rows created during skill creation (D-033). Distinguishable from user-written content.
const autoClearEvidence = "Skill created at a higher starting level — this tier's gate was auto-cleared at creation."

// CreateSkill inserts a new skill and its 10 blocker gates in a single transaction.
// startingLevel must be 1–99 (D-018). gateDescs[i] overrides the default description for gate i
// when non-empty; pass [10]string{} to use all defaults.
//
// D-033: If startingLevel crosses multiple gate boundaries, all gates below the highest
// applicable boundary are auto-cleared with verdict='self_reported'. Only the highest
// boundary gate remains open and must be submitted by the user.
func CreateSkill(ctx context.Context, db *pgxpool.Pool, userID uuid.UUID, name, description, unit string, presetID *uuid.UUID, categoryID *uuid.UUID, startingLevel int, gateDescs [10]string) (*Skill, error) {
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

	// Find highest gate boundary the starting level crosses (D-033).
	// e.g. startingLevel=26 → highestHit=19 (gate at 9 will be auto-cleared).
	highestHit := -1
	for _, gl := range gateLevels {
		if startingLevel >= gl {
			highestHit = gl
		}
	}

	// Insert the 10 blocker gates, collecting IDs so we can auto-clear the right ones.
	type gateInsert struct {
		id    uuid.UUID
		level int
	}
	var inserted [10]gateInsert

	for i, gl := range gateLevels {
		title := defaultGateTitle(gl)
		desc := defaultGateDescription(gl)
		if gateDescs[i] != "" {
			desc = gateDescs[i]
		}
		err = tx.QueryRow(ctx, `
			INSERT INTO public.blocker_gates (skill_id, gate_level, title, description)
			VALUES ($1, $2, $3, $4)
			RETURNING id
		`, s.ID, gl, title, desc).Scan(&inserted[i].id)
		if err != nil {
			return nil, fmt.Errorf("skills: insert gate %d: %w", gl, err)
		}
		inserted[i].level = gl
	}

	// Auto-clear all gates strictly below highestHit (D-033).
	for _, g := range inserted {
		if highestHit <= 0 || g.level >= highestHit {
			continue
		}
		if _, err = tx.Exec(ctx, `
			UPDATE public.blocker_gates SET is_cleared = true, cleared_at = now()
			WHERE id = $1
		`, g.id); err != nil {
			return nil, fmt.Errorf("skills: auto-clear gate %d: %w", g.level, err)
		}
		if _, err = tx.Exec(ctx, `
			INSERT INTO public.gate_submissions
				(gate_id, user_id, evidence_what, evidence_how, evidence_feeling,
				 verdict, attempt_number, reviewed_at)
			VALUES ($1, $2, $3, $3, $3, 'self_reported', 1, now())
		`, g.id, userID, autoClearEvidence); err != nil {
			return nil, fmt.Errorf("skills: auto-clear submission gate %d: %w", g.level, err)
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
func UpdateSkill(ctx context.Context, db *pgxpool.Pool, userID, skillID uuid.UUID, name, description string, categoryID *uuid.UUID) (*Skill, error) {
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

// ToggleFavourite flips the is_favourite flag on a skill and returns the new value.
// TODO(T2): implement
func ToggleFavourite(ctx context.Context, db *pgxpool.Pool, userID, skillID uuid.UUID) (bool, error) {
	return false, fmt.Errorf("ToggleFavourite: not implemented")
}

// SetSkillTags replaces all tags on a skill with the given names (max 5).
// Tags are created if they don't exist (user-scoped, lowercase, trimmed).
// TODO(T2): implement
func SetSkillTags(ctx context.Context, db *pgxpool.Pool, userID, skillID uuid.UUID, tagNames []string) ([]Tag, error) {
	return nil, fmt.Errorf("SetSkillTags: not implemented")
}

// ListTags returns all tags for a user with skill counts.
// TODO(T2): implement
func ListTags(ctx context.Context, db *pgxpool.Pool, userID uuid.UUID) ([]TagWithCount, error) {
	return nil, fmt.Errorf("ListTags: not implemented")
}

// ValidateCategoryID checks that a category ID exists in skill_categories.
// TODO(T2): implement
func ValidateCategoryID(ctx context.Context, db *pgxpool.Pool, categoryID uuid.UUID) error {
	return fmt.Errorf("ValidateCategoryID: not implemented")
}
