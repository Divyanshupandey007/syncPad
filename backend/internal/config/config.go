package config

import (
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port           string
	DatabaseURL    string
	RedisURL       string
	AllowedOrigins []string
	Environment    string
}

func Load() *Config {
	_ = godotenv.Load() // best-effort .env for local dev

	cfg := &Config{
		Port:        getEnvOrDefault("SERVER_PORT", "3000"),
		DatabaseURL: requireEnv("DATABASE_URL"),
		RedisURL:    requireEnv("REDIS_URL"),
		Environment: getEnvOrDefault("APP_ENV", "development"),
	}

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

func requireEnv(key string) string {
	val := os.Getenv(key)
	if val == "" {
		log.Fatalf("[config] required env var %s is not set", key)
	}
	return val
}

func getEnvOrDefault(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
