# Workstream 4 — Workout App (Proposed)

**Program:** `2026-08-14-program-suite-completion`  
**Feature:** F-078 (new)  
**Decision:** D-067 — **do not implement until the sign-off block in `requirements.md` chooses “build now”.**  
**Default:** defer.

This file is still a complete agent pack so a later run does not re-plan from scratch.

## Why this is proposed, not committed

The suite already has LifeQuest (skills/time), NutriLog (nutrition), and MindTrack (scaffold). A workout app is a natural fourth domain (D-037 hub), but it is a new Next.js app, new schema prefix, and new IA. Building it before NutriLog’s food diary exists repeats the NutriLog-scaffold mistake: two unfinished suite apps. Sign-off must be explicit.

**Rejected alternative:** stuffing workouts into a LifeQuest skill named “Gym”. Skills are progression objects with XP/gates; workouts need sets, loads, and templates. Different bounded context.

## Current-state audit

| Piece | State |
|-------|-------|
| `apps/workout` | Does not exist |
| `wo_*` tables | Not reserved in architecture until this program |
| MindTrack scaffold | Pattern to copy: Next.js app, BFF `app/api/[...path]/route.ts`, theme tokens, `@rpgtracker/auth` |
| NutriLog MVP | Better pattern to copy for the first vertical slice (auth + one entity + chart/list) |

## Out of scope even after sign-off (first slice)

- Cross-app XP (F-020).
- Social / leaderboards.
- Wearable import (Apple Health, Strava).
- Periodization AI, video demos, 1RM calculators beyond a simple estimated 1RM display.
- Cardio GPS maps.
- Replacing LifeQuest sessions.

---

## Product: first sufficient slice

**Name:** Workout (display). **Code:** `apps/workout`. **Theme:** new product theme `workout-forge` (tokens in `packages/ui/tokens/`), analogous to `nutri-saas` / `mental-calm`. Do not reuse LifeQuest three-theme switcher inside this app for v1 (same as NutriLog).

**Core loop**

1. Start or open today’s session.
2. Add exercises (user catalog; seed a small default list per user on first session **or** free-text create).
3. Log sets: reps + optional load_kg + optional RPE.
4. Finish session (duration inferred from first-to-last set, or explicit minutes).
5. History list + simple volume chart (sum sets × reps × load; bodyweight exercises count as 0 load and still show set count).

That is the analogue of NutriLog F-013: one complete loop, no AI required.

## User cases

### C-WO-01 Auth gate

Same as NutriLog: unauthenticated users hit login; session cookie via `@rpgtracker/auth`.

### C-WO-02 Create session

**When** POST `/workout/sessions` with optional `notes`, optional `started_at`  
**Then** 201 session `status=in_progress`.

### C-WO-03 Add exercise to session

**Given** a session  
**When** POST set group / exercise line with name  
**Then** if name matches user’s `wo_exercises`, reuse id; else create exercise (`source=user`).

### C-WO-04 Log sets

**When** POST `{ "reps": 8, "load_kg": 60, "rpe": 7 }`  
**Then** append. `load_kg` null allowed (bodyweight). `reps` > 0. RPE 1–10 or null.

### C-WO-05 Finish

**When** POST `{ "status": "completed" }`  
**Then** `completed_at=now()`, duration computed if missing. No more sets (409 if POST set on completed).

### C-WO-06 History + chart

GET sessions newest first. GET `/workout/volume-chart?days=30` → per-day volume. Sparse nulls OK (match weight chart).

### C-WO-07 Delete

Delete a set or an in-progress session (own only). Completed sessions: delete allowed in v1 (user correction), 404 if not owned.

### C-WO-08 Isolation

All queries `user_id` scoped. 401 / 404 rules identical to NutriLog.

### C-WO-09 Templates (second session, optional)

Save current session as `wo_templates`; apply creates a new in_progress session with empty sets copied as exercise list only (not loads).

### C-WO-10 AI (explicitly later)

Not in F-078. A future “suggest next session from pantry of exercises + recent fatigue” would copy recipe grounding rules. Do not build it here.

---

## Schema sketch (`wo_` prefix)

```sql
CREATE TABLE public.wo_exercises (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, lower(name))
);

CREATE TABLE public.wo_sessions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status       TEXT NOT NULL CHECK (status IN ('in_progress','completed')),
    notes        TEXT NOT NULL DEFAULT '',
    started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.wo_sets (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    session_id   UUID NOT NULL REFERENCES public.wo_sessions(id) ON DELETE CASCADE,
    exercise_id  UUID NOT NULL REFERENCES public.wo_exercises(id),
    reps         INTEGER NOT NULL CHECK (reps > 0),
    load_kg      NUMERIC(6,2),
    rpe          NUMERIC(3,1) CHECK (rpe IS NULL OR (rpe >= 1 AND rpe <= 10)),
    position     INTEGER NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

RLS owner policies on all three. Index `(user_id, started_at DESC)` on sessions.

## HTTP sketch (`/api/v1/workout/...`)

| Method | Path |
|--------|------|
| POST/GET | `/sessions` |
| GET/PATCH | `/sessions/{id}` |
| POST | `/sessions/{id}/sets` |
| DELETE | `/sets/{id}` |
| GET | `/volume-chart?days=` |
| GET/POST | `/exercises` |

## New app scaffold (copy NutriLog)

Create `apps/workout` with:

- `package.json` workspace, Next.js 15 App Router, same BFF proxy as nutri-log
- `app/layout.tsx` `data-theme="workout-forge"`
- `app/(auth)/login`, `app/(app)/layout`, `app/(app)/dashboard` (today’s session + history)
- Vitest + RTL matching nutri-log
- Root turbo/pnpm workspace wiring
- `packages/ui` token file + `PRODUCT_THEMES` union update

Page guide: `Documentation/page-guides/workout-dashboard.md` before UI.

---

## Acceptance criteria

| ID | Criterion | Verify |
|----|-----------|--------|
| AC-WO-01 | App boots, login gates dashboard | `pnpm --filter workout test` |
| AC-WO-02 | Migration RLS/FK | Go migrate test |
| AC-WO-03 | Create session + sets; completed rejects new sets | Go |
| AC-WO-04 | Chart series days param | Go |
| AC-WO-05 | Isolation 401/404 | Go |
| AC-WO-06 | api-client | package test |
| AC-WO-07 | UI: log a 3-set exercise, finish, see history | workout tests |
| AC-WO-08 | No LifeQuest XP writes; no nutri tables | diff |
| AC-WO-09 | `pnpm` workspace + CI include the new app | `pnpm --filter workout test` in CI config if required |

---

## Sessions (only after D-067 = build now)

### WO-01 — Schema + API

**Prompt**

```text
D-067 is signed to BUILD. Implement session WO-01 from Documentation/delivery/2026-08-14-program-suite-completion/04-workout-proposed.md.

Add wo_exercises, wo_sessions, wo_sets migrations with RLS. Go package internal/workout and handlers under /api/v1/workout/. AC-WO-02–05. Do not create the Next.js app yet if you are time-boxed; prefer API-first. No AI. No XP. Stop on go test green. Tracker F-078 in-progress (API).
```

### WO-02 — App scaffold + typed client + UI

**Depends on:** WO-01.

**Prompt**

```text
D-067 is signed to BUILD. Implement session WO-02 from 04-workout-proposed.md.

Copy apps/nutri-log scaffold to apps/workout (auth, BFF, vitest). Add workout-forge tokens. Typed client. Dashboard: in-progress session, add exercise, add sets, finish, history, volume chart. Page guide first. Wire pnpm workspace. AC-WO-01, 06, 07, 09. Tracker F-078 done for MVP slice.
```

### WO-03 — Templates (optional)

Skip unless operator asks. Save/apply session templates. No AI.

---

## If D-067 stays deferred

Leave this file in place. Tracker row F-078 remains `needs-clarification` or `deferred`. Architecture still reserves `wo_` so NutriLog work does not collide. Do **not** add `apps/workout` empty scaffold “for later” — NutriLog already taught that empty apps rot.

## Done when (after build)

User logs a strength session of several sets, finishes it, and sees it on a 30-day volume chart, authenticated, isolated, with no hub XP.
