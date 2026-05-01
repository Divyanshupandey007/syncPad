package api

import (
	"fmt"
	"log"
	"net/http"
	"syncPad/internal/hub"

	"github.com/go-chi/chi/v5"
	"github.com/gorilla/websocket"
)

var wsupgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

var manager = hub.NewManager()

// HandleGetPad serves the document or initial state for a pad
func HandleGetPad(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, "Pad document handler")
}

// HandleWebSocket upgrades the connection to a websocket for a pad
func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := wsupgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Connection failed")
		return
	}

	docId := chi.URLParam(r, "documentId")

	manager.Lock()
	room, exists := manager.Rooms[docId]
	if !exists {
		room = hub.NewRoom(docId)
		manager.Rooms[docId] = room
		go room.Run()
	}
	manager.Unlock()

	client := &hub.Client{
		Conn: conn,
		Send: make(chan []byte, 256),
		Room: room,
	}

	room.Lock()
	room.Clients[client] = true
	room.Unlock()

	go func() {
		for message := range client.Send {
			client.Conn.WriteMessage(websocket.TextMessage, message)
		}
	}()

	for {
		_, message, err := client.Conn.ReadMessage()
		if err != nil {
			room.Lock()
			delete(room.Clients, client)
			room.Unlock()
			break
		}

		room.Broadcast <- message
	}
}
