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
	Txt       string
	Clients   map[*Client]bool
	Broadcast chan []byte
	Rdb       *redis.Client
	sync.RWMutex
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
		Broadcast: make(chan []byte),
	}
	return r
}

func (r *Room) Run() {
	for message := range r.Broadcast {
		r.Lock()
		r.Txt = string(message)
		r.Unlock()
		for client := range r.Clients {
			client.Send <- message
		}
		redisclient.Publish(r.Rdb, r.ID, message)
	}
}

func (r *Room) ListenRedis() {
	pubsub := redisclient.Subscribe(r.Rdb, r.ID)
	ch := pubsub.Channel()
	for msg := range ch {
		r.Lock()
		r.Txt = msg.Payload
		r.Unlock()
		for client := range r.Clients {
			client.Send <- []byte(msg.Payload)
		}
	}
}
