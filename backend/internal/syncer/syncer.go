package syncer

import (
	"syncPad/internal/hub"
	"syncPad/internal/storage"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func Start(manager *hub.Manager, pool *pgxpool.Pool) {
	go func() {
		ticker := time.NewTicker(5 * time.Second)
		for range ticker.C {
			manager.RLock()
			for _, room := range manager.Rooms {
				room.RLock()
				storage.SaveDocument(pool, room.ID, room.Txt)
				room.RUnlock()
			}
			manager.RUnlock()
		}
	}()
}
