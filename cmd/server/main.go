package main

import (
	"context"
	"log"

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

	authMiddleware, err := auth.NewJWTMiddleware(cfg.SupabaseProjectURL)
	if err != nil {
		log.Fatalf("auth middleware init failed: %v", err)
	}
	srv := server.NewServer(cfg, authMiddleware)

	log.Printf("starting server on port %s", cfg.Port)

	if err := srv.Start(); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
