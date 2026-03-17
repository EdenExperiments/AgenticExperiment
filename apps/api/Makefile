ifneq (,$(wildcard .env))
include .env
export
endif

.PHONY: run build test build-css db-up db-down db-reset migrate-up migrate-down migrate-status

run:
	go run ./cmd/server/...

build:
	go build -o bin/server ./cmd/server/...

test:
	go test ./...

build-css:
	npx tailwindcss -i static/css/input.css -o static/css/app.css --minify

db-up:
	docker compose up -d db

db-down:
	docker compose down

db-reset:
	docker compose down -v
	docker compose up -d db
	@echo "Waiting for database to be ready..."
	@sleep 3
	$(MAKE) migrate-up

migrate-up:
	go run -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@v4.18.2 \
		-database "$(DATABASE_URL)" \
		-path db/migrations \
		up

migrate-down:
	go run -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@v4.18.2 \
		-database "$(DATABASE_URL)" \
		-path db/migrations \
		down 1

migrate-status:
	go run -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@v4.18.2 \
		-database "$(DATABASE_URL)" \
		-path db/migrations \
		version
