// apps/api/internal/skills/xp_repository.go
package skills

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/meden/rpgtracker/internal/xpcurve"
)

// XPEvent is one log entry.
type XPEvent struct {
	ID      uuid.UUID `json:"id"`
	SkillID uuid.UUID `json:"skill_id"`
	XPDelta int       `json:"xp_delta"`
	LogNote string    `json:"log_note,omitempty"`
}

// LogXPResult is returned from LogXP.
type LogXPResult struct {
	Skill         *Skill       `json:"skill"`
	XPAdded       int          `json:"xp_added"`
	LevelBefore   int          `json:"level_before"`
	LevelAfter    int          `json:"level_after"`
	TierCrossed   bool         `json:"tier_crossed"`
	TierName      string       `json:"tier_name"`
	TierNumber    int          `json:"tier_number"`
	QuickLogChips [4]int       `json:"quick_log_chips"`
	GateFirstHit  *BlockerGate `json:"gate_first_hit"` // non-nil only on first hit
}

// LogXP records an XP event and updates skill progression atomically (R-003).
func LogXP(ctx context.Context, db *pgxpool.Pool, userID, skillID uuid.UUID, xpDelta int, logNote string) (*LogXPResult, error) {
	if xpDelta <= 0 {
		return nil, fmt.Errorf("xp_delta must be positive")
	}

	tx, err := db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("logxp: begin: %w", err)
	}
	defer tx.Rollback(ctx)

	// 1. Read current skill state (also locks the row).
	var skillBefore Skill
	err = tx.QueryRow(ctx, `
		SELECT id, current_xp, current_level
		FROM public.skills
		WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL
		FOR UPDATE
	`, skillID, userID).Scan(&skillBefore.ID, &skillBefore.CurrentXP, &skillBefore.CurrentLevel)
	if err != nil {
		return nil, fmt.Errorf("logxp: get skill: %w", err)
	}

	levelBefore := skillBefore.CurrentLevel
	newXP := skillBefore.CurrentXP + xpDelta
	newLevel := xpcurve.LevelForXP(newXP)

	// 2. Insert xp_event.
	_, err = tx.Exec(ctx, `
		INSERT INTO public.xp_events (skill_id, user_id, xp_delta, log_note)
		VALUES ($1, $2, $3, NULLIF($4, ''))
	`, skillID, userID, xpDelta, logNote)
	if err != nil {
		return nil, fmt.Errorf("logxp: insert event: %w", err)
	}

	// 3. Update skill.current_xp + current_level atomically.
	var updatedSkill Skill
	err = tx.QueryRow(ctx, `
		UPDATE public.skills
		SET current_xp=$3, current_level=$4, updated_at=NOW()
		WHERE id=$1 AND user_id=$2
		RETURNING id, user_id, name, description, unit, preset_id,
		          starting_level, current_xp, current_level, created_at, updated_at
	`, skillID, userID, newXP, newLevel).Scan(
		&updatedSkill.ID, &updatedSkill.UserID, &updatedSkill.Name, &updatedSkill.Description,
		&updatedSkill.Unit, &updatedSkill.PresetID, &updatedSkill.StartingLevel,
		&updatedSkill.CurrentXP, &updatedSkill.CurrentLevel, &updatedSkill.CreatedAt, &updatedSkill.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("logxp: update skill: %w", err)
	}

	// 4. Check for first-hit gate — set first_notified_at if needed.
	// Use a subquery form for the UPDATE so ORDER BY + LIMIT work correctly in PostgreSQL.
	var gateFirstHit *BlockerGate
	var g BlockerGate
	err = tx.QueryRow(ctx, `
		UPDATE public.blocker_gates
		SET first_notified_at=NOW()
		WHERE id = (
			SELECT id FROM public.blocker_gates
			WHERE skill_id=$1
			  AND gate_level <= $2
			  AND is_cleared = FALSE
			  AND first_notified_at IS NULL
			ORDER BY gate_level
			LIMIT 1
		)
		RETURNING id, skill_id, gate_level, title, description, first_notified_at, is_cleared, cleared_at
	`, skillID, newLevel).Scan(
		&g.ID, &g.SkillID, &g.GateLevel, &g.Title, &g.Description,
		&g.FirstNotifiedAt, &g.IsCleared, &g.ClearedAt,
	)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("logxp: gate check: %w", err)
	}
	if err == nil {
		gateFirstHit = &g
	}
	// pgx.ErrNoRows is expected when no gate was first-hit — not an error.

	if err = tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("logxp: commit: %w", err)
	}

	tierCrossed := xpcurve.TierNumber(levelBefore) != xpcurve.TierNumber(newLevel)

	return &LogXPResult{
		Skill:         &updatedSkill,
		XPAdded:       xpDelta,
		LevelBefore:   levelBefore,
		LevelAfter:    newLevel,
		TierCrossed:   tierCrossed,
		TierName:      xpcurve.TierName(newLevel),
		TierNumber:    xpcurve.TierNumber(newLevel),
		QuickLogChips: xpcurve.QuickLogChips(newLevel),
		GateFirstHit:  gateFirstHit,
	}, nil
}

// GetRecentLogs returns the last N xp_events for a skill (most recent first).
func GetRecentLogs(ctx context.Context, db *pgxpool.Pool, skillID uuid.UUID, limit int) ([]XPEvent, error) {
	if limit <= 0 {
		limit = 10
	}
	rows, err := db.Query(ctx, `
		SELECT id, skill_id, xp_delta, COALESCE(log_note, '')
		FROM public.xp_events
		WHERE skill_id=$1
		ORDER BY created_at DESC
		LIMIT $2
	`, skillID, limit)
	if err != nil {
		return nil, fmt.Errorf("logxp: recent logs: %w", err)
	}
	defer rows.Close()

	var out []XPEvent
	for rows.Next() {
		var e XPEvent
		if err := rows.Scan(&e.ID, &e.SkillID, &e.XPDelta, &e.LogNote); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}
