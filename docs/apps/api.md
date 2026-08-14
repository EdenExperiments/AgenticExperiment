# API

Shared Go service (`chi`, `pgx`). All suite apps call it through their Next.js BFF.

## Rough layout

`internal/handlers` HTTP · `internal/skills` LifeQuest persistence · `internal/nutrilog` · `internal/goals` · `internal/auth` JWKS · `internal/crypto` envelope encryption · `db/migrations` numbered SQL.

New domains get a package (`internal/workout`) and `/api/v1/<area>/...` routes. Auth middleware on all of those.

## Run / test

```bash
cd apps/api && make run    # migrations on boot
nx test api
```

See `apps/api/README.md` for env and local postgres. Do not duplicate that here.
