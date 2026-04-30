package main

import (
	"net/http"
	"syncPad/internal/api"

	"github.com/go-chi/chi/v5"
)

func main() {
	r := chi.NewRouter()
	r.Get("/{documentId}", api.HandleGetPad)
	r.Get("/ws/{documentId}", api.HandleWebSocket)
	http.ListenAndServe(":3000", r)
}
