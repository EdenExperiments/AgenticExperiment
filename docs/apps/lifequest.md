# LifeQuest

Hub app. Practise real skills (sport, art, career). Optional XP/levels as a **private** gimmick. Shareable claims need evidence.

## Rough loop

Create skill → optional AI calibration → log time (quick) or words → XP/level → **gate at tier boundaries** → evidence to clear → coach from recent logs. Pomodoro lives on the skill session route.

## Truth in code

- XP curve: `apps/api/internal/xpcurve`
- Atomic log: `apps/api/internal/skills` + handler tests
- Gates: `apps/api/internal/handlers/gate.go` — store `GetGate` / cooldown are still stubs; `GateSubmissionForm` exists in `packages/ui` but skill detail does not wire submit. Client `submitGate` JSON vs handler form-urlencoded is mismatched.
- Quick log: `packages/ui` QuickLog* — time chips, not XP chips.

## Constraints

Starting level ≤ 99. Active gate replaces the XP bar. Tier change is a modal. Do not award hub XP from other apps here yet.
