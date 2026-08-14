# Monorepo (Nx + pnpm)

pnpm installs and links packages. Nx runs and caches tasks.

```bash
pnpm install
pnpm build              # JS/Next builds; excludes Go
pnpm test:ci            # JS tests, one-at-a-time (CI / precommit)
pnpm test:go            # Go unit tests (skips DB integration)
pnpm dev                # today's Next apps on 3000/3002/3003/3004
nx test rpg-tracker     # one JS project
nx test api             # same as pnpm test:go
```

JS projects come from each package’s `package.json` scripts. The Go API is `apps/api/project.json`. Root `pnpm test` / `pnpm build` **exclude** `api` so the JS CI job does not need a Go toolchain. The dedicated CI Go job still runs `go test ./...` in `apps/api`.

Next.js `turbopack` in `next.config.ts` is the bundler. It is not a monorepo runner.

## Project names

Nx uses the `name` field from `package.json` (or `project.json` for Go):

| Path | Nx name | Tag |
|------|---------|-----|
| `apps/rpg-tracker` | `rpg-tracker` | `type:app` |
| `apps/nutri-log` | `nutri-log` | `type:app` |
| `apps/mental-health` | `mental-health` | `type:app` |
| `apps/landing` | `@rpgtracker/landing` | `type:app` |
| `apps/api` | `api` | `type:go` |
| `packages/ui` | `@rpgtracker/ui` | `type:lib` |
| `packages/auth` | `@rpgtracker/auth` | `type:lib` |
| `packages/api-client` | `@rpgtracker/api-client` | `type:lib` |
| `packages/tsconfig` | `@rpgtracker/tsconfig` | `type:lib` |
| `packages/cursor-agents` | `@rpgtracker/cursor-agents` | `type:tool` |

`nx graph` is the JS dependency map. Go imports stay inside `apps/api`.

## Add a suite product

Do not copy `apps/nutri-log` into a new Next origin. Four Next processes is leftover. Target is one authenticated web app. See `docs/architecture.md`.

1. Add a route group in `apps/rpg-tracker` when the product has a first slice.
2. Add a product theme in `packages/ui/tokens/` and `PRODUCT_THEMES` if needed.
3. Add `docs/apps/<name>.md` with rough logic (one page).
4. Reserve a table prefix in `docs/architecture.md` (`nl_`, `wo_`, `mh_`).
5. Wire routes in `apps/api`. No LifeQuest table FKs.

Apple apps are separate binaries later. Native stack is TBC. They call Go with a Bearer JWT. Do not add a Next app as a placeholder for that.
