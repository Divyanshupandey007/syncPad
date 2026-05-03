package storage

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

func Connect(databaseURL string) *pgxpool.Pool {
	pool, err := pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		fmt.Println("Error connecting database:", err)
		return nil
	}
	return pool
}

func CreateTable(pool *pgxpool.Pool) {
	pool.Exec(context.Background(), `CREATE TABLE IF NOT EXISTS documents (
    id         TEXT PRIMARY KEY,
    content    TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`)
}

func SaveDocument(pool *pgxpool.Pool, docId, content string) {
	pool.Exec(context.Background(), `INSERT INTO documents (id,content,updated_at)
	VALUES ($1,$2,NOW()) ON CONFLICT (id) DO UPDATE SET content=$2,updated_at=NOW()`, docId, content)
}

func LoadDocument(pool *pgxpool.Pool, docId string) string {
	var content string
	err := pool.QueryRow(context.Background(), `SELECT content from documents WHERE id = $1`, docId).Scan(&content)
	if err != nil {
		return ""
	}
	return content
}
