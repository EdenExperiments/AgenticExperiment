# Agent And Repo Directory

Entry-point routing also lives in `.cursor/rules/repo-routing.mdc`.

## Start here

- Run the repo: `README.md`
- Product and platform: `docs/README.md`
- CI / Bugbot / SDK jobs: `docs/CURSOR-AGENT-HANDBOOK.md`

## Zones

| Zone | Paths |
|------|-------|
| Go API | `apps/api/` |
| LifeQuest (web shell; other products fold in here) | `apps/rpg-tracker/` |
| NutriLog (today's origin; target is a route group) | `apps/nutri-log/` |
| MindTrack (scaffold origin) | `apps/mental-health/` |
| Shared UI / auth / API client | `packages/ui`, `packages/auth`, `packages/api-client` |
| Agent CI scripts | `packages/cursor-agents/` |

## Docs

`docs/` is the only durable product/platform writing. Tests are the spec. Ephemeral plans go in `docs/briefs/` and are deleted after promote. See `docs/practices.md`.

## Agent config

1. Base — this file, `.cursor/rules/`, `.cursor/hooks.json`
2. Stack — nested `AGENTS.md` (`apps/api/`, `apps/rpg-tracker/`, `packages/`)
3. Role — pstack (`/poteto-mode`) and cursor-team-kit

LifeQuest browser checks: `.cursor/skills/verify-lifequest/`.
