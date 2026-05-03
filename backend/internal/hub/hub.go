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
	m := &Manager{
		Rooms: make(map[string]*Room, 0),
	}
	return m
}

func NewRoom(id string) *Room {
	r := &Room{
		ID:        id,
		Clients:   make(map[*Client]bool, 0),
		Broadcast: make(chan BroadcastMsg),
	}
	return r
}

func (r *Room) Run() {
	for msg := range r.Broadcast {
		// msg.Data[0] is the message type byte from the frontend:
		//   0x01 = incremental CRDT change  → relay to OTHER clients
		//   0x02 = full document snapshot    → store for persistence
		if len(msg.Data) == 0 {
			continue
		}

		msgType := msg.Data[0]

		switch msgType {
		case 0x01: // Change — relay to everyone EXCEPT the sender
			for client := range r.Clients {
				if client != msg.Sender {
					client.Send <- msg.Data
				}
			}
			// Publish to Redis so other server instances receive this change
			redisclient.Publish(r.Rdb, r.ID, msg.Data)

		case 0x02: // Snapshot — store the binary (skip the type byte)
			r.Lock()
			r.Doc = msg.Data[1:] // Everything after the 0x02 byte
			r.Unlock()
		}
	}
}

// ListenRedis subscribes to Redis for multi-server setups.
func (r *Room) ListenRedis() {
	pubsub := redisclient.Subscribe(r.Rdb, r.ID)
	ch := pubsub.Channel()
	for msg := range ch {
		// When we receive a message from Redis (meaning another server published it),
		// we relay it to ALL local clients connected to this server instance.
		// Note: The original sender's server will also receive this echo, but
		// Automerge safely ignores duplicate CRDT messages.
		r.RLock()
		for client := range r.Clients {
			client.Send <- []byte(msg.Payload)
		}
		r.RUnlock()
	}
}
