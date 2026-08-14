# Suite Completion Program — Requirements

**Program ID:** `2026-08-14-program-suite-completion`  
**Status:** Awaiting sign-off  
**Supersedes for sequencing (does not rewrite):** `2026-06-12-epic-nutrilog-mvp` (F-013 shipped), D-004 (LifeQuest-first; NutriLog may now proceed), D-010 (blocker completion was deferred; D-064 reopens it as the LifeQuest sufficiency gap)

---

## Goal

Give long-running agents a complete, case-level spec for four product surfaces:

1. **LifeQuest skill tracker — sufficient.** Close the core loop so a user who hits a gate can finish it, optionally log in natural language, see a reward, and get grounded coaching. Depth systems (trees, meta-skills, narrative audio) stay deferred.
2. **NutriLog — nutrition app.** Move from weight-only to daily calories/macros, goals, saved meals, and barcode lookup.
3. **Recipes — food-waste AI.** Suggest recipes from ingredients the user already has (pantry / selected foods), constrained by remaining calories and macros. Lives **inside NutriLog**, not as a fourth Next.js app (D-066).
4. **Workout — proposed.** Optional fourth suite app (`apps/workout`, `wo_` schema). Planned in depth so an agent can execute after sign-off; not started until D-067 is confirmed.

---

## Non-goals (program-wide)

- Cross-app XP / hub live metrics (F-020).
- MindTrack product work (`apps/mental-health/`).
- PWA, push, data export (F-021, F-022).
- Social (F-026), intel/knowledge base (F-027), location-aware (F-030).
- LifeQuest immersion: ambient audio, narrative copy, story layer (F-042, F-043, F-031).
- LifeQuest depth: meta-skills, skill trees, mastery sub-skills, character visual identity beyond F-036 (F-011, F-025, F-029, F-028).
- Replacing user-supplied Claude keys with unlimited platform-billed tokens at £4.99 (D-070: BYOK and/or metered quota only).
- A standalone `apps/recipes` deployable.

---

## Binding decisions this program proposes

Defaults below are in force for agent dispatch **after sign-off**. If a question is unanswered, use the default.

| ID | Decision | Default |
|----|----------|---------|
| D-064 | LifeQuest “sufficient” = F-009b + F-007 + F-010 + F-012. Trees/meta-skills/immersion remain deferred. | Accept |
| D-065 | First food data provider is Open Food Facts. User-defined foods always work if OFF is down. Nutritionix not in this program. | Accept |
| D-066 | Recipe + pantry live in `apps/nutri-log` (`nl_pantry_*`, `nl_recipes`). Waste-reduction is the primary AI constraint: prefer using on-hand ingredients over a generic meal idea. | Accept |
| D-067 | Workout is a **proposed** suite app (`apps/workout`, `wo_` prefix). Do not scaffold until this row is explicitly signed. Strength-session logging is the first slice. | Defer build until signed |
| D-068 | NutriLog IA: Diary, Weight, Goals, Pantry, Recipes as first-class nav in `apps/nutri-log`. LifeQuest hub `/nutri` stays a placeholder until a later hub-link slice (not this program’s critical path). | Accept |

---

## Open questions (human)

| # | Question | Default if unanswered |
|---|----------|----------------------|
| Q1 | Confirm D-064 sufficient set (include F-012 coaching in the first LifeQuest wave)? | Include F-012 after F-007; F-010 can ship with F-009b |
| Q2 | Confirm recipes inside NutriLog (D-066) vs a new `apps/recipes`? | Inside NutriLog |
| Q3 | Confirm workout as a new app (D-067) vs a LifeQuest “training” skill category? | New app, after NutriLog diary, not in the first dispatch wave |
| Q4 | Weight/food units: kg-only vs kg storage + lb display? | Store kg and grams; optional lb display later |
| Q5 | TDEE formula for calorie goals? | Mifflin–St Jeor; user can override the calorie number |
| Q6 | Barcode in this program or after diary is stable? | After diary (NL-06); not on the critical path for recipes |
| Q7 | Recipe AI: reuse AI Goal Coach entitlement (`pro` + stored Claude key) or any user with a key? | Same entitlement as F-075 (`subscription_required` / `no_api_key` / `ready`) |
| Q8 | Gate AI: reject must be a real possible outcome (not always-clear)? | Yes — parse structured verdict; cooldown on reject (24h) |
| Q9 | Pantry expiry dates in v1? | Optional `expires_on` date; AI prefers soon-to-expire items when present |
| Q10 | Workout first slice: strength sets vs timed cardio vs both? | Strength sessions (exercise + sets + reps + optional load). Cardio duration as a session note, not a second schema. |

---

## Sequencing (critical path)

```text
LQ-01 gate API  → LQ-02 gate UI  → LQ-04 reward moment
                      ↓
                 LQ-03 detailed logs → LQ-05 coaching

NL-01 goals API → NL-02 goals UI
NL-03 foods+logs API → NL-04 diary UI → RP-01 pantry API → RP-02 pantry UI
                                         → RP-03 AI recipes → RP-04 save+cook
                    NL-04 → NL-05 templates
                    NL-04 → NL-06 barcode (optional)

WO-* only after D-067 signed and preferably after NL-04
```

LifeQuest and NutriLog may run in parallel. Recipes must not start before a food can be searched and logged. Workout must not start before D-067.

---

## Sufficiency bar (when is the program “enough” to dispatch?)

This pack is sufficient for an agent when each workstream file contains all of:

- Current-state audit (what exists vs stub vs missing).
- User cases with Given / When / Then.
- Confirmed requirements, assumptions, and out-of-scope.
- Independently verifiable AC IDs.
- Schema and HTTP contract sketches.
- Named sessions with target paths, tests, verification commands, and a copy-paste prompt.
- Explicit stop conditions.

If a session is missing an AC ID or a verification command, do not dispatch it.

---

## Shared constraints (copy into every session)

| Constraint | Source |
|------------|--------|
| Quick-log remains 3 taps, time-primary | D-019 / D-034 |
| `starting_level ≤ 99` server-side | D-018 |
| Gate replaces XP bar when active | D-021 |
| Tier transition = modal | D-022 |
| XP write atomic | R-003 |
| EffectiveLevel in Go | R-004 |
| Claude key never in HTML/cookies/logs/DB plaintext | D-015 |
| User-supplied Claude key | D-003 |
| Three-theme / nutri-saas tokens, no hardcoded colours | D-035 |
| Logic tests required; visual-only via page guide | D-036 |
| Suite apps feed the hub later; no XP writes now | D-037, F-020 |
| `nl_` / `wo_` tables FK to `public.users(id)` ON DELETE CASCADE | architecture |
| RLS owner policy on new tables (match `nl_weight_logs`) | F-013 pattern |
| Auth on every new route; 401 unauthenticated; 404 for other-user IDs | existing API |

---

## Affected zones (program)

| Zone | Paths |
|------|-------|
| Go API | `apps/api/db/migrations/`, `apps/api/internal/handlers/`, `apps/api/internal/nutrilog/`, `apps/api/internal/skills/` (gates), new `internal/workout/` only if D-067 |
| Typed client | `packages/api-client/src/` |
| LifeQuest | `apps/rpg-tracker/app/(app)/skills/` |
| NutriLog | `apps/nutri-log/app/` |
| Shared UI | `packages/ui/src/` (gate wiring, nutri components) |
| Docs | tracker, decision log, page guides for new screens |
| Workout (proposed) | `apps/workout/` (new) |

---

## Sign-off

```
Signed off by: __________________ on __________
D-064..D-066, D-068 accepted: [ ] yes
D-067 workout: [ ] build now  [ ] defer (default)
Q1–Q10 defaults accepted unless noted: __________________
```

Until signed, agents must not implement code from this folder.
