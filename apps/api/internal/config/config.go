package config

import (
	"fmt"
	"os"
)

// Config holds all application configuration loaded from environment variables.
type Config struct {
	DatabaseURL              string
	SupabaseProjectURL       string
	// Publishable (formerly anon) key - safe for server use with Supabase REST
	SupabasePublishableKey   string
	// Secret (replaces legacy service_role) - backend-only; used for Storage writes
	SupabaseSecretKey        string
	MasterKey                string
	Port                     string
}

// Load reads configuration from environment variables.
// It panics if any required variable is missing.
func Load() *Config {
	cfg := &Config{
		DatabaseURL:            requireEnv("DATABASE_URL"),
		SupabaseProjectURL:     requireEnv("SUPABASE_PROJECT_URL"),
		// Backwards compatibility: allow SUPABASE_ANON_KEY if PUBLISHABLE not set
		SupabasePublishableKey: optionalEnv("SUPABASE_PUBLISHABLE_KEY", optionalEnv("SUPABASE_ANON_KEY", "")),
		// Backwards compatibility: allow SUPABASE_SERVICE_ROLE_KEY if SECRET not set
		SupabaseSecretKey:      optionalEnv("SUPABASE_SECRET_KEY", optionalEnv("SUPABASE_SERVICE_ROLE_KEY", "")),
		MasterKey:              requireEnv("MASTER_KEY"),
		Port:                   optionalEnv("PORT", "8080"),
	}
	if cfg.SupabasePublishableKey == "" {
		panic("required environment variable \"SUPABASE_PUBLISHABLE_KEY\" (or legacy \"SUPABASE_ANON_KEY\") is not set")
	}
	if len(cfg.MasterKey) != 32 {
		panic("MASTER_KEY must be exactly 32 bytes for AES-256-GCM (provide the raw 32-byte key, not a base64/hex encoding)")
	}
	return cfg
}

// requireEnv returns the value of an environment variable or panics if it is not set.
func requireEnv(key string) string {
	val := os.Getenv(key)
	if val == "" {
		panic(fmt.Sprintf("required environment variable %q is not set", key))
	}
	return val
}

// optionalEnv returns the value of an environment variable or the provided default.
func optionalEnv(key, defaultVal string) string {
	val := os.Getenv(key)
	if val == "" {
		return defaultVal
	}
	return val
}
