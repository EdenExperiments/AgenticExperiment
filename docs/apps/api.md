# API

Shared Go service (`chi`, `pgx`). Web reaches it through the LifeQuest BFF. Native Apple clients (planned) call it with a Bearer JWT. See `docs/architecture.md`.

## Rough layout

`internal/handlers` is today's LifeQuest HTTP dump. Leave it until a file is touched. New domains are `internal/<name>/` with persistence and HTTP together, mounted at `/api/v1/<name>`. NutriLog persistence is already `internal/nutrilog`. Move its HTTP there when that file is next edited.

Auth is Supabase JWTs via `internal/auth` (`NewJWTMiddleware`). App data is local Postgres. Do not add a second session cookie path.

## Run / test

```bash
cd apps/api && make run    # migrations on boot
pnpm test:go               # or: nx test api
```

See `apps/api/README.md` for env and local postgres. Do not duplicate that here.
