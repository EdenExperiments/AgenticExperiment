# LifeQuest

LifeQuest is the hub product. Unprefixed tables, first web slice `/skills` and `/goals`, hub `/dashboard`, LifeQuest chrome, Apple binary later. Wire gate clear or hide it. Do not award hub XP from other products yet. Strength Training is not Workout. Calorie Track is not NutriLog.

LifeQuest chrome stays dashboard, skills, goals, and account. Pass nav items as props. Do not put other products in the tab bar. Today `Sidebar` and `BottomTabBar` omit Goals and hardcode a NutriLog Soon row. See `docs/architecture.md`.

Practise real skills (sport, art, career). Optional XP/levels as a **private** gimmick. Shareable claims need evidence.

## Sleep

Sleep is a LifeQuest preset until it passes the promotion test, with no `sl_*` prefix, no Go package, no web route group, and no Apple binary. Do not create `sl_*` or a shared-signal package with no owner.

## Meditation

Meditation is a LifeQuest preset under LifeQuest chrome, with no prefix and no Apple binary of its own. If it grows it becomes `/mind/meditate` on `mh_*`, not `apps/meditation`.

## Five focus vibes

Five focus vibes are LifeQuest session config, not a product, and they are not built. They would live on the skill session route (`apps/rpg-tracker/app/(app)/skills/[id]/session/page.tsx`), which is simple or pomodoro today, not a prefix.

## Rough loop

Create skill → optional AI calibration → log time (quick) or words → XP/level → **gate at tier boundaries** → evidence to clear → coach from recent logs. Pomodoro lives on the skill session route.

## Truth in code

- XP curve: `apps/api/internal/xpcurve`
- Atomic log: `apps/api/internal/skills` + handler tests
- Gates: `apps/api/internal/handlers/gate.go`. `dbGateStore.GetGate` and `ClearGate` return nil. Handler `ParseForm`. Client `submitGate` uses `JSON.stringify`. Skill detail renders `BlockerGateSection` with no `onSubmitForAssessment`, so the submit button is a no-op. `GateSubmissionForm` is unused under `apps/rpg-tracker`. Wire the clear path or hide it.
- Presets in `000004_seed_skill_presets.up.sql` include Strength Training, Meditation, Sleep Hygiene, Calorie Track, Intermittent Fast, and Therapy. These are presets, not products. Therapy with XP is not MindTrack.
- `training_sessions` is LifeQuest pomodoro and manual sessions (`internal/handlers/session.go`).
- Quick log: `packages/ui` QuickLog* uses time chips, not XP chips.

## Constraints

Starting level ≤ 99. Active gate replaces the XP bar. Tier change is a modal. Do not award hub XP from other apps here yet.
