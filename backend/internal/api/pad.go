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

var wsupgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return false // locked until InitOriginChecker is called
	},
}

// InitOriginChecker sets the WebSocket CORS policy.
// Dev mode allows all origins; production restricts to the whitelist.
func InitOriginChecker(allowedOrigins []string, env string) {
	if env != "production" {
		wsupgrader.CheckOrigin = func(r *http.Request) bool { return true }
		log.Println("[api] WebSocket origins: OPEN (dev)")
		return
	}

	allowed := make(map[string]bool, len(allowedOrigins))
	for _, o := range allowedOrigins {
		allowed[strings.TrimRight(o, "/")] = true
	}
	wsupgrader.CheckOrigin = func(r *http.Request) bool {
		return allowed[strings.TrimRight(r.Header.Get("Origin"), "/")]
	}
	log.Printf("[api] WebSocket origins: %v", allowedOrigins)
}

// Deterministic empty Automerge doc — ensures new documents share CRDT root history
var emptyDocBase64 = "hW9Kg+Sk7+UAsAEBENQvzc3HIwBIeixLHRT1PQcBtkjQLOiRGxu3MBzcyyKIxG4qEAtMMOjuDIVImZUaZ+AGAQIDAhMCIwZAAlYCDAEEAgQRBBMHFQ4hAiMCNAJCBFYEVxSAAQJ/AH8BfxZ/zc/4zwZ/AH8HAAIUAAACFAIAAxMAAAJ+AAMSAX4EdGV4dAV0aXRsZQAUFgAWAQIUAgQUAQIAFBZVbnRpdGxlZCBEb2N1bWVudC5tZBYAAA=="
var emptyDocBytes []byte

func init() {
	emptyDocBytes, _ = base64.StdEncoding.DecodeString(emptyDocBase64)
}

var Manager = hub.NewManager()
var Pool *pgxpool.Pool
var RedisClient *redis.Client

func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := wsupgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("[api] upgrade failed:", err)
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

	// Send current snapshot (type 0x02) to the new client
	room.RLock()
	if len(room.Doc) != 0 {
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
