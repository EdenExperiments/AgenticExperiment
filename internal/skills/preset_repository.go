package skills

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Category is a skill meta-category from the skill_categories table.
type Category struct {
	ID        uuid.UUID
	Name      string
	Slug      string
	Emoji     string
	SortOrder int
}

// Preset is a preset skill template from the skill_presets table.
type Preset struct {
	ID          uuid.UUID
	CategoryID  uuid.UUID
	Name        string
	Description string
	DefaultUnit string
	SortOrder   int
}

// CategoryWithPresets groups a category with its matching presets.
type CategoryWithPresets struct {
	Category
	Presets []Preset
}

// PresetFilter controls which presets are returned.
// Empty fields mean "no filter".
type PresetFilter struct {
	Query    string // case-insensitive substring match on name OR description
	Category string // slug; empty = all categories
}

// ListCategories returns all categories ordered by sort_order.
func ListCategories(ctx context.Context, db *pgxpool.Pool) ([]Category, error) {
	rows, err := db.Query(ctx, `
		SELECT id, name, slug, emoji, sort_order
		FROM public.skill_categories
		ORDER BY sort_order ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("skills: list categories: %w", err)
	}
	defer rows.Close()

	var cats []Category
	for rows.Next() {
		var c Category
		if err := rows.Scan(&c.ID, &c.Name, &c.Slug, &c.Emoji, &c.SortOrder); err != nil {
			return nil, fmt.Errorf("skills: scan category: %w", err)
		}
		cats = append(cats, c)
	}
	return cats, rows.Err()
}

// ListCategoriesWithPresets returns categories (optionally filtered by slug)
// each populated with their matching presets (optionally filtered by query string).
// Categories with no matching presets are omitted.
func ListCategoriesWithPresets(ctx context.Context, db *pgxpool.Pool, filter PresetFilter) ([]CategoryWithPresets, error) {
	rows, err := db.Query(ctx, `
		SELECT
			c.id, c.name, c.slug, c.emoji, c.sort_order,
			p.id, p.name, p.description, p.default_unit, p.sort_order
		FROM public.skill_categories c
		JOIN public.skill_presets p ON p.category_id = c.id
		WHERE
			($1 = '' OR c.slug = $1)
			AND ($2 = '' OR (
				p.name        ILIKE '%' || $2 || '%'
				OR p.description ILIKE '%' || $2 || '%'
			))
		ORDER BY c.sort_order ASC, p.sort_order ASC
	`, filter.Category, filter.Query)
	if err != nil {
		return nil, fmt.Errorf("skills: list presets: %w", err)
	}
	defer rows.Close()

	// Build ordered slice preserving category order.
	indexMap := make(map[uuid.UUID]int) // catID → index in result
	var result []CategoryWithPresets

	for rows.Next() {
		var cat Category
		var p Preset
		if err := rows.Scan(
			&cat.ID, &cat.Name, &cat.Slug, &cat.Emoji, &cat.SortOrder,
			&p.ID, &p.Name, &p.Description, &p.DefaultUnit, &p.SortOrder,
		); err != nil {
			return nil, fmt.Errorf("skills: scan preset row: %w", err)
		}
		p.CategoryID = cat.ID

		idx, seen := indexMap[cat.ID]
		if !seen {
			result = append(result, CategoryWithPresets{Category: cat})
			idx = len(result) - 1
			indexMap[cat.ID] = idx
		}
		result[idx].Presets = append(result[idx].Presets, p)
	}
	return result, rows.Err()
}

// GetPreset fetches a single preset by ID.
// Returns an error if not found.
func GetPreset(ctx context.Context, db *pgxpool.Pool, id uuid.UUID) (*Preset, error) {
	var p Preset
	err := db.QueryRow(ctx, `
		SELECT id, category_id, name, description, default_unit, sort_order
		FROM public.skill_presets
		WHERE id = $1
	`, id).Scan(&p.ID, &p.CategoryID, &p.Name, &p.Description, &p.DefaultUnit, &p.SortOrder)
	if err != nil {
		return nil, fmt.Errorf("skills: get preset %s: %w", id, err)
	}
	return &p, nil
}
