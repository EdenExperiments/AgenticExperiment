#!/usr/bin/env bash
# Per-boot bring-up of the local PostgreSQL that apps/api uses for application data.
# Idempotent: safe to run on every environment start. Reaching a ready database on
# localhost:5432 (db=rpgtracker) is the success condition.
#
# NOTE: The Go API server and the Next.js apps additionally require Supabase
# credentials to serve authenticated traffic (SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY
# and the NEXT_PUBLIC_* equivalents). Those are runtime secrets, not provisioned here.
set -uo pipefail

log() { echo "[start] $*"; }

# Run privileged / postgres-user commands correctly whether we are root or not.
if [ "$(id -u)" -eq 0 ]; then
  ADMIN=()               # already root
  AS_PG=(runuser -u postgres --)
else
  ADMIN=(sudo)
  AS_PG=(sudo -u postgres)
fi

PG_VER="$(ls /etc/postgresql 2>/dev/null | sort -n | tail -1)"
PG_VER="${PG_VER:-16}"
CLUSTER="main"

# Ensure the cluster exists (the postgresql package normally creates 'main' on install).
if ! "${ADMIN[@]}" pg_lsclusters -h 2>/dev/null | awk '{print $1"/"$2}' | grep -qx "${PG_VER}/${CLUSTER}"; then
  log "creating postgres cluster ${PG_VER}/${CLUSTER}"
  "${ADMIN[@]}" pg_createcluster "${PG_VER}" "${CLUSTER}" >/dev/null 2>&1 || true
fi

# Start the cluster if it is not already online.
if ! "${ADMIN[@]}" pg_lsclusters -h 2>/dev/null | grep -qE "^${PG_VER}[[:space:]]+${CLUSTER}[[:space:]].*online"; then
  log "starting postgres ${PG_VER}/${CLUSTER}"
  "${ADMIN[@]}" pg_ctlcluster "${PG_VER}" "${CLUSTER}" start 2>&1 \
    || "${ADMIN[@]}" pg_ctlcluster "${PG_VER}" "${CLUSTER}" restart 2>&1 || true
fi

# Wait for readiness.
for _ in $(seq 1 30); do
  if "${AS_PG[@]}" pg_isready -q 2>/dev/null; then break; fi
  sleep 1
done

# Create the application role and database (idempotent).
if ! "${AS_PG[@]}" psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='rpgtracker'" 2>/dev/null | grep -q 1; then
  log "creating role rpgtracker"
  "${AS_PG[@]}" psql -c "CREATE ROLE rpgtracker LOGIN PASSWORD 'rpgtracker';" >/dev/null
fi
if ! "${AS_PG[@]}" psql -tAc "SELECT 1 FROM pg_database WHERE datname='rpgtracker'" 2>/dev/null | grep -q 1; then
  log "creating database rpgtracker"
  "${AS_PG[@]}" psql -c "CREATE DATABASE rpgtracker OWNER rpgtracker;" >/dev/null
fi

# Provide apps/api/.env (DATABASE_URL + MASTER_KEY) if it does not exist yet, so
# `cd apps/api && make run` works once Supabase values are filled in.
if [ ! -f apps/api/.env ] && [ -f apps/api/.env.example ]; then
  cp apps/api/.env.example apps/api/.env
  log "created apps/api/.env from .env.example (set SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY to run the API)"
fi

# Apply database migrations (best-effort; the API also runs them on startup).
export DATABASE_URL="postgres://rpgtracker:rpgtracker@localhost:5432/rpgtracker?sslmode=disable"
if command -v go >/dev/null 2>&1 && [ -d apps/api/db/migrations ]; then
  log "applying database migrations"
  ( cd apps/api && go run -tags 'postgres' \
      github.com/golang-migrate/migrate/v4/cmd/migrate@v4.18.2 \
      -database "$DATABASE_URL" -path db/migrations up ) \
    || log "migrations skipped/failed (non-fatal; API applies them on startup)"
fi

log "PostgreSQL ready on localhost:5432 (db=rpgtracker)"
