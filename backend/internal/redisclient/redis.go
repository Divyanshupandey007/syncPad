package redisclient

import (
	"context"
	"log"

	"github.com/redis/go-redis/v9"
)

func Connect(redisURL string) *redis.Client {
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Fatalf("[redis] failed to parse URL: %v", err)
	}
	rdb := redis.NewClient(opt)

	if err := rdb.Ping(context.Background()).Err(); err != nil {
		log.Fatalf("[redis] cannot reach Redis: %v", err)
	}
	log.Println("[redis] connected")
	return rdb
}

func Publish(rdb *redis.Client, docId string, message []byte) {
	rdb.Publish(context.Background(), "doc:"+docId, message)
}

func Subscribe(rdb *redis.Client, docId string) *redis.PubSub {
	return rdb.Subscribe(context.Background(), "doc:"+docId)
}
