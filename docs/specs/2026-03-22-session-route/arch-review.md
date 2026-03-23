# Architecture Review: Session Route

**Date:** 2026-03-22
**Spec:** docs/specs/2026-03-22-session-route/spec.md

---

## Schema Impact

**Migration 000008_session_pomodoro:**
- Adds 4 columns to `training_sessions`: `pomodoro_work_sec`, `pomodoro_break_sec`, `pomodoro_intervals_completed`, `pomodoro_intervals_planned`
- All columns have NOT NULL defaults -- backward compatible, no data migration needed
- No new tables required
- No index changes needed (existing indexes on `skill_id, created_at DESC` remain sufficient)

No issues. The existing `training_sessions` table structure is well-suited for extension.

---

## Service Boundaries

**API surface changes:**
- `POST /api/v1/skills/:id/sessions` -- extended to accept 4 new optional form fields
- `GET /api/v1/skills/:id/sessions` -- response includes 4 new fields in each session object
- Both changes are backward compatible (new fields have defaults, old clients ignore unknown response fields)

**No new endpoints required.** The session create and list endpoints already exist.

**Service layer changes:**
- `skills.CreateSessionRequest` struct gains 4 new fields
- `skills.TrainingSession` struct gains 4 new fields
- `handlers.HandlePostSession` parses 4 new form values
- `dbSessionStore.CreateSession` includes new columns in INSERT
- `dbSessionStore.ListSessions` includes new columns in SELECT/Scan

All changes are additive and contained within the existing session handler/store pattern.

---

## ADR

None required. D-040 (session history schema) is resolved by the spec's decision to extend the existing table rather than creating a new one. This is the correct approach -- the Pomodoro metadata is intrinsic to the session record, not a separate entity.

---

## Shared Package Changes

### packages/api-client/src/types.ts
- `TrainingSession` interface: add `pomodoro_work_sec`, `pomodoro_break_sec`, `pomodoro_intervals_completed`, `pomodoro_intervals_planned` fields

### packages/api-client/src/client.ts
- `createSession()`: add optional Pomodoro fields to the request body type and form encoding

### packages/ui/src/
- New components: `SessionPage`, `SessionConfig`, `SessionTimer`, `SessionTimerMinimal`, `SessionTimerRetro`, `SessionTimerModern`, `SessionSummary`
- New hooks: `usePomodoro`, `useBrowserNotification`, `useSessionNavigation`
- Existing: `GrindOverlay` kept for backward compat (no breaking change)
- Existing: `PostSessionScreen` kept for backward compat
- `index.ts` barrel export: add new component/hook exports

---

## Parallelisation Map

### Tasks that CAN run in parallel:
- **T2 (backend)** and **T3 (frontend shared components)** can run in parallel AFTER shared package types are updated
- Browser notification hook (`useBrowserNotification`) is independent of all other work
- Per-theme timer variants (Minimal, Retro, Modern) can be built in parallel with each other

### Tasks that MUST be sequenced (and why):
1. **Migration + API types first** -- `packages/api-client/src/types.ts` must be updated before T2 (backend) and T3 (frontend) can use the new Pomodoro fields
2. **Migration before handler changes** -- migration 000008 must exist before the Go handler can INSERT the new columns
3. **usePomodoro hook before SessionTimer** -- the timer component depends on the state machine hook
4. **SessionTimer before per-theme variants** -- base timer logic must be stable before variants diverge
5. **All components before route page** -- `SessionPage` orchestrates all sub-components

### Recommended task order:
```
T1: Tests (logic ACs)
    |
    v
T2a: Migration + Go types + handler update (backend)
T2b: API client types + createSession update (shared)
    |
    v (T2a and T2b can run in parallel)
    |
T3a: usePomodoro + useBrowserNotification + useSessionNavigation (hooks)
T3b: SessionConfig + SessionSummary (non-timer components)
    |
    v (T3a and T3b can run in parallel)
    |
T3c: SessionTimer (base) + per-theme variants
    |
    v
T3d: SessionPage (orchestrator) + route/layout
    |
    v
T3e: Barrel exports + GrindOverlay deprecation
    |
    v
T4: Review (code gate for logic, visual review for UI)
```

---

## Approval

APPROVED

No changes needed to the spec. Schema extension is clean, API surface changes are backward compatible, shared package changes are well-scoped, and the parallelisation map is achievable.
