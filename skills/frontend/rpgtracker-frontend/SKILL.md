---
name: rpgtracker-frontend
description: Use for Next.js frontend and shared UI work across apps and packages/ui.
---

# RpgTracker Frontend Skill

## Scope

- `apps/rpg-tracker/`
- `apps/nutri-log/`
- `apps/mental-health/`
- `packages/ui/`
- `packages/api-client/` (when frontend-facing contracts change)

## File Focus (read first)

1. `Documentation/page-guides/` (relevant page file first)
2. `Documentation/style-guide/shared.md` + theme guide (`minimal.md`, `retro.md`, or `modern.md`)
3. `apps/rpg-tracker/src/` (or target app `src/`)
4. `packages/ui/src/` (if shared components/tokens are touched)
5. `packages/api-client/src/` (only when frontend API contract surface changes)

## Search Boundaries

- Start in the target app directory only.
- Include `packages/ui/` and `packages/api-client/` only if the task crosses app boundaries.
- Avoid scanning other apps unless the request explicitly says cross-app change.

## Hard Boundary Rule

- Do **not** search the whole repository for frontend tasks by default.
- Expand scope only when one of these is true:
  1. shared component or token change requires `packages/ui/`,
  2. typed contract change requires `packages/api-client/`,
  3. CI/test/build failure points to another app/package,
  4. user explicitly requests multi-app work.

## Workflow

1. Read relevant guides in `Documentation/page-guides/` and `Documentation/style-guide/`.
2. Implement changes with theme-aware tokens, avoiding hardcoded visual values.
3. Add/update behavior tests where component logic or interaction changes.
4. Run targeted package tests and affected app checks before completion.

## Guardrails

- Use design tokens and theme layers consistently.
- Keep BFF/API contract alignment with `packages/api-client`.
- If feature scope or readiness changes, update `Documentation/feature-tracker.md`.
