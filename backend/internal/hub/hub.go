package hub

import (
	"sync"
	"syncPad/internal/redisclient"

	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

type Manager struct {
	Rooms map[string]*Room
	sync.RWMutex
}

type Client struct {
	Conn *websocket.Conn
	Send chan []byte
	Room *Room
}

type Room struct {
	ID        string
	Doc       []byte
	Dirty     bool
	Clients   map[*Client]bool
	Broadcast chan BroadcastMsg
	Rdb       *redis.Client
	sync.RWMutex
}

type BroadcastMsg struct {
	Data   []byte
	Sender *Client
}

func NewManager() *Manager {
	return &Manager{Rooms: make(map[string]*Room)}
}

func NewRoom(id string) *Room {
	return &Room{
		ID:        id,
		Clients:   make(map[*Client]bool),
		Broadcast: make(chan BroadcastMsg),
	}
}

// Run processes broadcast messages for the room.
// 0x01 = CRDT change (relay to peers), 0x02 = snapshot (store for persistence).
func (r *Room) Run() {
	for msg := range r.Broadcast {
		if len(msg.Data) == 0 {
			continue
		}

		switch msg.Data[0] {
		case 0x01:
			for client := range r.Clients {
				if client != msg.Sender {
					client.Send <- msg.Data
				}
			}
			redisclient.Publish(r.Rdb, r.ID, msg.Data)

		case 0x02:
			r.Lock()
			r.Doc = msg.Data[1:]
			r.Dirty = true
			r.Unlock()
		}
	}
}

// ListenRedis relays messages from other server instances to local clients.
func (r *Room) ListenRedis() {
	ch := redisclient.Subscribe(r.Rdb, r.ID).Channel()
	for msg := range ch {
		r.RLock()
		for client := range r.Clients {
			client.Send <- []byte(msg.Payload)
		}
		r.RUnlock()
	}
}

// BroadcastPresence sends the current client count to all connected clients.
// Format: [0x03, count_byte]
func (r *Room) BroadcastPresence() {
	r.RLock()
	msg := []byte{0x03, byte(len(r.Clients))}
	for client := range r.Clients {
		select {
		case client.Send <- msg:
		default:
		}
	}
	r.RUnlock()
}
