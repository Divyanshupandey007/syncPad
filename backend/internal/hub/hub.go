package hub

import (
	"sync"

	"github.com/gorilla/websocket"
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
	// for {
	// 	select {
	// 	case message := <-r.Broadcast:
	// 		r.Lock()
	// 		r.Txt = string(message)
	// 		r.Unlock()
	// 	}
	// }
	for message := range r.Broadcast {
		r.Lock()
		r.Txt = string(message)
		r.Unlock()
		for client := range r.Clients {
			client.Send <- message
		}
	}
}
