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
	cfg := config.Load()

	pool := storage.Connect(cfg.DatabaseURL)
	storage.CreateTable(pool)
	api.Pool = pool

	rdb := redisclient.Connect(cfg.RedisURL)
	api.RedisClient = rdb

	api.InitOriginChecker(cfg.AllowedOrigins, cfg.Environment)
	syncer.Start(api.Manager, pool)

	r := chi.NewRouter()

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	r.Get("/ws/{documentId}", api.HandleWebSocket)

	addr := "0.0.0.0:" + cfg.Port
	log.Printf("[server] starting on %s (env=%s)", addr, cfg.Environment)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("[server] FATAL: %v", err)
	}
}
