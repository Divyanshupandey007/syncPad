package api

import (
	"encoding/base64"
	"log"
	"net/http"
	"strings"
	"syncPad/internal/hub"
	"syncPad/internal/storage"

	"github.com/go-chi/chi/v5"
	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// ── WebSocket upgrader ──────────────────────────────────────────────
// The CheckOrigin function is set dynamically via InitOriginChecker().
var wsupgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// Default: reject all until InitOriginChecker() is called.
		// This ensures the server never accidentally runs with an open policy.
		return false
	},
}

// InitOriginChecker configures the WebSocket origin policy based on
// the deployment environment and the ALLOWED_ORIGINS config.
//
//   - In development: all origins are allowed (for localhost convenience).
//   - In production:  only origins in the whitelist are accepted.
func InitOriginChecker(allowedOrigins []string, env string) {
	if env != "production" {
		// Development / Docker — accept everything
		wsupgrader.CheckOrigin = func(r *http.Request) bool {
			return true
		}
		log.Println("[api] WebSocket origin check: OPEN (development mode)")
		return
	}

	// Production — restrict to configured origins
	allowed := make(map[string]bool, len(allowedOrigins))
	for _, o := range allowedOrigins {
		allowed[strings.TrimRight(o, "/")] = true
	}
	wsupgrader.CheckOrigin = func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		return allowed[strings.TrimRight(origin, "/")]
	}
	log.Printf("[api] WebSocket origin check: RESTRICTED to %v", allowedOrigins)
}

// ── Deterministic empty Automerge snapshot ──────────────────────────
// This ensures all clients that join a brand-new document share the
// same CRDT root history, preventing divergent document states.
var emptyDocBase64 = "hW9Kg+Sk7+UAsAEBENQvzc3HIwBIeixLHRT1PQcBtkjQLOiRGxu3MBzcyyKIxG4qEAtMMOjuDIVImZUaZ+AGAQIDAhMCIwZAAlYCDAEEAgQRBBMHFQ4hAiMCNAJCBFYEVxSAAQJ/AH8BfxZ/zc/4zwZ/AH8HAAIUAAACFAIAAxMAAAJ+AAMSAX4EdGV4dAV0aXRsZQAUFgAWAQIUAgQUAQIAFBZVbnRpdGxlZCBEb2N1bWVudC5tZBYAAA=="
var emptyDocBytes []byte

func init() {
	emptyDocBytes, _ = base64.StdEncoding.DecodeString(emptyDocBase64)
}

// ── Package-level state ─────────────────────────────────────────────
var Manager = hub.NewManager()
var Pool *pgxpool.Pool
var RedisClient *redis.Client

// HandleWebSocket upgrades the connection to a websocket for a pad
func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := wsupgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("[api] WebSocket upgrade failed:", err)
		return
	}

	docId := chi.URLParam(r, "documentId")

	Manager.Lock()
	room, exists := Manager.Rooms[docId]
	if !exists {
		room = hub.NewRoom(docId)
		doc := storage.LoadDocument(Pool, docId)
		if len(doc) == 0 {
			doc = emptyDocBytes
		}
		room.Doc = doc
		room.Rdb = RedisClient
		Manager.Rooms[docId] = room
		go room.Run()
		go room.ListenRedis()
	}
	Manager.Unlock()

	client := &hub.Client{
		Conn: conn,
		Send: make(chan []byte, 256),
		Room: room,
	}

	room.Lock()
	room.Clients[client] = true
	room.Unlock()
	go room.BroadcastPresence()

	room.RLock()
	if len(room.Doc) != 0 {
		// Prepend 0x02 type byte so the frontend knows this is a full snapshot
		snapshot := append([]byte{0x02}, room.Doc...)
		conn.WriteMessage(websocket.BinaryMessage, snapshot)
	}
	room.RUnlock()

	go func() {
		for message := range client.Send {
			client.Conn.WriteMessage(websocket.BinaryMessage, message)
		}
	}()

	for {
		_, message, err := client.Conn.ReadMessage()
		if err != nil {
			room.Lock()
			delete(room.Clients, client)
			room.Unlock()
			go room.BroadcastPresence()
			break
		}

		room.Broadcast <- hub.BroadcastMsg{Data: message, Sender: client}
	}
}
