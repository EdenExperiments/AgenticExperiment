# Preset Skills Library — Design Spec

**Date:** 2026-03-16
**Status:** Approved
**Feature IDs:** F-004 (Preset Skills Library)

---

## Overview

Add a curated library of preset skills so new users can get started immediately without needing to invent skill definitions from scratch. When a user taps "New Skill", they first land on a browse screen (search + category chips + grouped list). Selecting a preset pre-fills the creation form. A custom-from-scratch path remains accessible as an escape hatch.

---

## Goals

- Reduce friction at the most common drop-off point: the blank skill creation form
- Seed the app with meaningful, relatable skill examples across diverse life domains
- Lay groundwork for future personalisation (interest-based filtering at onboarding)

---

## Out of Scope (This Iteration)

- Onboarding interest survey (table exists in schema; UX deferred)
- AI-generated preset suggestions
- User-submitted presets
- Starting level caps/XP curve guidelines (deferred to planning team)
- Preset ratings or popularity sorting

---

## Database Schema

### `skill_categories`

| Column        | Type        | Notes                               |
|---------------|-------------|-------------------------------------|
| `id`          | `uuid` PK   | default `gen_random_uuid()`         |
| `name`        | `text`      | e.g. "Fitness & Movement"           |
| `slug`        | `text`      | e.g. "fitness", unique              |
| `emoji`       | `text`      | display icon e.g. "🏃"              |
| `sort_order`  | `int`       | controls chip/list order            |
| `created_at`  | `timestamptz` | default `now()`                   |

### `skill_presets`

| Column          | Type        | Notes                                        |
|-----------------|-------------|----------------------------------------------|
| `id`            | `uuid` PK   | default `gen_random_uuid()`                  |
| `category_id`   | `uuid` FK`→ skill_categories.id` | ON DELETE CASCADE         |
| `name`          | `text`      | e.g. "Running"                               |
| `description`   | `text`      | short tagline shown in browse list           |
| `default_unit`  | `text`      | e.g. "km", "session", "minutes"              |
| `sort_order`    | `int`       | order within category                        |
| `created_at`    | `timestamptz` | default `now()`                            |

### `user_category_interests` (scaffolded for future use)

| Column        | Type        | Notes                                        |
|---------------|-------------|----------------------------------------------|
| `user_id`     | `uuid` FK`→ users.id` | ON DELETE CASCADE                  |
| `category_id` | `uuid` FK`→ skill_categories.id` | ON DELETE CASCADE         |
| `created_at`  | `timestamptz` | default `now()`                            |
| PK: (`user_id`, `category_id`)                                              |

### Changes to `skills`

Add nullable `preset_id uuid REFERENCES skill_presets(id) ON DELETE SET NULL`.
Null = created from scratch. Non-null = spawned from a preset (for analytics/future use).

---

## Seed Data

**9 meta categories**, minimum 10 presets each (~90+ total rows).

| # | Category            | Slug          | Emoji |
|---|---------------------|---------------|-------|
| 1 | Fitness & Movement  | fitness       | 🏃    |
| 2 | Programming & Tech  | programming   | 💻    |
| 3 | Creative Arts       | creative      | 🎨    |
| 4 | Wellness & Mind     | wellness      | 🧘    |
| 5 | Learning & Knowledge| learning      | 📚    |
| 6 | Social & Communication | social     | 🗣    |
| 7 | Finance & Career    | finance       | 💰    |
| 8 | Nutrition & Health  | nutrition     | 🥗    |
| 9 | Productivity & Focus| productivity  | ⚡    |

Seed delivered via a SQL migration file (`migrations/XXXX_seed_skill_presets.sql`).

---

## Routes & Handlers

| Method | Path                  | Handler                    | Notes                              |
|--------|-----------------------|----------------------------|------------------------------------|
| GET    | `/skills/new`         | `HandleGetPresetBrowse`    | Browse screen (replaces old entry) |
| GET    | `/skills/new/custom`  | `HandleGetNewSkill`        | Existing scratch-creation flow     |
| GET    | `/skills/new/preset/{id}` | `HandleGetPresetDetail` | (Phase 2+) detail/confirm step    |
| POST   | `/skills/new/from-preset/{id}` | `HandlePostFromPreset` | Pre-fill form, create skill  |

`HandleGetPresetBrowse` accepts optional query params:
- `?q=` — search filter (server-side, case-insensitive substring match on name + description)
- `?category=` — slug filter (e.g. `?category=fitness`)

HTMX: category chips and search bar both fire `hx-get="/skills/new"` with updated params, swapping only the results list (`hx-target="#preset-results"`).

---

## Browse Screen UI

**Layout B: Search-first with category chips**

```
┌──────────────────────────────────────┐
│  ← Back     Choose a Skill           │
├──────────────────────────────────────┤
│  🔍 Search skills…                    │
│                                      │
│  [All] [🏃 Fitness] [💻 Programming]  │
│        [🎨 Creative] [🧘 Wellness]…   │
│                                      │
│  FITNESS & MOVEMENT                  │
│  ┌─────────────────────────────────┐ │
│  │ Running                       › │ │
│  │ Build aerobic endurance…        │ │
│  └─────────────────────────────────┘ │
│  ...                                 │
│  ──────────────────────────────────  │
│     + Create a custom skill instead  │
└──────────────────────────────────────┘
```

- Dark theme matching existing app (`#111827` shell, `#1f2937` cards)
- Active chip: indigo (`#4338ca` bg, `#e0e7ff` text)
- Inactive chips: `#1f2937` bg, `#9ca3af` text
- Section headers: `#6b7280`, 11px, uppercase, letter-spaced
- Chevron: `#818cf8`
- Escape hatch pinned at bottom, separated by a hairline rule

---

## Component / File Structure

```
internal/
  skills/
    preset_handler.go      # HandleGetPresetBrowse, HandlePostFromPreset
    preset_repository.go   # DB queries: ListCategories, ListPresets(filter), GetPreset(id)
  templates/
    skills/
      preset_browse.templ  # Full browse page
      preset_results.templ # HTMX partial: just the results list (for live search/filter)
migrations/
  XXXX_add_skill_presets.sql         # schema: skill_categories, skill_presets, user_category_interests, alter skills
  XXXX_seed_skill_presets.sql        # seed: 9 categories + 90+ presets
```

---

## Data Flow

1. User navigates to `/skills/new` → `HandleGetPresetBrowse` queries all categories + presets (grouped), renders `preset_browse.templ`
2. User types in search or taps a chip → HTMX `hx-get="/skills/new?q=run&category=fitness"` → server returns `preset_results.templ` partial → swapped into `#preset-results`
3. User taps a preset row → navigates to `/skills/new/from-preset/{id}` (POST or GET with pre-fill TBD in implementation planning)
4. Existing skill creation form renders pre-filled with `name`, `description`, `default_unit` from the preset; `preset_id` stored on save
5. "Create a custom skill instead" → links to `/skills/new/custom` (existing flow, unchanged)

---

## Open Questions (Deferred)

| Question | Owner | Notes |
|---|---|---|
| Starting level caps / XP curve for preset-seeded skills | Planning team | Needs dedicated planning pass |
| Onboarding interest survey UX (using `user_category_interests`) | UX planning | Table exists; flow deferred |
| Preset detail/confirm screen before pre-filling form | Implementation | May skip for MVP; go direct to form |

---

## Acceptance Criteria

- [ ] `/skills/new` shows browse screen with search + category chips + grouped preset list
- [ ] Typing in search filters presets server-side (HTMX partial swap, no full reload)
- [ ] Tapping a category chip filters to that category
- [ ] Selecting a preset navigates to skill creation form with name + description pre-filled
- [ ] `preset_id` is stored on the created skill record
- [ ] "Create a custom skill instead" navigates to `/skills/new/custom` (existing form, blank)
- [ ] 9 categories and ≥ 90 preset rows present in seeded DB
- [ ] Existing skill creation flow at `/skills/new/custom` is unbroken
