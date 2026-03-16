package config

import (
	"fmt"
	"os"
)

// Config holds all application configuration loaded from environment variables.
type Config struct {
	DatabaseURL        string
	SupabaseProjectURL string
	SupabaseAnonKey    string
	MasterKey          string
	Port               string
}

// Load reads configuration from environment variables.
// It panics if any required variable is missing.
func Load() *Config {
	cfg := &Config{
		DatabaseURL:        requireEnv("DATABASE_URL"),
		SupabaseProjectURL: requireEnv("SUPABASE_PROJECT_URL"),
		SupabaseAnonKey:    requireEnv("SUPABASE_ANON_KEY"),
		MasterKey:          requireEnv("MASTER_KEY"),
		Port:               optionalEnv("PORT", "8080"),
	}
	if len(cfg.MasterKey) < 32 {
		panic("MASTER_KEY must be at least 32 bytes for AES-256-GCM")
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
