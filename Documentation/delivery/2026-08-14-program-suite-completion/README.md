# Suite Completion Program — Agent Dispatch Index

**Program ID:** `2026-08-14-program-suite-completion`  
**Status:** Awaiting human sign-off on `requirements.md`  
**Audience:** Cloud / IDE agents running a few-hour session against one workstream slice  
**Related decisions:** D-064 through D-068 (proposed in this folder; recorded in `Documentation/decision-log.md`)

This folder is the dispatch pack for the next product wave: close LifeQuest’s core loop, build NutriLog past weight-only, add pantry-first AI recipes (food waste), and optionally stand up a workout app.

Do not start implementation until `requirements.md` is signed. After sign-off, pick **one session** from a workstream file, paste the session prompt, and stop when that session’s verification command is green.

---

## Read order

1. This file (how to dispatch).
2. `requirements.md` (scope, sequencing, open questions, defaults).
3. Exactly one workstream file for the session you are running:

| File | Workstream | First session | Depends on |
|------|------------|---------------|------------|
| `01-lifequest-sufficient.md` | Close the skill-tracker core loop | LQ-01 | Nothing |
| `02-nutrilog-nutrition.md` | Nutrition diary + goals | NL-01 | LifeQuest not required; F-013 already shipped |
| `03-recipes-food-waste.md` | Pantry + AI recipes from on-hand ingredients | RP-01 | NL-03/NL-04 (food diary) |
| `04-workout-proposed.md` | Workout app (optional fourth suite app) | WO-01 | Human confirmation of D-067; NutriLog food diary preferred first |

4. Zone `AGENTS.md` for the stack you will touch (`apps/api/`, `apps/rpg-tracker/`, `packages/`).
5. Binding constraints in `Documentation/decision-log.md` and `Documentation/feature-tracker.md` Key Constraints.

---

## Dispatch rules for a few-hour agent

1. **One session, one PR.** Do not chain LQ-01 into LQ-02 in the same run unless the session card explicitly says “vertical slice allowed”.
2. **Do not invent product.** Open questions use the **Default if unanswered** column in `requirements.md`. Do not reopen D-014, D-015, D-019/D-034, D-035, D-037, or D-003.
3. **Logic before pixels.** API + tests first; typed client second; UI last. Visual work needs a page guide (`Documentation/page-guides/`) before implementation (D-036).
4. **No hub XP.** F-020 stays deferred. NutriLog, recipes, and workout store their own data only.
5. **No secrets in logs.** Claude keys stay server-side (D-015). Recipe and coaching prompts must not log user food text into CI artifacts.
6. **Tracker + decisions.** Status change → `feature-tracker.md`. New binding choice → `decision-log.md`. Do not dump per-task requirements into `product-requirements.md` (D-059).
7. **Stop.** When the session AC table is green, update the tracker row, commit, and end. Remaining sessions are someone else’s run.

### Session size

Each `LQ-*` / `NL-*` / `RP-*` / `WO-*` card is sized for a single cloud-agent run: roughly one stack layer (Go **or** TS) plus tests. Combined “vertical slice” prompts exist at the bottom of each workstream for a longer run that covers API → client → UI; use those only when the operator explicitly asks for a combined run.

### Parallelism

```text
LQ-01..LQ-05     independent of NutriLog / recipes / workout
NL-01, NL-02     independent of LifeQuest; independent of RP-* until food IDs exist
NL-03, NL-04     blocks RP-01
NL-05, NL-06     after NL-04; parallel with RP-01 if they do not share files
RP-*             after NL-04
WO-*             only after D-067 sign-off; do not parallel with NL-03 on `server.go` without coordinating routes
```

Safe concurrent pairs: LifeQuest UI sessions with NutriLog Go sessions, as long as `packages/api-client/src/client.ts` is not edited in both.

---

## Current codebase (do not re-discover)

| Surface | Reality |
|---------|---------|
| LifeQuest skills | CRUD, quick log, XP, gates **visible**, session timer, goals, AI goal planner shipped |
| Blocker completion (F-009b) | UI components exist (`GateSubmissionForm`, `GateVerdictCard`) but skill detail does **not** wire `onSubmitForAssessment`. Go `dbGateStore.GetGate` / `GetActiveCooldown` are stubs. Client `submitGate` sends JSON; handler reads `ParseForm`. |
| Detailed logs (F-007) | `log_note` column and optional note field exist on quick log. There is no natural-language parse path. |
| NutriLog | Weight create/list/chart/delete shipped (`nl_weight_logs`, `apps/nutri-log` dashboard). Hub `/nutri` is still “Coming Soon”. |
| Recipes / pantry / workout | Not built. Architecture previously reserved `nl_*` names only. |

---

## Sign-off

Implementation starts after the signature block in `requirements.md` is filled. Until then, this folder is planning only.
