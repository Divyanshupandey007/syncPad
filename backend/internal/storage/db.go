package storage

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func Connect(databaseURL string) *pgxpool.Pool {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		log.Fatalf("[db] failed to parse config: %v", err)
	}

	// Needed for PgBouncer compatibility (e.g. Render)
	config.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeExec

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		log.Fatalf("[db] failed to connect: %v", err)
	}

	if err := pool.Ping(context.Background()); err != nil {
		log.Fatalf("[db] cannot reach database: %v", err)
	}
	log.Println("[db] connected to PostgreSQL")
	return pool
}

func CreateTable(pool *pgxpool.Pool) {
	_, err := pool.Exec(context.Background(), `CREATE TABLE IF NOT EXISTS documents (
    id         TEXT PRIMARY KEY,
    content    BYTEA NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`)
	if err != nil {
		log.Printf("[db] failed to create table: %v", err)
	}
}

func SaveDocument(pool *pgxpool.Pool, docId string, content []byte) {
	_, err := pool.Exec(context.Background(), `INSERT INTO documents (id,content,updated_at)
	VALUES ($1,$2,NOW()) ON CONFLICT (id) DO UPDATE SET content=$2,updated_at=NOW()`, docId, content)
	if err != nil {
		log.Printf("[db] failed to save %s: %v", docId, err)
	}
}

func LoadDocument(pool *pgxpool.Pool, docId string) []byte {
	var content []byte
	err := pool.QueryRow(context.Background(), `SELECT content from documents WHERE id = $1`, docId).Scan(&content)
	if err != nil {
		return nil
	}
	return content
}
