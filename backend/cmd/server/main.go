package main

import (
	"log"
	"net/http"
	"syncPad/internal/api"
	"syncPad/internal/config"
	"syncPad/internal/redisclient"
	"syncPad/internal/storage"
	"syncPad/internal/syncer"

	"github.com/go-chi/chi/v5"
)

func main() {
	// ── Load configuration ──────────────────────────────────────────
	cfg := config.Load()

	// ── Database ────────────────────────────────────────────────────
	pool := storage.Connect(cfg.DatabaseURL)
	storage.CreateTable(pool)
	api.Pool = pool

	// ── Redis ───────────────────────────────────────────────────────
	rdb := redisclient.Connect(cfg.RedisURL)
	api.RedisClient = rdb

	// ── WebSocket origin policy ─────────────────────────────────────
	api.InitOriginChecker(cfg.AllowedOrigins, cfg.Environment)

	// ── Background syncer (flushes dirty docs to PostgreSQL) ────────
	syncer.Start(api.Manager, pool)

	// ── HTTP routes ─────────────────────────────────────────────────
	r := chi.NewRouter()

	// Health check endpoint for Render / Docker / load balancers
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	r.Get("/ws/{documentId}", api.HandleWebSocket)

	// ── Start server ────────────────────────────────────────────────
	addr := "0.0.0.0:" + cfg.Port
	log.Printf("[server] SyncPad backend starting on %s (env=%s)", addr, cfg.Environment)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("[server] FATAL: %v", err)
	}
}
