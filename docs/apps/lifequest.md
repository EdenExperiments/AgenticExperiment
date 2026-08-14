# LifeQuest

Hub on the web. Other products get nested layouts with their own chrome. LifeQuest sidebar and tabs stay LifeQuest (dashboard, skills, goals, account). Apple LifeQuest is a separate binary later. See `docs/architecture.md`.

Practise real skills (sport, art, career). Optional XP/levels as a **private** gimmick. Shareable claims need evidence.

## Rough loop

Create skill → optional AI calibration → log time (quick) or words → XP/level → **gate at tier boundaries** → evidence to clear → coach from recent logs. Pomodoro lives on the skill session route.

## Truth in code

- XP curve: `apps/api/internal/xpcurve`
- Atomic log: `apps/api/internal/skills` + handler tests
- Gates: `apps/api/internal/handlers/gate.go`. Submit is JSON (`POST /blocker-gates/{id}/submit`), matching `submitGate` in the api-client. Store `GetGate` / cooldown were stubs; wire or hide, never leave a dead button.
- Quick log: `packages/ui` QuickLog* — time chips, not XP chips.

## Constraints

Starting level ≤ 99. Active gate replaces the XP bar. Tier change is a modal. Do not award hub XP from other apps here yet.
