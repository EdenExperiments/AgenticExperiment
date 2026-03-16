# Preset Skills Library Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a curated preset skills library so users land on a browsable, searchable screen when creating a skill, instead of a blank form.

**Architecture:** Three independent layers built bottom-up — (1) DB schema + seed data, (2) browse screen (repository → templates → handler → routes), (3) basic skill creation form with pre-fill from preset. The browse screen uses HTMX partial swaps for live search/filter; the preset row tap is a plain GET anchor that 303-redirects to the creation form with query params.

**Tech Stack:** Go 1.24, Chi v5, Templ, HTMX 2.0.3, Tailwind CSS, pgx/v5, golang-migrate, `github.com/google/uuid`

**Spec:** `docs/superpowers/specs/2026-03-16-preset-skills-library-design.md`

---

## Chunk 1: Database

### Task 1: Schema migration

**Files:**
- Create: `db/migrations/000003_add_skill_presets.up.sql`
- Create: `db/migrations/000003_add_skill_presets.down.sql`

- [ ] **Step 1: Write the up migration**

Create `db/migrations/000003_add_skill_presets.up.sql`:

```sql
-- skill_categories: global read-only lookup table; no user-scoped RLS needed.
-- This is the first migration to define this table (it does not exist before 000003).
CREATE TABLE public.skill_categories (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    slug       TEXT NOT NULL UNIQUE,
    emoji      TEXT NOT NULL,
    sort_order INT  NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- skill_presets: global read-only lookup table; no user-scoped RLS needed.
CREATE TABLE public.skill_presets (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id  UUID NOT NULL REFERENCES public.skill_categories(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    default_unit TEXT NOT NULL DEFAULT 'session',
    sort_order   INT  NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- user_category_interests: scaffolded for future onboarding personalisation.
CREATE TABLE public.user_category_interests (
    user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.skill_categories(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, category_id)
);

-- RLS: aspirational scaffolding — see architecture.md section 4.2.
-- Primary access control in release 1 is WHERE user_id = $userID in the Go layer.
-- These policies are defined now to prepare the schema; they are not the active
-- access control mechanism until the app.current_user_id session variable is set.
ALTER TABLE public.user_category_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_category_interests_self_rw ON public.user_category_interests
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

-- skills: the core user skill records.
-- NOTE: This migration introduces the skills table for the first time (migrations
-- 000001 and 000002 only define users and user_ai_keys). preset_id is nullable:
-- null = created from scratch, non-null = spawned from a preset.
CREATE TABLE public.skills (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    unit        TEXT NOT NULL DEFAULT 'session',
    preset_id   UUID REFERENCES public.skill_presets(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: aspirational scaffolding — see architecture.md section 4.2.
-- Primary access control in release 1 is WHERE user_id = $userID in the Go layer.
-- These policies are defined now to prepare the schema; they are not the active
-- access control mechanism until the app.current_user_id session variable is set.
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY skills_self_rw ON public.skills
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);
```

- [ ] **Step 2: Write the down migration**

Create `db/migrations/000003_add_skill_presets.down.sql`:

```sql
-- skills references skill_presets, so drop it first.
-- This is safe because skills is first defined in this migration (000003).
DROP TABLE IF EXISTS public.skills;
DROP TABLE IF EXISTS public.user_category_interests;
DROP TABLE IF EXISTS public.skill_presets;
DROP TABLE IF EXISTS public.skill_categories;
```

- [ ] **Step 3: Apply and verify**

```bash
make migrate-up
make migrate-status
```

Expected: version shows `3`, no errors. Then verify with psql:

```bash
psql "$DATABASE_URL" -c "\dt public.skill*" -c "\dt public.user_category_interests"
```

Expected: `skill_categories`, `skill_presets`, `skills`, and `user_category_interests` all listed.

- [ ] **Step 4: Commit**

```bash
git add db/migrations/000003_add_skill_presets.up.sql db/migrations/000003_add_skill_presets.down.sql
git commit -m "feat: add skill_categories, skill_presets, skills schema (migration 003)"
```

---

### Task 2: Seed migration

**Files:**
- Create: `db/migrations/000004_seed_skill_presets.up.sql`
- Create: `db/migrations/000004_seed_skill_presets.down.sql`

- [ ] **Step 1: Write the up seed migration**

Create `db/migrations/000004_seed_skill_presets.up.sql`. This inserts all 9 categories and ≥ 10 presets each (90+ total rows) using a CTE so foreign keys are resolved symbolically.

```sql
-- Insert categories
INSERT INTO public.skill_categories (name, slug, emoji, sort_order) VALUES
    ('Fitness & Movement',      'fitness',      '🏃', 1),
    ('Programming & Tech',      'programming',  '💻', 2),
    ('Creative Arts',           'creative',     '🎨', 3),
    ('Wellness & Mind',         'wellness',     '🧘', 4),
    ('Learning & Knowledge',    'learning',     '📚', 5),
    ('Social & Communication',  'social',       '🗣', 6),
    ('Finance & Career',        'finance',      '💰', 7),
    ('Nutrition & Health',      'nutrition',    '🥗', 8),
    ('Productivity & Focus',    'productivity', '⚡', 9);

-- Insert presets by joining on slug to get category_id
INSERT INTO public.skill_presets (category_id, name, description, default_unit, sort_order)
SELECT c.id, p.name, p.description, p.default_unit, p.sort_order
FROM public.skill_categories c
JOIN (VALUES
    -- Fitness & Movement
    ('fitness', 'Running',           'Build aerobic endurance and consistency',         'km',      1),
    ('fitness', 'Strength Training', 'Progressive resistance and muscular development', 'session', 2),
    ('fitness', 'Yoga',              'Flexibility, balance and mindful movement',       'session', 3),
    ('fitness', 'Cycling',           'Cardiovascular fitness on the bike',              'km',      4),
    ('fitness', 'Swimming',          'Low-impact full-body cardio',                    'laps',    5),
    ('fitness', 'Hiking',            'Endurance and outdoor connection',                'km',      6),
    ('fitness', 'HIIT',              'High-intensity interval training',                'session', 7),
    ('fitness', 'Walking',           'Daily movement and active recovery',              'steps',   8),
    ('fitness', 'Rock Climbing',     'Strength, problem-solving and focus',             'session', 9),
    ('fitness', 'Martial Arts',      'Discipline, technique and self-defence',          'session', 10),

    -- Programming & Tech
    ('programming', 'Python',           'General-purpose scripting and data work',         'session', 1),
    ('programming', 'System Design',    'Architecture, scalability and trade-off thinking','session', 2),
    ('programming', 'Go',               'Fast, statically typed backend development',      'session', 3),
    ('programming', 'Data Structures',  'Algorithms and problem-solving fundamentals',     'problem', 4),
    ('programming', 'TypeScript',       'Type-safe front-end and Node.js development',     'session', 5),
    ('programming', 'SQL',              'Relational databases and query optimisation',      'session', 6),
    ('programming', 'DevOps',           'CI/CD, containers and infrastructure as code',    'session', 7),
    ('programming', 'Security',         'Secure coding, pen-testing and threat modelling', 'session', 8),
    ('programming', 'Open Source',      'Contributing to public projects and communities', 'PR',      9),
    ('programming', 'Code Review',      'Giving and receiving high-quality feedback',      'review',  10),

    -- Creative Arts
    ('creative', 'Drawing',        'Observation, line quality and visual thinking',  'session', 1),
    ('creative', 'Writing',        'Craft, voice and consistent practice',           'words',   2),
    ('creative', 'Music Practice', 'Instrument skill and ear training',              'minutes', 3),
    ('creative', 'Photography',    'Composition, light and storytelling',            'session', 4),
    ('creative', 'Video Editing',  'Narrative pacing and visual grammar',            'session', 5),
    ('creative', 'Painting',       'Colour, medium and expressive technique',        'session', 6),
    ('creative', 'Graphic Design', 'Layout, typography and visual communication',   'session', 7),
    ('creative', '3D Modelling',   'Spatial reasoning and digital sculpting',        'session', 8),
    ('creative', 'Songwriting',    'Melody, lyric and arrangement',                 'song',    9),
    ('creative', 'Poetry',         'Precision, imagery and emotional resonance',     'poem',    10),

    -- Wellness & Mind
    ('wellness', 'Meditation',      'Present-moment awareness and mental clarity',   'minutes', 1),
    ('wellness', 'Journaling',      'Reflection, clarity and emotional processing',  'entry',   2),
    ('wellness', 'Sleep Hygiene',   'Consistent, restorative sleep habits',          'night',   3),
    ('wellness', 'Breathwork',      'Nervous system regulation and stress relief',   'session', 4),
    ('wellness', 'Cold Exposure',   'Resilience and circulatory health',             'session', 5),
    ('wellness', 'Gratitude',       'Positive perspective and emotional wellbeing',  'entry',   6),
    ('wellness', 'Digital Detox',   'Intentional offline time and presence',         'hour',    7),
    ('wellness', 'Therapy',         'Professional support for mental health',        'session', 8),
    ('wellness', 'Nature Time',     'Restorative outdoor and green-space exposure',  'minutes', 9),
    ('wellness', 'Stretching',      'Mobility and physical tension release',         'minutes', 10),

    -- Learning & Knowledge
    ('learning', 'Reading',            'Deep focus and knowledge acquisition',           'pages',   1),
    ('learning', 'Language Learning',  'Vocabulary, grammar and conversational fluency', 'minutes', 2),
    ('learning', 'Mathematics',        'Logical reasoning and quantitative fluency',     'problem', 3),
    ('learning', 'History',            'Context, perspective and critical analysis',     'chapter', 4),
    ('learning', 'Science',            'Experimental thinking and evidence evaluation',  'session', 5),
    ('learning', 'Online Courses',     'Structured self-directed learning',              'lesson',  6),
    ('learning', 'Research',           'Deep-dive on a topic and note synthesis',        'session', 7),
    ('learning', 'Speed Reading',      'Comprehension and reading rate improvement',     'session', 8),
    ('learning', 'Memory Training',    'Spaced repetition and retention techniques',     'session', 9),
    ('learning', 'Philosophy',         'Reasoning, ethics and fundamental questions',    'session', 10),

    -- Social & Communication
    ('social', 'Public Speaking',   'Clarity, presence and audience connection',     'session', 1),
    ('social', 'Active Listening',  'Empathy, attention and understanding others',    'session', 2),
    ('social', 'Networking',        'Building genuine professional relationships',    'meeting', 3),
    ('social', 'Negotiation',       'Mutual-gain outcomes and persuasive framing',    'session', 4),
    ('social', 'Writing Clearly',   'Concise, effective written communication',      'piece',   5),
    ('social', 'Mentoring',         'Developing others through guidance and feedback','session', 6),
    ('social', 'Conflict Res.',     'Constructive resolution and de-escalation',     'session', 7),
    ('social', 'Presentation',      'Slides, delivery and visual storytelling',      'session', 8),
    ('social', 'Debate',            'Structured argumentation and critical thinking', 'session', 9),
    ('social', 'Storytelling',      'Narrative arc and emotional engagement',         'session', 10),

    -- Finance & Career
    ('finance', 'Investing',         'Portfolio management and financial reasoning',   'session', 1),
    ('finance', 'Budgeting',         'Spending awareness and financial planning',      'month',   2),
    ('finance', 'Career Dev.',       'Skill-building aligned to career goals',         'session', 3),
    ('finance', 'Side Project',      'Building something outside your main job',       'hour',    4),
    ('finance', 'Tax Planning',      'Optimising tax position and compliance',         'session', 5),
    ('finance', 'Contract Review',   'Reading and understanding legal agreements',     'document',6),
    ('finance', 'Salary Negot.',     'Researching and negotiating compensation',       'session', 7),
    ('finance', 'Portfolio Review',  'Analysing and rebalancing investments',          'session', 8),
    ('finance', 'Business Dev.',     'Sales, partnerships and growth skills',          'session', 9),
    ('finance', 'Financial Lit.',    'Understanding economics and money fundamentals', 'session', 10),

    -- Nutrition & Health
    ('nutrition', 'Meal Prep',       'Consistent, healthy eating through planning',   'session', 1),
    ('nutrition', 'Protein Intake',  'Hitting daily protein targets',                 'gram',    2),
    ('nutrition', 'Water Intake',    'Consistent hydration habits',                   'litre',   3),
    ('nutrition', 'Cooking',         'Whole-food recipes and kitchen technique',      'meal',    4),
    ('nutrition', 'Intermittent Fast','Metabolic health through time-restricted eating','hour',  5),
    ('nutrition', 'Veggie Servings', 'Daily vegetable and fibre targets',             'serving', 6),
    ('nutrition', 'Sugar Reduction', 'Cutting refined sugar and processed foods',     'day',     7),
    ('nutrition', 'Calorie Track',   'Awareness of energy intake and balance',        'day',     8),
    ('nutrition', 'Supplement Stack','Consistent micronutrient supplementation',      'day',     9),
    ('nutrition', 'Gut Health',      'Fermented foods, fibre and microbiome care',    'session', 10),

    -- Productivity & Focus
    ('productivity', 'Deep Work',       'Uninterrupted focus blocks on hard problems',   'hour',    1),
    ('productivity', 'Time Blocking',   'Scheduled, intentional use of calendar time',   'session', 2),
    ('productivity', 'GTD / Inbox Zero','Trusted system for capturing and clearing tasks','session', 3),
    ('productivity', 'Note-Taking',     'Building a personal knowledge management system','note',   4),
    ('productivity', 'Email Hygiene',   'Fast processing and zero-inbox discipline',      'session', 5),
    ('productivity', 'Morning Routine', 'Consistent start to the day',                   'day',     6),
    ('productivity', 'Evening Review',  'Daily reflection and next-day preparation',     'session', 7),
    ('productivity', 'Task Batching',   'Grouping similar tasks to reduce switching',    'session', 8),
    ('productivity', 'Focus Timer',     'Pomodoro or interval-based concentration',       'session', 9),
    ('productivity', 'Weekly Review',   'Stepping back, reviewing goals and adjusting',  'session', 10)
) AS p(slug, name, description, default_unit, sort_order)
ON c.slug = p.slug;
```

- [ ] **Step 2: Write the down migration**

Create `db/migrations/000004_seed_skill_presets.down.sql`:

```sql
-- Deletes all preset rows. This is intentionally destructive — it is the correct
-- rollback for a seed migration. If user-submitted presets are introduced in a
-- future iteration, this down migration must be narrowed to only the seeded slugs.
DELETE FROM public.skill_presets;
DELETE FROM public.skill_categories;
```

- [ ] **Step 3: Apply and verify**

```bash
make migrate-up
```

Then verify counts:

```bash
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM skill_categories; SELECT COUNT(*) FROM skill_presets;"
```

Expected: `9` categories, `90` presets (10 per category).

- [ ] **Step 4: Commit**

```bash
git add db/migrations/000004_seed_skill_presets.up.sql db/migrations/000004_seed_skill_presets.down.sql
git commit -m "feat: seed 9 skill categories and 90 presets (migration 004)"
```

---

## Chunk 2: Browse Screen

### Task 3: Repository

**Files:**
- Create: `internal/skills/preset_repository.go`
- Create: `internal/skills/preset_repository_test.go`

- [ ] **Step 1: Write the failing tests**

Create `internal/skills/preset_repository_test.go`:

```go
package skills_test

import (
	"context"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/meden/rpgtracker/internal/skills"
)

func testDB(t *testing.T) *pgxpool.Pool {
	t.Helper()
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		t.Skip("DATABASE_URL not set")
	}
	db, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		t.Fatalf("connect to DB: %v", err)
	}
	t.Cleanup(db.Close)
	return db
}

func TestListCategories(t *testing.T) {
	db := testDB(t)
	cats, err := skills.ListCategories(context.Background(), db)
	if err != nil {
		t.Fatalf("ListCategories: %v", err)
	}
	if len(cats) != 9 {
		t.Errorf("got %d categories, want 9", len(cats))
	}
	// First category should be Fitness by sort_order
	if cats[0].Slug != "fitness" {
		t.Errorf("first category slug = %q, want %q", cats[0].Slug, "fitness")
	}
}

func TestListCategoriesWithPresets_NoFilter(t *testing.T) {
	db := testDB(t)
	result, err := skills.ListCategoriesWithPresets(context.Background(), db, skills.PresetFilter{})
	if err != nil {
		t.Fatalf("ListCategoriesWithPresets: %v", err)
	}
	if len(result) != 9 {
		t.Errorf("got %d categories, want 9", len(result))
	}
	totalPresets := 0
	for _, c := range result {
		totalPresets += len(c.Presets)
	}
	if totalPresets < 90 {
		t.Errorf("got %d total presets, want ≥90", totalPresets)
	}
}

func TestListCategoriesWithPresets_CategoryFilter(t *testing.T) {
	db := testDB(t)
	result, err := skills.ListCategoriesWithPresets(context.Background(), db, skills.PresetFilter{
		Category: "fitness",
	})
	if err != nil {
		t.Fatalf("ListCategoriesWithPresets with category filter: %v", err)
	}
	if len(result) != 1 {
		t.Errorf("got %d categories, want 1", len(result))
	}
	if result[0].Slug != "fitness" {
		t.Errorf("category slug = %q, want %q", result[0].Slug, "fitness")
	}
	if len(result[0].Presets) < 10 {
		t.Errorf("got %d fitness presets, want ≥10", len(result[0].Presets))
	}
}

func TestListCategoriesWithPresets_SearchFilter(t *testing.T) {
	db := testDB(t)
	result, err := skills.ListCategoriesWithPresets(context.Background(), db, skills.PresetFilter{
		Query: "running",
	})
	if err != nil {
		t.Fatalf("ListCategoriesWithPresets with search: %v", err)
	}
	// "Running" should appear
	found := false
	for _, c := range result {
		for _, p := range c.Presets {
			if p.Name == "Running" {
				found = true
			}
		}
	}
	if !found {
		t.Error("search for 'running' did not return the Running preset")
	}
}

func TestGetPreset(t *testing.T) {
	db := testDB(t)
	// First list to get a real ID
	cats, err := skills.ListCategoriesWithPresets(context.Background(), db, skills.PresetFilter{
		Category: "fitness",
	})
	if err != nil || len(cats) == 0 || len(cats[0].Presets) == 0 {
		t.Fatal("could not get a preset ID to look up")
	}
	id := cats[0].Presets[0].ID

	preset, err := skills.GetPreset(context.Background(), db, id)
	if err != nil {
		t.Fatalf("GetPreset: %v", err)
	}
	if preset.ID != id {
		t.Errorf("GetPreset ID = %v, want %v", preset.ID, id)
	}
}

func TestGetPreset_NotFound(t *testing.T) {
	db := testDB(t)
	// Use a nil UUID which will never exist
	_, err := skills.GetPreset(context.Background(), db, [16]byte{})
	if err == nil {
		t.Error("expected error for non-existent preset, got nil")
	}
}
```

- [ ] **Step 2: Run to confirm tests fail**

```bash
go test ./internal/skills/... -v -run TestList
```

Expected: `FAIL` — `skills` package does not exist yet.

- [ ] **Step 3: Implement the repository**

Create `internal/skills/preset_repository.go`:

```go
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
```

- [ ] **Step 4: Run tests — expect pass**

```bash
go test ./internal/skills/... -v
```

Expected: all tests PASS (skipped if `DATABASE_URL` not set).

- [ ] **Step 5: Commit**

```bash
git add internal/skills/preset_repository.go internal/skills/preset_repository_test.go
git commit -m "feat: add preset repository (ListCategories, ListCategoriesWithPresets, GetPreset)"
```

---

### Task 4: Browse page templates

**Files:**
- Create: `internal/templates/pages/preset_browse.templ`
- Create: `internal/templates/partials/preset_results.templ`

- [ ] **Step 1: Write `preset_results.templ` (HTMX partial)**

Create `internal/templates/partials/preset_results.templ`:

```go
package partials

import "github.com/meden/rpgtracker/internal/skills"

// PresetResults renders the grouped results list for the preset browse screen.
// Used for HTMX partial swaps (search + category filter).
templ PresetResults(cats []skills.CategoryWithPresets) {
	if len(cats) == 0 {
		<div class="py-12 text-center text-gray-500 text-sm">No skills match your search.</div>
	} else {
		for _, cat := range cats {
			<div class="mb-2">
				<div class="text-gray-500 text-xs font-semibold uppercase tracking-widest px-1 py-2">
					{ cat.Emoji } { cat.Name }
				</div>
				for _, p := range cat.Presets {
					<a
						href={ templ.URL("/skills/new/from-preset/" + p.ID.String()) }
						class="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3 mb-1 hover:bg-gray-700 transition-colors"
					>
						<div>
							<div class="text-gray-100 text-sm font-medium">{ p.Name }</div>
							<div class="text-gray-500 text-xs mt-0.5">{ p.Description }</div>
						</div>
						<span class="text-indigo-400 text-lg ml-3">›</span>
					</a>
				}
			</div>
		}
	}
}
```

- [ ] **Step 2: Write `preset_browse.templ` (full page + content fragment)**

Create `internal/templates/pages/preset_browse.templ`:

```go
package pages

import (
	"github.com/meden/rpgtracker/internal/skills"
	"github.com/meden/rpgtracker/internal/templates/layout"
	"github.com/meden/rpgtracker/internal/templates/partials"
)

// PresetBrowseContent renders the browse UI fragment (used for HTMX nav swaps and as inner content for full page).
templ PresetBrowseContent(allCats []skills.Category, cats []skills.CategoryWithPresets, filter skills.PresetFilter) {
	<div class="max-w-lg mx-auto py-4">
		<h1 class="text-lg font-semibold text-gray-100 mb-4">Choose a Skill</h1>

		<!-- Search bar -->
		<div class="relative mb-3">
			<input
				type="search"
				name="q"
				value={ filter.Query }
				placeholder="Search skills…"
				class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 pl-10 text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
				hx-get="/skills/new"
				hx-trigger="input changed delay:300ms"
				hx-target="#preset-results"
				hx-include="[name='category']"
			/>
			<span class="absolute left-3 top-2.5 text-gray-500 text-sm">🔍</span>
		</div>

		<!-- Category chips -->
		<div class="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-none">
			<button
				name="category"
				value=""
				class={
					"flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors",
					templ.KV("bg-indigo-700 text-indigo-100", filter.Category == ""),
					templ.KV("bg-gray-800 text-gray-400 hover:bg-gray-700", filter.Category != ""),
				}
				hx-get="/skills/new"
				hx-target="#preset-results"
				hx-include="[name='q']"
			>All</button>
			for _, cat := range allCats {
				<button
					name="category"
					value={ cat.Slug }
					class={
						"flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors",
						templ.KV("bg-indigo-700 text-indigo-100", filter.Category == cat.Slug),
						templ.KV("bg-gray-800 text-gray-400 hover:bg-gray-700", filter.Category != cat.Slug),
					}
					hx-get="/skills/new"
					hx-target="#preset-results"
					hx-include="[name='q']"
				>{ cat.Emoji } { cat.Name }</button>
			}
		</div>

		<!-- Results list (HTMX swap target) -->
		<div id="preset-results">
			@partials.PresetResults(cats)
		</div>

		<!-- Escape hatch -->
		<div class="mt-6 pt-4 border-t border-gray-800 text-center">
			<a href="/skills/new/custom" class="text-indigo-400 text-sm hover:text-indigo-300 transition-colors">
				+ Create a custom skill instead
			</a>
		</div>
	</div>
}

// PresetBrowse renders the full page (direct browser navigation).
templ PresetBrowse(allCats []skills.Category, cats []skills.CategoryWithPresets, filter skills.PresetFilter) {
	@layout.Shell("skills") {
		@PresetBrowseContent(allCats, cats, filter)
	}
}
```

- [ ] **Step 3: Compile templates**

```bash
make generate
```

Expected: no errors. New `*_templ.go` files appear alongside the `.templ` files.

- [ ] **Step 4: Verify build**

```bash
go build ./...
```

Expected: compiles cleanly.

- [ ] **Step 5: Commit**

```bash
git add internal/templates/pages/preset_browse.templ internal/templates/partials/preset_results.templ
git commit -m "feat: add preset browse page and results partial templates"
```

---

### Task 5: Preset handler

**Files:**
- Create: `internal/skills/preset_handler.go`
- Create: `internal/skills/preset_handler_test.go`

- [ ] **Step 1: Write the failing handler tests**

Create `internal/skills/preset_handler_test.go`:

```go
package skills_test

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/skills"
)

// stubStore is an in-memory implementation of PresetStore for handler tests.
type stubStore struct {
	categories []skills.Category
	grouped    []skills.CategoryWithPresets
	preset     *skills.Preset
}

func (s *stubStore) ListCategories(_ context.Context) ([]skills.Category, error) {
	return s.categories, nil
}
func (s *stubStore) ListCategoriesWithPresets(_ context.Context, _ skills.PresetFilter) ([]skills.CategoryWithPresets, error) {
	return s.grouped, nil
}
func (s *stubStore) GetPreset(_ context.Context, _ uuid.UUID) (*skills.Preset, error) {
	if s.preset == nil {
		return nil, fmt.Errorf("not found")
	}
	return s.preset, nil
}

var testPresetID = uuid.MustParse("11111111-1111-1111-1111-111111111111")

func newStubStore() *stubStore {
	cat := skills.Category{ID: uuid.New(), Name: "Fitness & Movement", Slug: "fitness", Emoji: "🏃", SortOrder: 1}
	preset := skills.Preset{
		ID:          testPresetID,
		CategoryID:  cat.ID,
		Name:        "Running",
		Description: "Build aerobic endurance",
		DefaultUnit: "km",
	}
	return &stubStore{
		categories: []skills.Category{cat},
		grouped:    []skills.CategoryWithPresets{{Category: cat, Presets: []skills.Preset{preset}}},
		preset:     &preset,
	}
}

func TestHandleGetPresetBrowse_FullPage(t *testing.T) {
	h := skills.NewPresetHandlerWithStore(newStubStore())
	req := httptest.NewRequest(http.MethodGet, "/skills/new", nil)
	rec := httptest.NewRecorder()

	h.HandleGetPresetBrowse(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", rec.Code)
	}
	body := rec.Body.String()
	if !strings.Contains(body, "Choose a Skill") {
		t.Error("full page should contain page title")
	}
	if !strings.Contains(body, "Running") {
		t.Error("full page should contain preset name")
	}
}

func TestHandleGetPresetBrowse_HTMXPartial(t *testing.T) {
	h := skills.NewPresetHandlerWithStore(newStubStore())
	req := httptest.NewRequest(http.MethodGet, "/skills/new?category=fitness", nil)
	req.Header.Set("HX-Request", "true")
	req.Header.Set("HX-Target", "preset-results")
	rec := httptest.NewRecorder()

	h.HandleGetPresetBrowse(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", rec.Code)
	}
	body := rec.Body.String()
	// Results partial should NOT contain the Shell wrapper or page chrome
	if strings.Contains(body, "<html") {
		t.Error("HTMX partial should not contain <html> tag")
	}
	if !strings.Contains(body, "Running") {
		t.Error("partial should contain the preset name")
	}
}

func TestHandleGetFromPreset_Redirects(t *testing.T) {
	h := skills.NewPresetHandlerWithStore(newStubStore())

	r := chi.NewRouter()
	r.Get("/skills/new/from-preset/{id}", h.HandleGetFromPreset)

	req := httptest.NewRequest(http.MethodGet, "/skills/new/from-preset/"+testPresetID.String(), nil)
	rec := httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusSeeOther {
		t.Errorf("status = %d, want 303", rec.Code)
	}
	loc := rec.Header().Get("Location")
	if !strings.HasPrefix(loc, "/skills/new/custom") {
		t.Errorf("redirect location = %q, want prefix /skills/new/custom", loc)
	}
	if !strings.Contains(loc, "name=Running") {
		t.Errorf("redirect should include name param, got %q", loc)
	}
	if !strings.Contains(loc, "preset_id="+testPresetID.String()) {
		t.Errorf("redirect should include preset_id param, got %q", loc)
	}
}
```

- [ ] **Step 2: Run to confirm tests fail**

```bash
go test ./internal/skills/... -run TestHandleGet -v
```

Expected: compile error — `PresetHandler`, `PresetStore`, `NewPresetHandlerWithStore` do not exist yet.

- [ ] **Step 3: Implement the handler**

Create `internal/skills/preset_handler.go`:

```go
package skills

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"net/url"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/meden/rpgtracker/internal/templates"
	"github.com/meden/rpgtracker/internal/templates/pages"
	"github.com/meden/rpgtracker/internal/templates/partials"
)

// PresetStore is the read interface the handler needs from the DB layer.
// The real implementation is the free functions in preset_repository.go,
// wrapped by dbPresetStore below. Tests inject a stub.
type PresetStore interface {
	ListCategories(ctx context.Context) ([]Category, error)
	ListCategoriesWithPresets(ctx context.Context, filter PresetFilter) ([]CategoryWithPresets, error)
	GetPreset(ctx context.Context, id uuid.UUID) (*Preset, error)
}

// PresetHandler handles the preset browse and redirect endpoints.
type PresetHandler struct {
	store PresetStore
}

// NewPresetHandler constructs a PresetHandler backed by the given DB pool.
func NewPresetHandler(db *pgxpool.Pool) *PresetHandler {
	return &PresetHandler{store: &dbPresetStore{db: db}}
}

// NewPresetHandlerWithStore constructs a PresetHandler with an injected store.
// Use this in tests to avoid a real DB connection.
func NewPresetHandlerWithStore(s PresetStore) *PresetHandler {
	return &PresetHandler{store: s}
}

// dbPresetStore wraps the free repository functions to satisfy PresetStore.
type dbPresetStore struct{ db *pgxpool.Pool }

func (s *dbPresetStore) ListCategories(ctx context.Context) ([]Category, error) {
	return ListCategories(ctx, s.db)
}
func (s *dbPresetStore) ListCategoriesWithPresets(ctx context.Context, f PresetFilter) ([]CategoryWithPresets, error) {
	return ListCategoriesWithPresets(ctx, s.db, f)
}
func (s *dbPresetStore) GetPreset(ctx context.Context, id uuid.UUID) (*Preset, error) {
	return GetPreset(ctx, s.db, id)
}

// HandleGetPresetBrowse serves GET /skills/new.
//
// Three rendering modes based on request headers:
//   - No HX-Request: full page (Shell + browse content).
//   - HX-Request + HX-Target="preset-results": results partial only (chip/search filter).
//   - HX-Request (other targets, e.g. nav click): content fragment only (no Shell).
func (h *PresetHandler) HandleGetPresetBrowse(w http.ResponseWriter, r *http.Request) {
	filter := PresetFilter{
		Query:    r.URL.Query().Get("q"),
		Category: r.URL.Query().Get("category"),
	}

	cats, err := h.store.ListCategoriesWithPresets(r.Context(), filter)
	if err != nil {
		log.Printf("preset browse: list presets: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	// Results-only partial (HTMX chip/search filter swap)
	if r.Header.Get("HX-Target") == "preset-results" {
		if err := templates.Render(w, r, http.StatusOK, partials.PresetResults(cats)); err != nil {
			log.Printf("preset browse: render partial: %v", err)
		}
		return
	}

	// Full page or HTMX nav content swap — needs all categories for chips
	allCats, err := h.store.ListCategories(r.Context())
	if err != nil {
		log.Printf("preset browse: list categories: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	if err := templates.RenderPage(w, r, http.StatusOK,
		pages.PresetBrowse(allCats, cats, filter),
		pages.PresetBrowseContent(allCats, cats, filter),
	); err != nil {
		log.Printf("preset browse: render page: %v", err)
	}
}

// HandleGetFromPreset serves GET /skills/new/from-preset/{id}.
// It looks up the preset by ID and 303-redirects to /skills/new/custom
// with name, description, unit and preset_id as URL query params.
func (h *PresetHandler) HandleGetFromPreset(w http.ResponseWriter, r *http.Request) {
	rawID := chi.URLParam(r, "id")
	id, err := uuid.Parse(rawID)
	if err != nil {
		http.Error(w, "invalid preset id", http.StatusBadRequest)
		return
	}

	preset, err := h.store.GetPreset(r.Context(), id)
	if err != nil {
		log.Printf("preset redirect: get preset %s: %v", rawID, err)
		http.Error(w, "preset not found", http.StatusNotFound)
		return
	}

	q := url.Values{}
	q.Set("preset_id", preset.ID.String())
	q.Set("name", preset.Name)
	q.Set("description", preset.Description)
	q.Set("unit", preset.DefaultUnit)

	http.Redirect(w, r, fmt.Sprintf("/skills/new/custom?%s", q.Encode()), http.StatusSeeOther)
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
go test ./internal/skills/... -run TestHandleGet -v
```

Expected: all handler tests PASS.

- [ ] **Step 5: Build check**

```bash
make generate && go build ./...
```

- [ ] **Step 6: Commit**

```bash
git add internal/skills/preset_handler.go internal/skills/preset_handler_test.go
git commit -m "feat: add preset browse handler (HandleGetPresetBrowse, HandleGetFromPreset)"
```

---

### Task 6: Wire routes in server.go

**Files:**
- Modify: `internal/server/server.go`

- [ ] **Step 1: Write the failing test**

The existing `/skills` route renders the dashboard — it's a stub. After this task it should render a skills placeholder page. Since there's no dedicated skills list page yet, `/skills` will redirect to `/skills/new` for now (the browse screen is the entry point).

Add a test in `internal/server/server_test.go` (create it if it does not exist; if it already exists, add the `TestSkillsRouteExists` function to the existing file without overwriting it):

```go
package server_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/meden/rpgtracker/internal/server"
)

func TestSkillsRouteExists(t *testing.T) {
	// Minimal smoke test: /skills/new should return 200 (with a real DB it would work,
	// without DB it will 500 — we just check routing, not content).
	// A nil db will panic in the handler, so we test route registration via chi's
	// route listing approach. For now, just verify the route resolves (non-404).
	t.Skip("route registration smoke test — expand when test DB is available")
}
```

This task is primarily a wiring task — the behaviour is validated by the handler tests above. The smoke test is a placeholder.

- [ ] **Step 2: Update `internal/server/server.go`**

Add the `skills` import and wire the new routes inside the protected group. Replace the stub `/skills` handler and add the new routes:

```go
// Add to imports:
"github.com/meden/rpgtracker/internal/skills"
```

Inside the protected `r.Group(func(r chi.Router) { ... })`, replace:

```go
r.Get("/skills", func(w http.ResponseWriter, r *http.Request) {
    if err := templates.RenderPage(w, r, http.StatusOK, pages.Dashboard(), pages.DashboardContent()); err != nil {
        http.Error(w, "render error", http.StatusInternalServerError)
    }
})
```

with:

```go
presetHandler := skills.NewPresetHandler(db)
r.Get("/skills", func(w http.ResponseWriter, r *http.Request) {
    http.Redirect(w, r, "/skills/new", http.StatusFound)
})
r.Get("/skills/new", presetHandler.HandleGetPresetBrowse)
r.Get("/skills/new/from-preset/{id}", presetHandler.HandleGetFromPreset)
// /skills/new/custom is wired in Task 8 (skill creation handler)
```

- [ ] **Step 3: Build and verify**

```bash
make generate && go build ./...
```

Expected: compiles cleanly.

- [ ] **Step 4: Manual smoke test**

```bash
make run
```

Navigate to `http://localhost:8080/skills` — should redirect to `/skills/new` and render the browse screen with 9 category chips and 90 presets. Test the search bar (type "run") and category chips — list should update via HTMX without a full page reload.

- [ ] **Step 5: Commit**

```bash
git add internal/server/server.go internal/server/server_test.go
git commit -m "feat: wire preset browse routes in server (/skills/new, /skills/new/from-preset/{id})"
```

---

## Chunk 3: Skill Creation Form

### Task 7: Skill creation repository

**Files:**
- Create: `internal/skills/skill_repository.go`
- Create: `internal/skills/skill_repository_test.go`

- [ ] **Step 1: Write the failing tests**

Create `internal/skills/skill_repository_test.go`:

```go
package skills_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/skills"
)

func TestCreateSkill_FromScratch(t *testing.T) {
	db := testDB(t)

	// Need a real user_id in the users table. Use the test-user sentinel.
	userID := uuid.MustParse("00000000-0000-0000-0000-000000000099")
	_, _ = db.Exec(context.Background(),
		`INSERT INTO public.users (id, email) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		userID, "testuser@example.com",
	)
	t.Cleanup(func() {
		_, _ = db.Exec(context.Background(), `DELETE FROM public.skills WHERE user_id = $1`, userID)
	})

	skill, err := skills.CreateSkill(context.Background(), db, userID, "Test Skill", "A description", "session", nil)
	if err != nil {
		t.Fatalf("CreateSkill: %v", err)
	}
	if skill.Name != "Test Skill" {
		t.Errorf("name = %q, want %q", skill.Name, "Test Skill")
	}
	if skill.PresetID != nil {
		t.Error("preset_id should be nil for scratch skill")
	}
}

func TestCreateSkill_FromPreset(t *testing.T) {
	db := testDB(t)

	userID := uuid.MustParse("00000000-0000-0000-0000-000000000099")
	_, _ = db.Exec(context.Background(),
		`INSERT INTO public.users (id, email) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		userID, "testuser@example.com",
	)

	// Get a real preset ID
	cats, err := skills.ListCategoriesWithPresets(context.Background(), db, skills.PresetFilter{Category: "fitness"})
	if err != nil || len(cats) == 0 || len(cats[0].Presets) == 0 {
		t.Skip("no preset available to test with")
	}
	presetID := cats[0].Presets[0].ID

	t.Cleanup(func() {
		_, _ = db.Exec(context.Background(), `DELETE FROM public.skills WHERE user_id = $1`, userID)
	})

	skill, err := skills.CreateSkill(context.Background(), db, userID, "Running", "cardio", "km", &presetID)
	if err != nil {
		t.Fatalf("CreateSkill with preset: %v", err)
	}
	if skill.PresetID == nil || *skill.PresetID != presetID {
		t.Errorf("preset_id = %v, want %v", skill.PresetID, presetID)
	}
}
```

- [ ] **Step 2: Run to confirm fail**

```bash
go test ./internal/skills/... -run TestCreateSkill -v
```

Expected: compile error — `CreateSkill` does not exist.

- [ ] **Step 3: Implement `CreateSkill`**

Create `internal/skills/skill_repository.go`:

```go
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
```

- [ ] **Step 4: Run tests — expect pass**

```bash
go test ./internal/skills/... -run TestCreateSkill -v
```

- [ ] **Step 5: Commit**

```bash
git add internal/skills/skill_repository.go internal/skills/skill_repository_test.go
git commit -m "feat: add CreateSkill repository function"
```

---

### Task 8: Skill creation page template

**Files:**
- Create: `internal/templates/pages/skill_new.templ`

- [ ] **Step 1: Write `skill_new.templ`**

Create `internal/templates/pages/skill_new.templ`:

```go
package pages

import "github.com/meden/rpgtracker/internal/templates/layout"

// SkillNewData holds the pre-fill values and any validation error for the new skill form.
type SkillNewData struct {
	Name        string
	Description string
	Unit        string
	PresetID    string // empty if scratch creation
	Error       string
}

// SkillNewContent renders the skill creation form fragment.
templ SkillNewContent(d SkillNewData) {
	<div class="max-w-lg mx-auto py-4">
		<div class="flex items-center gap-3 mb-6">
			<a href="/skills/new" class="text-gray-400 hover:text-gray-200 text-sm">← Back</a>
			<h1 class="text-lg font-semibold text-gray-100">New Skill</h1>
		</div>

		if d.Error != "" {
			<div class="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 mb-4 text-red-300 text-sm">
				{ d.Error }
			</div>
		}

		<form method="POST" action="/skills/new/custom" class="space-y-4">
			if d.PresetID != "" {
				<input type="hidden" name="preset_id" value={ d.PresetID }/>
			}

			<div>
				<label class="block text-sm font-medium text-gray-300 mb-1" for="name">Skill name</label>
				<input
					id="name"
					type="text"
					name="name"
					value={ d.Name }
					required
					maxlength="100"
					placeholder="e.g. Running"
					class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
				/>
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-300 mb-1" for="description">Description <span class="text-gray-500">(optional)</span></label>
				<textarea
					id="description"
					name="description"
					rows="2"
					maxlength="300"
					placeholder="What does levelling up this skill mean to you?"
					class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
				>{ d.Description }</textarea>
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-300 mb-1" for="unit">Unit of measurement <span class="text-gray-500">(optional)</span></label>
				<input
					id="unit"
					type="text"
					name="unit"
					value={ d.Unit }
					maxlength="30"
					placeholder="e.g. km, session, pages"
					class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
				/>
			</div>

			<button
				type="submit"
				class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg text-sm transition-colors mt-2"
			>
				Create Skill
			</button>
		</form>
	</div>
}

// SkillNew renders the full skill creation page.
templ SkillNew(d SkillNewData) {
	@layout.Shell("skills") {
		@SkillNewContent(d)
	}
}
```

- [ ] **Step 2: Compile templates**

```bash
make generate && go build ./...
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add internal/templates/pages/skill_new.templ
git commit -m "feat: add skill creation form template with pre-fill support"
```

---

### Task 9: Skill creation handler

**Files:**
- Modify: `internal/auth/context.go`
- Create: `internal/skills/skill_handler.go`
- Create: `internal/skills/skill_handler_test.go`

- [ ] **Step 1: Add `WithUserID` to `internal/auth/context.go`**

The test file (Step 2) uses `auth.WithUserID` to inject a user ID without a real JWT. This must exist before the test file is written or it will not compile. Add the following to `internal/auth/context.go` (same package as `userIDKey`, so the constant is accessible):

```go
// WithUserID returns a copy of ctx with the user ID set.
// Used in tests to inject authentication state without a real JWT.
// Must store the ID as a string to match the type assertion in UserIDFromContext.
func WithUserID(ctx context.Context, id uuid.UUID) context.Context {
	return context.WithValue(ctx, userIDKey, id.String())
}
```

Run `go build ./...` to confirm it compiles before proceeding.

- [ ] **Step 2: Write the failing tests**

Create `internal/skills/skill_handler_test.go`:

```go
package skills_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/skills"
)

// stubSkillStore is a SkillStore that records the last CreateSkill call.
type stubSkillStore struct {
	lastUserID   uuid.UUID
	lastName     string
	lastPresetID *uuid.UUID
}

func (s *stubSkillStore) CreateSkill(_ context.Context, userID uuid.UUID, name, _, _ string, presetID *uuid.UUID) (*skills.Skill, error) {
	s.lastUserID = userID
	s.lastName = name
	s.lastPresetID = presetID
	return &skills.Skill{ID: uuid.New(), UserID: userID, Name: name}, nil
}

var testUserID = uuid.MustParse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")

func requestWithUser(method, target string, body url.Values) *http.Request {
	var req *http.Request
	if body != nil {
		req = httptest.NewRequest(method, target, strings.NewReader(body.Encode()))
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	} else {
		req = httptest.NewRequest(method, target, nil)
	}
	ctx := auth.WithUserID(req.Context(), testUserID)
	return req.WithContext(ctx)
}

func TestHandleGetNewSkill_Blank(t *testing.T) {
	store := &stubSkillStore{}
	h := skills.NewSkillHandlerWithStore(store)
	req := requestWithUser(http.MethodGet, "/skills/new/custom", nil)
	rec := httptest.NewRecorder()

	h.HandleGetNewSkill(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", rec.Code)
	}
	body := rec.Body.String()
	if !strings.Contains(body, "New Skill") {
		t.Error("page should contain form title")
	}
}

func TestHandleGetNewSkill_PreFill(t *testing.T) {
	store := &stubSkillStore{}
	h := skills.NewSkillHandlerWithStore(store)
	req := requestWithUser(http.MethodGet, "/skills/new/custom?name=Running&description=cardio&unit=km&preset_id="+testPresetID.String(), nil)
	rec := httptest.NewRecorder()

	h.HandleGetNewSkill(rec, req)

	body := rec.Body.String()
	if !strings.Contains(body, "Running") {
		t.Error("form should be pre-filled with preset name")
	}
	if !strings.Contains(body, testPresetID.String()) {
		t.Error("form should contain hidden preset_id input")
	}
}

func TestHandlePostNewSkill_Valid(t *testing.T) {
	store := &stubSkillStore{}
	h := skills.NewSkillHandlerWithStore(store)

	form := url.Values{
		"name":        {"Running"},
		"description": {"cardio"},
		"unit":        {"km"},
		"preset_id":   {testPresetID.String()},
	}
	req := requestWithUser(http.MethodPost, "/skills/new/custom", form)
	rec := httptest.NewRecorder()

	h.HandlePostNewSkill(rec, req)

	if rec.Code != http.StatusSeeOther {
		t.Errorf("status = %d, want 303", rec.Code)
	}
	if store.lastName != "Running" {
		t.Errorf("stored name = %q, want %q", store.lastName, "Running")
	}
	if store.lastPresetID == nil || *store.lastPresetID != testPresetID {
		t.Errorf("stored preset_id = %v, want %v", store.lastPresetID, testPresetID)
	}
}

func TestHandlePostNewSkill_MissingName(t *testing.T) {
	store := &stubSkillStore{}
	h := skills.NewSkillHandlerWithStore(store)

	form := url.Values{"name": {""}}
	req := requestWithUser(http.MethodPost, "/skills/new/custom", form)
	rec := httptest.NewRecorder()

	h.HandlePostNewSkill(rec, req)

	if rec.Code != http.StatusUnprocessableEntity {
		t.Errorf("status = %d, want 422", rec.Code)
	}
}
```

- [ ] **Step 3: Run tests to confirm fail**

```bash
go test ./internal/skills/... -run TestHandleGetNewSkill -v
```

Expected: compile error — `SkillHandler` and `NewSkillHandlerWithStore` not defined yet. (`auth.WithUserID` now exists from Step 1, so the only missing symbols are from the skills package.)

- [ ] **Step 4: Implement the handler**

Create `internal/skills/skill_handler.go`:

```go
package skills

import (
	"context"
	"log"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/templates"
	"github.com/meden/rpgtracker/internal/templates/pages"
)

// SkillStore is the write interface the handler needs from the DB layer.
type SkillStore interface {
	CreateSkill(ctx context.Context, userID uuid.UUID, name, description, unit string, presetID *uuid.UUID) (*Skill, error)
}

// SkillHandler handles the skill creation endpoints.
type SkillHandler struct {
	store SkillStore
}

// NewSkillHandler constructs a SkillHandler backed by the given DB pool.
func NewSkillHandler(db *pgxpool.Pool) *SkillHandler {
	return &SkillHandler{store: &dbSkillStore{db: db}}
}

// NewSkillHandlerWithStore constructs a SkillHandler with an injected store (for tests).
func NewSkillHandlerWithStore(s SkillStore) *SkillHandler {
	return &SkillHandler{store: s}
}

type dbSkillStore struct{ db *pgxpool.Pool }

func (s *dbSkillStore) CreateSkill(ctx context.Context, userID uuid.UUID, name, description, unit string, presetID *uuid.UUID) (*Skill, error) {
	return CreateSkill(ctx, s.db, userID, name, description, unit, presetID)
}

// HandleGetNewSkill renders GET /skills/new/custom.
// If query params (name, description, unit, preset_id) are present, the form is pre-filled.
func (h *SkillHandler) HandleGetNewSkill(w http.ResponseWriter, r *http.Request) {
	d := pages.SkillNewData{
		Name:        r.URL.Query().Get("name"),
		Description: r.URL.Query().Get("description"),
		Unit:        r.URL.Query().Get("unit"),
		PresetID:    r.URL.Query().Get("preset_id"),
	}
	if err := templates.RenderPage(w, r, http.StatusOK,
		pages.SkillNew(d), pages.SkillNewContent(d),
	); err != nil {
		log.Printf("skill new: render: %v", err)
	}
}

// HandlePostNewSkill processes POST /skills/new/custom.
// Validates, creates the skill, then redirects to /skills.
func (h *SkillHandler) HandlePostNewSkill(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	name := strings.TrimSpace(r.FormValue("name"))
	if name == "" {
		d := pages.SkillNewData{
			Name:        name,
			Description: r.FormValue("description"),
			Unit:        r.FormValue("unit"),
			PresetID:    r.FormValue("preset_id"),
			Error:       "Skill name is required.",
		}
		if err := templates.RenderPage(w, r, http.StatusUnprocessableEntity,
			pages.SkillNew(d), pages.SkillNewContent(d),
		); err != nil {
			log.Printf("skill new post: render error: %v", err)
		}
		return
	}

	description := strings.TrimSpace(r.FormValue("description"))
	unit := strings.TrimSpace(r.FormValue("unit"))
	if unit == "" {
		unit = "session"
	}

	var presetID *uuid.UUID
	if rawID := r.FormValue("preset_id"); rawID != "" {
		if id, err := uuid.Parse(rawID); err == nil {
			presetID = &id
		}
	}

	if _, err := h.store.CreateSkill(r.Context(), userID, name, description, unit, presetID); err != nil {
		log.Printf("skill new post: create skill: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, "/skills", http.StatusSeeOther)
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
go test ./internal/skills/... -run "TestHandleGetNewSkill|TestHandlePostNewSkill" -v
```

Expected: all PASS.

- [ ] **Step 6: Run full test suite**

```bash
go test ./...
```

Expected: all tests PASS (DB tests skip if `DATABASE_URL` not set).

- [ ] **Step 7: Commit**

```bash
git add internal/skills/skill_handler.go internal/skills/skill_handler_test.go internal/auth/context.go
git commit -m "feat: add skill creation handler (HandleGetNewSkill, HandlePostNewSkill)"
```

---

### Task 10: Wire skill creation routes

**Files:**
- Modify: `internal/server/server.go`

- [ ] **Step 1: Add the skill creation routes**

In `internal/server/server.go`, inside the protected group, directly after the preset handler wiring add:

```go
skillHandler := skills.NewSkillHandler(db)
r.Get("/skills/new/custom", skillHandler.HandleGetNewSkill)
r.Post("/skills/new/custom", skillHandler.HandlePostNewSkill)
```

- [ ] **Step 2: Build check**

```bash
make generate && go build ./...
```

Expected: no errors.

- [ ] **Step 3: Full test suite**

```bash
go test ./...
```

Expected: all PASS.

- [ ] **Step 4: Manual end-to-end test**

```bash
make run
```

Walk through the full user flow:

1. Navigate to `http://localhost:8080/skills/new` — browse screen loads with 9 chips and 90 presets.
2. Type "run" in search — Running appears, other presets filter out.
3. Click "🏃 Fitness" chip — shows only fitness presets.
4. Click "Running" preset row — redirects to `/skills/new/custom?name=Running&...`.
5. Name and unit fields are pre-filled. Submit.
6. Redirects to `/skills` (dashboard stub for now). No error.
7. Click "+ Create a custom skill instead" — blank form at `/skills/new/custom`.

- [ ] **Step 5: Commit**

```bash
git add internal/server/server.go
git commit -m "feat: wire skill creation routes (/skills/new/custom GET + POST)"
```

---

## Final Checklist (Acceptance Criteria)

Before calling this done, verify each item from the spec:

- [ ] `/skills/new` shows browse screen with search + category chips + grouped preset list
- [ ] Typing in search filters presets server-side (HTMX partial swap, no full reload)
- [ ] Tapping a category chip filters to that category (HTMX partial swap)
- [ ] Tapping a preset row navigates through `/skills/new/from-preset/{id}` → 303 → `/skills/new/custom` with name, description, unit, preset_id params
- [ ] Skill creation form pre-fills fields when query params are present
- [ ] `preset_id` is stored on the created skill record (verify via psql: `SELECT name, preset_id FROM skills LIMIT 5`)
- [ ] "Create a custom skill instead" navigates to `/skills/new/custom` with blank form
- [ ] 9 categories and ≥ 90 preset rows in DB: `SELECT COUNT(*) FROM skill_categories; SELECT COUNT(*) FROM skill_presets;`
- [ ] Existing auth and account flows are unbroken: login, register, account, API key all work
