# Workstream 2 — NutriLog Nutrition App

**Program:** `2026-08-14-program-suite-completion`  
**Features:** F-018 (goals), F-014 (calorie/macro diary), F-016 (saved meals), F-015 (barcode)  
**Decisions:** D-065, D-068  
**Shipped already:** F-013 weight logging (`nl_weight_logs`, NutriLog dashboard)  
**App:** `apps/nutri-log` + `apps/api/internal/nutrilog` + `packages/api-client`  
**Does not include:** pantry/recipes (workstream 3), hub XP (F-020), hub `/nutri` replacement (optional later)

## Why this workstream exists

NutriLog’s product loop in the PRD is: set calorie/weight goals → log food and weight → track against targets → (later) AI meals. Only weight exists. Food logging is blocked on a provider decision; this program locks Open Food Facts (D-065).

## Current-state audit

| Piece | State |
|-------|-------|
| Auth shell, login, BFF proxy | Shipped |
| Weight form, list, 30-day chart, delete | Shipped |
| Nav | Single “Dashboard” link |
| `nl_goals`, `nl_foods`, `nl_food_logs`, `nl_meal_templates` | Missing |
| Food search / OFF HTTP client | Missing |
| Hub `/nutri` | Still Coming Soon — **leave it** unless a dedicated follow-up session |

NutriLog uses `data-theme="nutri-saas"` (`packages/ui/tokens/nutri-saas.css`), not LifeQuest’s three themes. Keep that. Do not port Minimal/Retro/Modern into NutriLog in this program.

## Out of scope

Recipes, pantry, workout, MindTrack, F-020, progress photos, streaks/gamification, weekly AI health review (F-019), lbs storage, editing weight entries (create+delete stands).

---

## User cases

### Goals (F-018)

#### C-NL-G1 Set goals first time

**Given** an authenticated user with no `nl_goals` row  
**When** they open Goals and save calorie target + optional macros + optional target weight + optional weekly rate  
**Then** a row is upserted; diary header shows remaining calories as `target − today_logged` (0 logged → remaining = target).

#### C-NL-G2 TDEE helper

**Given** the user taps “Estimate”  
**When** they enter sex, age, height_cm, weight_kg (or last weight log), activity multiplier  
**Then** client or API computes Mifflin–St Jeor and fills calorie_target. User can edit the number. No medical claims copy.

#### C-NL-G3 Validation

**Given** calorie_target ≤ 0 or weekly_rate magnitude > 1.5 kg/week  
**When** save  
**Then** 422. Weekly rate 0 allowed (maintain).

#### C-NL-G4 Isolation

Other users’ goals never returned. Unauthenticated 401.

### Food diary (F-014)

#### C-NL-F1 Search OFF

**Given** query `oats`  
**When** `GET /nutrilog/foods/search?q=`  
**Then** API queries Open Food Facts, upserts cache rows into `nl_foods` (`source=open_food_facts`), returns name, brand, serving, kcal, protein_g, carbs_g, fat_g, barcode if present.

#### C-NL-F2 OFF down

**Given** OFF 5xx/timeout  
**When** search  
**Then** 200 from local cache + user_defined only; header or body flag `provider: "degraded"`. User can still log cached/custom foods.

#### C-NL-F3 Custom food

**Given** the user creates a food (name + kcal required; macros optional)  
**When** save  
**Then** `source=user_defined`, owned by user_id. Not visible to other users.

#### C-NL-F4 Log a serving

**Given** a food id and meal slot `breakfast|lunch|dinner|snack`  
**When** POST food-log with quantity (multiplier of serving)  
**Then** row stores **snapshot** macros (kcal/macros × quantity) so later food edits do not rewrite history. `logged_at` default now; backdate ≤ 7 days.

#### C-NL-F5 Today diary

**Given** logs today  
**When** GET diary?date=YYYY-MM-DD  
**Then** entries grouped by meal slot + totals. Remaining = goal calories − totals (if goal exists; else totals only).

#### C-NL-F6 Delete log

Own log 204; other user 404. Recalc diary.

#### C-NL-F7 Low-friction

Logging a **recent/cached** food from today’s search or “recent foods” is ≤ 3 taps after search (D-019 spirit): pick food → quantity default 1 → save.

### Saved meals (F-016)

#### C-NL-M1 Save as template

**Given** today’s lunch has 2+ items  
**When** “Save meal” with a name  
**Then** `nl_meal_templates` + items snapshot. Applying the template writes new food_logs for a chosen slot/date.

#### C-NL-M2 Apply template

One tap apply → diary updates. Missing/deleted foods skipped with a warning count.

### Barcode (F-015)

#### C-NL-B1 Lookup

**Given** a barcode string  
**When** GET foods/barcode/{code}  
**Then** OFF lookup → cache → food payload. Unknown → 404, CTA to create custom food with barcode prefilled.

#### C-NL-B2 Camera

**Given** mobile Safari/Chrome with camera permission  
**When** user scans  
**Then** barcode value is sent to the lookup endpoint. Desktop: manual entry field. No native app.

---

## Confirmed requirements

1. **Schema** (one or two migrations, not a dozen): `nl_goals`, `nl_foods`, `nl_food_logs`, `nl_meal_templates`, `nl_meal_template_items`. All `user_id` FK + RLS owner policy except `nl_foods` rows with `source=open_food_facts` which are per-user cache copies (simpler isolation: **always** `user_id NOT NULL` — each user gets their own cache row; do not share OFF cache across users in v1).
2. **OFF client** in Go: timeout 5s, user-agent identifying the app, no API key. Cache on write. Never block logging on OFF.
3. **Snapshot macros** on every food_log and template item.
4. **NutriLog nav:** Diary (default), Weight (existing dashboard), Goals. Pantry/Recipes links appear only after workstream 3.
5. **Page guides** before UI: `Documentation/page-guides/nutri-diary.md`, `nutri-goals.md`.
6. Tests at each layer (D-036).

## Schema sketch

```sql
CREATE TABLE public.nl_goals (
    user_id           UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    calorie_target    INTEGER NOT NULL CHECK (calorie_target > 0),
    protein_g         NUMERIC(6,1),
    carbs_g           NUMERIC(6,1),
    fat_g             NUMERIC(6,1),
    target_weight_kg  NUMERIC(6,2),
    weekly_rate_kg    NUMERIC(4,2) CHECK (weekly_rate_kg BETWEEN -1.5 AND 1.5),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.nl_foods (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    source        TEXT NOT NULL CHECK (source IN ('open_food_facts', 'user_defined')),
    off_id        TEXT,
    barcode       TEXT,
    name          TEXT NOT NULL,
    brand         TEXT NOT NULL DEFAULT '',
    serving_qty   NUMERIC(8,2) NOT NULL DEFAULT 1,
    serving_unit  TEXT NOT NULL DEFAULT 'serving',
    kcal          NUMERIC(8,1) NOT NULL CHECK (kcal >= 0),
    protein_g     NUMERIC(8,1) NOT NULL DEFAULT 0,
    carbs_g       NUMERIC(8,1) NOT NULL DEFAULT 0,
    fat_g         NUMERIC(8,1) NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.nl_food_logs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    food_id      UUID REFERENCES public.nl_foods(id) ON DELETE SET NULL,
    meal_slot    TEXT NOT NULL CHECK (meal_slot IN ('breakfast','lunch','dinner','snack')),
    quantity     NUMERIC(8,2) NOT NULL CHECK (quantity > 0),
    kcal         NUMERIC(8,1) NOT NULL,
    protein_g    NUMERIC(8,1) NOT NULL DEFAULT 0,
    carbs_g      NUMERIC(8,1) NOT NULL DEFAULT 0,
    fat_g        NUMERIC(8,1) NOT NULL DEFAULT 0,
    food_name    TEXT NOT NULL,
    logged_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Meal templates: parent + items with the same snapshot columns as logs.

## HTTP sketch (all under `/api/v1/nutrilog`, auth required)

| Method | Path | Notes |
|--------|------|-------|
| PUT | `/goals` | upsert |
| GET | `/goals` | 404 if none |
| GET | `/foods/search?q=` | OFF + cache |
| POST | `/foods` | custom |
| GET | `/foods/barcode/{code}` | NL-06 |
| GET | `/foods/recent?limit=` | distinct recent food_id |
| POST | `/food-logs` | create |
| GET | `/diary?date=` | day totals + entries |
| DELETE | `/food-logs/{id}` | |
| POST | `/meal-templates` | |
| GET | `/meal-templates` | |
| POST | `/meal-templates/{id}/apply` | `{ date, meal_slot }` |

---

## Acceptance criteria

| ID | Criterion | Verify |
|----|-----------|--------|
| AC-NL-01 | Migration + RLS + FK to users | `go test ./internal/database/ ./internal/nutrilog/` |
| AC-NL-02 | PUT/GET goals; 422 on bad calorie/rate; 401 | Go |
| AC-NL-03 | Search caches OFF payload into `nl_foods` | Go with httptest OFF stub |
| AC-NL-04 | OFF failure returns cache/custom only + degraded | Go |
| AC-NL-05 | Custom food isolated per user | Go |
| AC-NL-06 | Food log snapshots macros; diary totals match | Go |
| AC-NL-07 | Delete own log; 404 other | Go |
| AC-NL-08 | api-client methods + types | `pnpm --filter @rpgtracker/api-client test` |
| AC-NL-09 | Goals UI save + remaining calories on diary | `pnpm --filter nutri-log test` |
| AC-NL-10 | Search → log → appears in meal slot | nutri-log test |
| AC-NL-11 | Template save/apply | Go + nutri-log |
| AC-NL-12 | Barcode lookup 404 → custom CTA | Go + nutri-log |
| AC-NL-13 | No xp_events, no LifeQuest route edits | diff scope |
| AC-NL-14 | Weight dashboard still works | existing nutri-log dashboard tests |

---

## Sessions

### NL-01 — Goals API (Go)

**Blocks:** NL-02. Independent of food.

**Paths:** `apps/api/db/migrations/` (nl_goals), `internal/nutrilog/`, `internal/handlers/`, `server.go`

**Verify:** `cd apps/api && go test ./internal/nutrilog/ ./internal/handlers/`

**Prompt**

```text
Implement session NL-01 from Documentation/delivery/2026-08-14-program-suite-completion/02-nutrilog-nutrition.md.

Add nl_goals migration (RLS, FK users) and PUT/GET /api/v1/nutrilog/goals. Validate calorie_target > 0 and weekly_rate_kg in [-1.5, 1.5]. No TDEE on the server unless you add a pure function with tests (optional). No food tables. No LifeQuest. Tests AC-NL-01, AC-NL-02. Stop when go test on nutrilog+handlers passes. Tracker: F-018 in-progress (API).
```

### NL-02 — Goals UI + nav

**Depends on:** NL-01 + api-client in this session or a tiny preceding client commit.

**Paths:** `packages/api-client`, `apps/nutri-log/app/(app)/`, page guide `Documentation/page-guides/nutri-goals.md`

**Do:** Goals route, Mifflin–St Jeor helper on the client, nav Diary/Weight/Goals (Diary can 404-empty until NL-04). Weight page stays.

**Verify:** `pnpm --filter @rpgtracker/api-client test` ; `pnpm --filter nutri-log test`

**Prompt**

```text
Implement session NL-02 from 02-nutrilog-nutrition.md.

Typed client for nutrilog goals. NutriLog Goals page: calorie, optional macros, target weight, weekly rate. Client-side Mifflin–St Jeor estimate with override. Add page guide first (D-036). Extend app nav. Do not build food diary. Keep weight dashboard tests green (AC-NL-14). Tracker F-018 done when AC-NL-09 goals half is true (remaining calories can wait for diary).
```

### NL-03 — Foods, OFF, food logs, diary API (Go)

**Depends on:** NL-01 optional. **Blocks:** NL-04, RP-*, NL-05, NL-06.

**Paths:** migrations for foods/logs, `internal/nutrilog/`, OFF HTTP client with stub tests, handlers, `server.go`

**Do:** C-NL-F1–F6, AC-NL-03–07. Timeout 5s. Snapshot macros. `diary?date=` .

**Prompt**

```text
Implement session NL-03 from 02-nutrilog-nutrition.md (F-014 API).

Migrations nl_foods + nl_food_logs (per-user cache, RLS). Open Food Facts search via Go HTTP client injected for tests; cache on success; degraded mode on failure. Custom foods. POST food-logs with macro snapshots. GET diary by date with totals. DELETE own logs. No templates, no barcode, no UI. Tests with httptest stub for OFF. AC-NL-03–07. Stop on go test green. Tracker F-014 in-progress (API).
```

### NL-04 — Food diary UI (critical path for recipes)

**Depends on:** NL-03.

**Paths:** api-client, `apps/nutri-log` diary page, page guide `nutri-diary.md`, layout nav default to diary.

**Do:** C-NL-F5, F7, AC-NL-08–10. Remaining calories if goals exist.

**Prompt**

```text
Implement session NL-04 from 02-nutrilog-nutrition.md.

Typed client for search, custom food, food-logs, diary. Diary UI: date, meal slots, search, quantity, totals, remaining vs goals. Page guide first. ≤3 taps to log a picked food. nutri-saas tokens only. AC-NL-08–10, AC-NL-14. Stop when nutri-log tests pass. Tracker F-014 done for diary (barcode still open).
```

### NL-05 — Saved meals

**Depends on:** NL-04.

**Prompt**

```text
Implement session NL-05 (F-016) from 02-nutrilog-nutrition.md.

nl_meal_templates + items, POST/GET/apply endpoints, client, “Save meal” / “Add saved meal” on diary. Snapshot macros. AC-NL-11. No barcode. Tracker F-016 done.
```

### NL-06 — Barcode (optional, after diary)

**Depends on:** NL-04. Not on recipe critical path (recipes use pantry names + food ids).

**Prompt**

```text
Implement session NL-06 (F-015) from 02-nutrilog-nutrition.md.

GET /nutrilog/foods/barcode/{code} via OFF. UI: manual barcode field always; BarcodeDetector or getUserMedia scan on capable browsers, graceful fallback. 404 → custom food with barcode filled. AC-NL-12. Tracker F-015 done.
```

---

## Combined NutriLog run (operator opt-in)

NL-01+NL-03 (Go, one PR) then NL-02+NL-04 (TS, one PR) then NL-05. NL-06 separate. Do not start RP-* until NL-04 is merged.

## Done when

F-018, F-014 done; F-016 done; F-015 done or explicitly deferred in tracker. User can set a calorie goal, search a food, log it, see remaining calories, save a meal. Weight chart still works.
