# RpgTracker

A Go-based RPG tracker application.

## Local development setup

Requirements: Docker, Go 1.23+

```bash
cp .env.example .env
# Edit .env and fill in SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY, and MASTER_KEY
make db-up
make run
```

## Deployment

See [docs/setup.md](docs/setup.md) for required one-time manual setup steps,
including the Supabase Auth trigger that must be created via the Supabase dashboard.
