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
