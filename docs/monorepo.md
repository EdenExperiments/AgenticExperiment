# Monorepo (Nx + pnpm)

pnpm installs and links. **Nx** runs and caches tasks. Do not add Turborepo back.

```bash
pnpm install
nx run-many -t build
nx run-many -t test --parallel=1   # CI / precommit
nx run-many -t dev                 # persistent Next apps
nx test api                        # Go
nx test rpg-tracker
```

Root `package.json` scripts wrap the same Nx commands so existing `pnpm test` / `pnpm build` keep working.

JS projects are inferred from each package’s `package.json` scripts. The Go API is `apps/api/project.json` (`nx:run-commands`). Root `pnpm test` / `pnpm build` **exclude** `api` so the JS CI job does not need a Go toolchain; `pnpm test:go` or the dedicated CI Go job runs `go test`.

## Add a suite app

1. Copy `apps/nutri-log` (auth, BFF, vitest, theme token).
2. Add a product theme in `packages/ui/tokens/` and `PRODUCT_THEMES` if needed.
3. Add `docs/apps/<name>.md` with rough logic (one page).
4. Reserve a table prefix in `docs/architecture.md` (`nl_`, `wo_`, `mh_`).
5. Wire routes in `apps/api`. No LifeQuest table FKs.

`nx graph` is the map of JS dependencies. Go imports stay inside `apps/api`.
