package config

import (
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

// Config holds all environment-driven configuration for the server.
type Config struct {
	Port           string   // SERVER_PORT — the port the server listens on (default: "3000")
	DatabaseURL    string   // DATABASE_URL — PostgreSQL connection string (required)
	RedisURL       string   // REDIS_URL — Redis connection string (required)
	AllowedOrigins []string // ALLOWED_ORIGINS — comma-separated WebSocket origin whitelist
	Environment    string   // APP_ENV — "development" or "production" (default: "development")
}

// Load reads configuration from environment variables.
// It first attempts to load a .env file from the current working directory
// (for local development). In Docker/production, environment variables are
// injected directly so the .env file is optional.
func Load() *Config {
	// Best-effort .env load — silently ignored if file doesn't exist.
	// This allows local `go run ./cmd/server` to pick up backend/.env,
	// while Docker/Render containers rely on injected env vars.
	_ = godotenv.Load()

	cfg := &Config{
		Port:        getEnvOrDefault("SERVER_PORT", "3000"),
		DatabaseURL: requireEnv("DATABASE_URL"),
		RedisURL:    requireEnv("REDIS_URL"),
		Environment: getEnvOrDefault("APP_ENV", "development"),
	}

	// Parse allowed origins from a comma-separated string.
	// Example: "http://localhost:4200,https://syncpad.example.com"
	originsStr := getEnvOrDefault("ALLOWED_ORIGINS", "")
	if originsStr != "" {
		for _, o := range strings.Split(originsStr, ",") {
			trimmed := strings.TrimSpace(o)
			if trimmed != "" {
				cfg.AllowedOrigins = append(cfg.AllowedOrigins, trimmed)
			}
		}
	}

	return cfg
}

// requireEnv reads an environment variable and fatally exits if it is missing.
// This ensures the server never starts in a misconfigured state.
func requireEnv(key string) string {
	val := os.Getenv(key)
	if val == "" {
		log.Fatalf("[config] FATAL: required environment variable %s is not set", key)
	}
	return val
}

// getEnvOrDefault reads an environment variable, returning the fallback if unset.
func getEnvOrDefault(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
