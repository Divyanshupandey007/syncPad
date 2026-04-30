package api

import (
	"fmt"
	"net/http"
)

// HandleGetPad serves the document or initial state for a pad
func HandleGetPad(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, "Pad document handler")
}

// HandleWebSocket upgrades the connection to a websocket for a pad
func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, "Pad websocket handler")
}
