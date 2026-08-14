# Practices

## Tests are the spec

- Go: `pnpm test:go` or `cd apps/api && go test ./...`
- JS: `pnpm test` (CI / precommit: `pnpm test:ci`)
- Behaviour and API contracts need tests. Pure visual work uses tokens in `packages/ui`; do not faux-TDD CSS.

If you change behaviour, change the test. Do not add a markdown AC table.

## Security

- No secrets in git, logs, or client bundles.
- User isolation on every query (`user_id` from JWT). Other people’s IDs → 404, not 403 with leakage.
- XP writes: `xp_events` + `skills.current_xp` + `skills.current_level` in one transaction.
- Effective level is computed in Go, not trusted from the client.
- Quick log stays time-primary (minutes → XP). Keep it few taps.

## UI

LifeQuest skins: `data-theme` Minimal / Retro / Modern; optional `data-mode` clean/stylish. Product identity is a nested-layout `data-theme` (`nutri-saas`, `mental-calm`) and must not overwrite `rpgt-theme`. Colours from CSS variables, never `bg-gray-800`.

## Agents

1. Read `docs/README.md` + the one file under `docs/apps/` you are touching.
2. Put long plans in `docs/briefs/<slug>.md`. They are gitignored.
3. Before you delete a brief (or merge the PR), copy any *lasting* rule into `docs/` (usually two sentences).
4. `/poteto-mode` for implementation. Nested `AGENTS.md` for stack commands.

New suite products on web are a route group with nested chrome plus a Go package and table prefix, not a new Next origin and not a LifeQuest tab. Apple is separate apps later. See `docs/architecture.md`.

## Health copy

Training and nutrition AI is a draft. Mental health is not therapy. Crisis → human resources, not a longer chat.
