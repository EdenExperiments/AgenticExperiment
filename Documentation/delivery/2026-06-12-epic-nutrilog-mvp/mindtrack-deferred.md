# MindTrack — Deferred (Out of Epic Scope)

**Epic:** `2026-06-12-epic-nutrilog-mvp`  
**App:** `apps/mental-health/` (MindTrack)

## Status

MindTrack is **explicitly out of scope** for the NutriLog MVP epic. No requirements, tasks, or implementation work for MindTrack are included in this delivery folder.

## Current state

- Scaffolded Next.js app with BFF proxy (`app/api/[...path]/route.ts`), `mental-calm` theme tokens in `packages/ui`, and shared auth/api-client dependencies — same maturity as NutriLog pre-MVP.
- LifeQuest hub shows a `HubPlaceholderCard` for MindTrack on the dashboard (metrics stubbed as `—`).
- No `mh_` schema namespace is reserved in `Documentation/architecture.md` yet (unlike NutriLog's `nl_` prefix in §3).

## When to revisit

- After NutriLog MVP (F-013) is stable and signed off.
- Architecture should reserve an `mh_` (or equivalent) schema prefix before MindTrack entity design — follow the NutriLog boundary pattern in architecture §3.
- Cross-app hub integration (F-020) remains deferred until both NutriLog and MindTrack have core loops.

## Reference

- PRD: Experience for MindTrack is vision-only (`Documentation/product-requirements.md`).
- Hub model: D-037 — MindTrack progress will feed unified character progression when built; not in this epic.
