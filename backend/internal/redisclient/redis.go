package redisclient

import (
	"context"
	"log"

	"github.com/redis/go-redis/v9"
)

// Connect parses a Redis connection URL and returns a connected client.
// Expects a full URL like "redis://localhost:6379" or "rediss://user:pass@host:port".
// Fatally exits if the URL is invalid — the server cannot function without Redis.
func Connect(redisURL string) *redis.Client {
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Fatalf("[redis] FATAL: failed to parse REDIS_URL: %v", err)
	}
	rdb := redis.NewClient(opt)

	// Verify connectivity at startup
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		log.Fatalf("[redis] FATAL: cannot reach Redis at %s: %v", redisURL, err)
	}
	log.Printf("[redis] Connected to Redis")
	return rdb
}

func Publish(rdb *redis.Client, docId string, message []byte) {
	rdb.Publish(context.Background(), "doc:"+docId, message)
}

func Subscribe(rdb *redis.Client, docId string) *redis.PubSub {
	return rdb.Subscribe(context.Background(), "doc:"+docId)
}
