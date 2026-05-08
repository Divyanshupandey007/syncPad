package redisclient

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"
)

func Connect(redisURL string) *redis.Client {
	// rdb := redis.NewClient(&redis.Options{
	// 	Addr: redisURL,
	// })
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		fmt.Println("Error parsing Redis URL:", err)
		return nil
	}
	rdb := redis.NewClient(opt)
	return rdb
}

func Publish(rdb *redis.Client, docId string, message []byte) {
	rdb.Publish(context.Background(), "doc:"+docId, message)
}

func Subscribe(rdb *redis.Client, docId string) *redis.PubSub {
	return rdb.Subscribe(context.Background(), "doc:"+docId)
}
