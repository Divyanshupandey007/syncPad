package main

import (
	"fmt"
	"net/http"
	"os"
	"syncPad/internal/api"
	"syncPad/internal/redisclient"
	"syncPad/internal/storage"
	"syncPad/internal/syncer"

	"github.com/go-chi/chi/v5"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()
	r := chi.NewRouter()
	r.Route("/api", func(r chi.Router) {
		r.Get("/{documentId}", api.HandleGetPad)
		r.Get("/ws/{documentId}", api.HandleWebSocket)
	})
	pool := storage.Connect(os.Getenv("DATABASE_URL"))
	storage.CreateTable(pool)
	api.Pool = pool
	rdb := redisclient.Connect(os.Getenv("REDIS_URL"))
	api.RedisClient = rdb
	syncer.Start(api.Manager, pool)
	fmt.Println("Server started")
	http.ListenAndServe(":3000", r)
}
