package storage

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Connect creates a PostgreSQL connection pool.
// Fatally exits if the connection fails — the server cannot function without a database.
func Connect(databaseURL string) *pgxpool.Pool {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		log.Fatalf("[db] FATAL: failed to parse database config: %v", err)
	}

	// Disable named prepared statements for compatibility with PgBouncer (e.g. on Render)
	config.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeExec

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		log.Fatalf("[db] FATAL: failed to connect to database: %v", err)
	}

	// Verify connectivity at startup
	if err := pool.Ping(context.Background()); err != nil {
		log.Fatalf("[db] FATAL: cannot reach database: %v", err)
	}
	log.Printf("[db] Connected to PostgreSQL")
	return pool
}

func CreateTable(pool *pgxpool.Pool) {
	_, err := pool.Exec(context.Background(), `CREATE TABLE IF NOT EXISTS documents (
    id         TEXT PRIMARY KEY,
    content    BYTEA NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`)
	if err != nil {
		log.Printf("[db] WARNING: failed to create documents table: %v", err)
	}
}

func SaveDocument(pool *pgxpool.Pool, docId string, content []byte) {
	_, err := pool.Exec(context.Background(), `INSERT INTO documents (id,content,updated_at)
	VALUES ($1,$2,NOW()) ON CONFLICT (id) DO UPDATE SET content=$2,updated_at=NOW()`, docId, content)
	if err != nil {
		log.Printf("[db] WARNING: failed to save document %s: %v", docId, err)
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
