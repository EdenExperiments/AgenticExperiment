package main

import (
	"log"

	"github.com/meden/rpgtracker/internal/config"
	"github.com/meden/rpgtracker/internal/server"
)

func main() {
	cfg := config.Load()

	srv := server.NewServer(cfg)

	log.Printf("starting server on port %s", cfg.Port)

	if err := srv.Start(); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
