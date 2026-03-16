package main

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/config"
	"github.com/meden/rpgtracker/internal/database"
	"github.com/meden/rpgtracker/internal/server"
)

func main() {
	cfg := config.Load()

	// Run database migrations before accepting traffic.
	if err := database.RunMigrations(context.Background(), cfg.DatabaseURL); err != nil {
		log.Fatalf("migrations failed: %v", err)
	}

	// Establish a connection pool for use across all handlers.
	pool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to create database pool: %v", err)
	}
	defer pool.Close()

	sessionMiddleware, err := auth.NewSessionMiddleware(cfg.SupabaseProjectURL)
	if err != nil {
		log.Fatalf("auth middleware init failed: %v", err)
	}

	srv := server.NewServer(cfg, sessionMiddleware, pool)

	log.Printf("starting server on port %s", cfg.Port)

	if err := srv.Start(); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
