// apps/api/internal/skills/xp_repository.go
package skills

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/meden/rpgtracker/internal/database"
	"github.com/meden/rpgtracker/internal/xpcurve"
)

// logXPSkillState holds the pre-update skill state needed for streak computation.
type logXPSkillState struct {
	currentStreak int
	longestStreak int
	lastLogDate   *time.Time
}

// XPEvent is one log entry.
type XPEvent struct {
	ID      uuid.UUID `json:"id"`
	SkillID uuid.UUID `json:"skill_id"`
	XPDelta int       `json:"xp_delta"`
	LogNote string    `json:"log_note,omitempty"`
}

// ActivityEvent is an XP event enriched with skill name and timestamp for the activity feed.
type ActivityEvent struct {
	ID        uuid.UUID `json:"id"`
	SkillID   uuid.UUID `json:"skill_id"`
	SkillName string    `json:"skill_name"`
	XPDelta   int       `json:"xp_delta"`
	LogNote   string    `json:"log_note,omitempty"`
	CreatedAt time.Time `json:"created_at"`
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
	Streak        *StreakResult `json:"streak"`
}

// LogXP records an XP event and updates skill progression atomically (R-003).
// trainingSessionID, when non-nil, is stored as a FK on the xp_events row linking it
// back to the training_sessions table. Pass nil for manual (non-session) XP logs.
func LogXP(ctx context.Context, db database.Querier, userID, skillID uuid.UUID, xpDelta int, logNote string, trainingSessionID *uuid.UUID) (*LogXPResult, error) {
	if xpDelta <= 0 {
		return nil, fmt.Errorf("xp_delta must be positive")
	}

	tx, err := database.Begin(ctx, db)
	if err != nil {
		return nil, fmt.Errorf("logxp: begin: %w", err)
	}
	defer tx.Rollback(ctx)

	// 1. Read current skill state including streak columns (also locks the row).
	var skillBefore Skill
	var streakState logXPSkillState
	err = tx.QueryRow(ctx, `
		SELECT id, current_xp, current_level, current_streak, longest_streak, last_log_date
		FROM public.skills
		WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL
		FOR UPDATE
	`, skillID, userID).Scan(
		&skillBefore.ID, &skillBefore.CurrentXP, &skillBefore.CurrentLevel,
		&streakState.currentStreak, &streakState.longestStreak, &streakState.lastLogDate,
	)
	if err != nil {
		return nil, fmt.Errorf("logxp: get skill: %w", err)
	}

	levelBefore := skillBefore.CurrentLevel
	newXP := skillBefore.CurrentXP + xpDelta
	newLevel := xpcurve.LevelForXP(newXP)

	// 2. Insert xp_event, optionally linking to a training session.
	if trainingSessionID != nil {
		_, err = tx.Exec(ctx, `
			INSERT INTO public.xp_events (skill_id, user_id, xp_delta, log_note, training_session_id)
			VALUES ($1, $2, $3, NULLIF($4, ''), $5)
		`, skillID, userID, xpDelta, logNote, *trainingSessionID)
	} else {
		_, err = tx.Exec(ctx, `
			INSERT INTO public.xp_events (skill_id, user_id, xp_delta, log_note)
			VALUES ($1, $2, $3, NULLIF($4, ''))
		`, skillID, userID, xpDelta, logNote)
	}
	if err != nil {
		return nil, fmt.Errorf("logxp: insert event: %w", err)
	}

	// 3. Read the user's timezone for streak computation.
	var userTimezone string
	err = tx.QueryRow(ctx, `SELECT timezone FROM public.users WHERE id=$1`, userID).Scan(&userTimezone)
	if err != nil {
		// Fall back to UTC if the users row is missing (should not happen in production).
		userTimezone = "UTC"
	}

	// 4. Compute new streak values.
	newStreak, newLongest := ComputeStreak(
		streakState.lastLogDate,
		streakState.currentStreak,
		streakState.longestStreak,
		time.Now(),
		userTimezone,
	)

	// 5. Update skill: current_xp, current_level, streak columns, last_log_date.
	today := time.Now().UTC().Truncate(24 * time.Hour)
	var updatedSkill Skill
	err = tx.QueryRow(ctx, `
		UPDATE public.skills
		SET current_xp=$3, current_level=$4, updated_at=NOW(),
		    current_streak=$5, longest_streak=$6, last_log_date=$7
		WHERE id=$1 AND user_id=$2
		RETURNING id, user_id, name, description, unit, preset_id,
		          starting_level, current_xp, current_level, created_at, updated_at
	`, skillID, userID, newXP, newLevel, newStreak, newLongest, today).Scan(
		&updatedSkill.ID, &updatedSkill.UserID, &updatedSkill.Name, &updatedSkill.Description,
		&updatedSkill.Unit, &updatedSkill.PresetID, &updatedSkill.StartingLevel,
		&updatedSkill.CurrentXP, &updatedSkill.CurrentLevel, &updatedSkill.CreatedAt, &updatedSkill.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("logxp: update skill: %w", err)
	}

	// 6. Check for first-hit gate — set first_notified_at if needed.
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
		Streak: &StreakResult{
			Current: newStreak,
			Longest: newLongest,
		},
	}, nil
}

// GetRecentLogs returns the last N xp_events for a skill (most recent first).
// The caller is responsible for verifying that the skill belongs to the
// authenticated user before calling this function.
func GetRecentLogs(ctx context.Context, db database.Querier, skillID uuid.UUID, limit int) ([]XPEvent, error) {
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
		return nil, fmt.Errorf("getrecentlogs: %w", err)
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

// GetRecentActivity returns the last N xp_events across all skills for a user,
// enriched with skill_name and created_at. Results are ordered most recent first.
// If skillID is non-nil, results are filtered to that specific skill.
func GetRecentActivity(ctx context.Context, db database.Querier, userID uuid.UUID, skillID *uuid.UUID, limit int) ([]ActivityEvent, error) {
	if limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}

	var query string
	var args []interface{}

	if skillID != nil {
		query = `
			SELECT e.id, e.skill_id, s.name, e.xp_delta, COALESCE(e.log_note, ''), e.created_at
			FROM public.xp_events e
			JOIN public.skills s ON s.id = e.skill_id
			WHERE e.user_id = $1 AND s.deleted_at IS NULL AND e.skill_id = $2
			ORDER BY e.created_at DESC
			LIMIT $3
		`
		args = []interface{}{userID, *skillID, limit}
	} else {
		query = `
			SELECT e.id, e.skill_id, s.name, e.xp_delta, COALESCE(e.log_note, ''), e.created_at
			FROM public.xp_events e
			JOIN public.skills s ON s.id = e.skill_id
			WHERE e.user_id = $1 AND s.deleted_at IS NULL
			ORDER BY e.created_at DESC
			LIMIT $2
		`
		args = []interface{}{userID, limit}
	}

	rows, err := db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("getrecentactivity: %w", err)
	}
	defer rows.Close()

	var out []ActivityEvent
	for rows.Next() {
		var a ActivityEvent
		if err := rows.Scan(&a.ID, &a.SkillID, &a.SkillName, &a.XPDelta, &a.LogNote, &a.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	if out == nil {
		out = []ActivityEvent{}
	}
	return out, rows.Err()
}
