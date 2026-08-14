package mindtrack

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/meden/rpgtracker/internal/database"
)

var ErrNotFound = errors.New("not found")

type MoodLog struct {
	ID        uuid.UUID `json:"id"`
	LoggedAt  time.Time `json:"logged_at"`
	Valence   int       `json:"valence"`
	Energy    int       `json:"energy"`
	Note      string    `json:"note"`
	CreatedAt time.Time `json:"created_at"`
}

type JournalEntry struct {
	ID        uuid.UUID `json:"id"`
	Body      string    `json:"body"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func CreateMood(ctx context.Context, db database.Querier, userID uuid.UUID, valence, energy int, note string) (*MoodLog, error) {
	if valence < 1 || valence > 5 || energy < 1 || energy > 3 {
		return nil, fmt.Errorf("mindtrack: valence 1-5 and energy 1-3 required")
	}
	note = strings.TrimSpace(note)
	if len(note) > 280 {
		note = note[:280]
	}
	var log MoodLog
	err := db.QueryRow(ctx, `
		INSERT INTO public.mh_mood_logs (user_id, valence, energy, note)
		VALUES ($1, $2, $3, $4)
		RETURNING id, logged_at, valence, energy, note, created_at
	`, userID, valence, energy, note).Scan(&log.ID, &log.LoggedAt, &log.Valence, &log.Energy, &log.Note, &log.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("mindtrack: create mood: %w", err)
	}
	return &log, nil
}

func ListMood(ctx context.Context, db database.Querier, userID uuid.UUID, limit int) ([]MoodLog, error) {
	rows, err := db.Query(ctx, `
		SELECT id, logged_at, valence, energy, note, created_at
		FROM public.mh_mood_logs
		WHERE user_id = $1
		ORDER BY logged_at DESC
		LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("mindtrack: list mood: %w", err)
	}
	defer rows.Close()
	var out []MoodLog
	for rows.Next() {
		var log MoodLog
		if err := rows.Scan(&log.ID, &log.LoggedAt, &log.Valence, &log.Energy, &log.Note, &log.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, log)
	}
	if out == nil {
		out = []MoodLog{}
	}
	return out, rows.Err()
}

func CreateJournal(ctx context.Context, db database.Querier, userID uuid.UUID, body string) (*JournalEntry, error) {
	body = strings.TrimSpace(body)
	if body == "" {
		return nil, fmt.Errorf("mindtrack: journal body required")
	}
	var entry JournalEntry
	err := db.QueryRow(ctx, `
		INSERT INTO public.mh_journal_entries (user_id, body)
		VALUES ($1, $2)
		RETURNING id, body, created_at, updated_at
	`, userID, body).Scan(&entry.ID, &entry.Body, &entry.CreatedAt, &entry.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("mindtrack: create journal: %w", err)
	}
	return &entry, nil
}

func ListJournal(ctx context.Context, db database.Querier, userID uuid.UUID, limit int) ([]JournalEntry, error) {
	rows, err := db.Query(ctx, `
		SELECT id, body, created_at, updated_at
		FROM public.mh_journal_entries
		WHERE user_id = $1
		ORDER BY updated_at DESC
		LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("mindtrack: list journal: %w", err)
	}
	defer rows.Close()
	var out []JournalEntry
	for rows.Next() {
		var entry JournalEntry
		if err := rows.Scan(&entry.ID, &entry.Body, &entry.CreatedAt, &entry.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, entry)
	}
	if out == nil {
		out = []JournalEntry{}
	}
	return out, rows.Err()
}

func UpdateJournal(ctx context.Context, db database.Querier, userID, id uuid.UUID, body string) (*JournalEntry, error) {
	body = strings.TrimSpace(body)
	if body == "" {
		return nil, fmt.Errorf("mindtrack: journal body required")
	}
	var entry JournalEntry
	err := db.QueryRow(ctx, `
		UPDATE public.mh_journal_entries
		SET body = $3, updated_at = now()
		WHERE id = $1 AND user_id = $2
		RETURNING id, body, created_at, updated_at
	`, id, userID, body).Scan(&entry.ID, &entry.Body, &entry.CreatedAt, &entry.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("mindtrack: update journal: %w", err)
	}
	return &entry, nil
}

func DeleteJournal(ctx context.Context, db database.Querier, userID, id uuid.UUID) error {
	tag, err := db.Exec(ctx, `DELETE FROM public.mh_journal_entries WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return fmt.Errorf("mindtrack: delete journal: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
