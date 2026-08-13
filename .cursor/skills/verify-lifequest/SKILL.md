---
name: verify-lifequest
description: Drive LifeQuest (apps/rpg-tracker) in a real browser to prove user-facing behavior. Use when verifying LifeQuest UX, reproducing UI bugs with screenshots/ARIA evidence, or proving a mapped feature before/after a change.
---

# Verify LifeQuest

LifeQuest is the primary user surface in this monorepo: a Next.js web app at `apps/rpg-tracker` (product name **LifeQuest**, UI brand on login still says **RPG Tracker**). Secondary surfaces (NutriLog, MindTrack, landing, Go API) are out of scope unless a feature file says otherwise.

Drive through the installed Playwright dependency under `apps/rpg-tracker` (or the Cursor browser MCP). Prefer the helpers in this skill over ad-hoc clicks.

## When to use

- Proving a LifeQuest user path with screenshots and ARIA evidence
- Reproducing a UI bug against a real local instance
- Checking a feature map entry after a frontend change

Do not use for unit/Vitest-only claims, Go API contract tests without UI, or NutriLog/MindTrack (scaffolded).

## Inputs

- A local LifeQuest instance (this skill’s Launch, or an instance you started for verification)
- Feature ID from `features/` (start with the map README)
- Optional `VERIFY_EMAIL` / `VERIFY_PASSWORD` for authenticated recipes
- Optional overrides: `LIFEQUEST_URL` (default `http://localhost:3000`), `LIFEQUEST_API_URL` (default `http://localhost:8080`)

## Outputs

- Proof artifacts under `.cursor/skills/verify-lifequest/artifacts/<feature-id>/`
- Doctor stdout (healthy / unhealthy with reason)
- Cleanup that stops processes this run started; artifacts remain

## Launch

Full stack (required for authenticated dashboard/skills/goals/account):

```powershell
# From repo root — disposable verification run preferred
docker compose up -d db
cd apps/api; make run
# Separate terminal:
pnpm --filter rpg-tracker dev
```

Auth-only (login/register/redirect — no Docker/API required):

```powershell
pnpm --filter rpg-tracker dev
```

Or use the helper (records PIDs for cleanup):

```powershell
node .cursor/skills/verify-lifequest/scripts/launch.mjs --frontend-only
# full stack:
node .cursor/skills/verify-lifequest/scripts/launch.mjs
```

Ready when:

- `http://localhost:3000/login` returns HTTP 200 and shows heading `RPG Tracker` plus a `Sign in` button
- Full stack: `http://localhost:8080/health` returns HTTP 200

Teardown: run Cleanup (never `docker compose down -v` — that deletes local app data).

## Doctor

Read-only health check. Run first whenever anything looks off:

```powershell
node .cursor/skills/verify-lifequest/scripts/doctor.mjs
# require API too:
node .cursor/skills/verify-lifequest/scripts/doctor.mjs --full
```

Healthy means: LifeQuest URL responds, `/login` contains Email + Sign in, and (with `--full`) API `/health` is 200. Doctor never starts or stops processes.

## Drive

1. Read `features/README.md`, then the feature file for the path under test.
2. Run Doctor; abort if unhealthy.
3. Prefer Playwright helpers / role+name selectors from the feature file. Do not use coordinates.
4. Drive the real user path (routes, forms, nav). Do not call internal setters or test-only endpoints as proof.
5. For authenticated features, sign in with `VERIFY_EMAIL` / `VERIFY_PASSWORD` (env). Never commit credentials.
6. Capture Evidence for the action and resulting state.

```powershell
node .cursor/skills/verify-lifequest/scripts/drive.mjs auth-login
```

Stable handles (from this repo):

| Surface | Handle |
|---|---|
| Login heading | role `heading` name `/RPG Tracker/i` |
| Email | label `/email/i` |
| Password | label `/password/i` |
| Sign in (password) | role `button` name `Sign in` exact — not `/sign in/i` (matches Google/GitHub/Apple) |
| Create account link | role `link` name `/create account/i` |
| Auth error | role `alert` |
| Dashboard | role `heading` name `/Dashboard/i` or empty CTA `/Create your first skill/i` |
| Skills | role `heading` name `/Skills/i`; link `/Add Skill/i` |
| Goals | role `heading` name `/Goals/i`; link `/New Goal/i` |
| Account | `data-testid=settings-grid`; button `/Sign Out/i` |
| Desktop nav | LifeQuest sidebar links `Dashboard`, `Skills`, `Account` |
| Mobile nav | `aria-label="Main navigation"` |

Isolation: default ports are fixed (`3000`, `8080`). Prefer `http://localhost:3000` (not `127.0.0.1`) — Next.js 16 blocks cross-origin `/_next` access from `127.0.0.1` when the dev server’s Local URL is `localhost`, which breaks client hydration. Do not drive a shared instance you did not start for this verification run — refuse and ask to stop the user’s session or use Launch. Concurrent side-by-side instances are not supported without manual `PORT` / API port overrides; prefer one verification instance.

## Evidence

Location: `.cursor/skills/verify-lifequest/artifacts/<feature-id>/`

Proof standards:

- Exercise the real user path (browser navigation and controls users see)
- Capture the action and the resulting state (before/after or redirect + outcome), not only the final screen
- UI proof: screenshot (app identity visible — “RPG Tracker” / “LifeQuest”) plus an ARIA/accessibility snapshot text file
- Mutation proof (authenticated): confirm via a second user-facing view (list/detail), not only a toast
- Side effects: for API-backed mutations, a successful list/detail reload is the observable side effect; do not treat Vitest mocks as proof
- Record feature ID and entry point in the artifact folder (see `meta.json` written by `drive.mjs`)

## Cleanup

```powershell
node .cursor/skills/verify-lifequest/scripts/cleanup.mjs
```

Kills only PIDs recorded in `.cursor/skills/verify-lifequest/.run/state.json` by `launch.mjs`. Stops a DB container only if this run started it (`docker compose stop db` — never `down -v`). Does not delete `artifacts/`.

If you launched processes manually, stop those same terminals/processes yourself; do not kill by process name (`node`, `next-server`, etc.).

## Helpers

All helpers are Node ESM scripts; invoke with `node` from the repo root.

| Script | Purpose |
|---|---|
| `scripts/launch.mjs` | Start frontend (and optionally db+API); write `.run/state.json` |
| `scripts/doctor.mjs` | Read-only readiness check |
| `scripts/drive.mjs <feature-id>` | Drive one mapped feature and write artifacts |
| `scripts/cleanup.mjs` | Tear down what launch recorded; keep artifacts |

## Examples

### Positive

- “Prove login still redirects unauthenticated users and renders the sign-in form” → Launch frontend → Doctor → `drive.mjs auth-login` → Cleanup → confirm artifacts remain
- “After a dashboard change, prove the authenticated empty state” → full Launch → Doctor `--full` → sign in with verify creds → drive `dashboard` → Evidence → Cleanup

### Negative

- Claiming LifeQuest works from Vitest snapshots alone
- Driving the user’s everyday `localhost:3000` session without Launch ownership
- Using `docker compose down -v` as cleanup
