.PHONY: run build generate test db-up db-down db-reset migrate-up

run:
	go run ./cmd/server/...

generate:
	templ generate ./...

build: generate
	go build -o bin/server ./cmd/server/...

test:
	go test ./...

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

# Placeholder — replaced by TASK-105 with golang-migrate invocation
migrate-up:
	@echo "No migrations defined yet (TASK-105)"
