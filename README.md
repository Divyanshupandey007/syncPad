# SyncPad 📝

![Go](https://img.shields.io/badge/go-%2300ADD8.svg?style=for-the-badge&logo=go&logoColor=white)
![Angular](https://img.shields.io/badge/angular-%23DD0031.svg?style=for-the-badge&logo=angular&logoColor=white)
![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)

**SyncPad** is a highly scalable, distributed real-time collaborative text editor. Built from the ground up with a focus on concurrency, low latency, and distributed systems architecture, it allows multiple users to seamlessly edit the same document at the exact same time.

## 🚀 Features

- **Real-Time Collaboration** — Sub-millisecond local latency for keystroke broadcasting via WebSockets.
- **Conflict-Free Editing** — Automerge CRDTs ensure all clients converge to the same document state, even with concurrent edits.
- **Concurrent & Safe** — Thread-safe memory management using Go's `sync.RWMutex` to prevent race conditions.
- **Auto-Document Creation** — Navigate to any URL path and the document is instantly provisioned.
- **Write-Behind Caching** — In-memory state is flushed to PostgreSQL on a background ticker, preventing database thrashing.
- **Horizontal Scaling** — Redis Pub/Sub broadcasts changes across multiple server instances.
- **140+ Language Syntax Highlighting** — CodeMirror-powered editor with formatting support.

## 🏗️ Architecture

```
┌─────────────┐     WebSocket      ┌──────────────┐     Pub/Sub      ┌─────────────┐
│   Angular    │◄──────────────────►│  Go Backend  │◄────────────────►│    Redis     │
│  (Frontend)  │                    │  (Hub/Rooms) │                  │  (Upstash)   │
└─────────────┘                    └──────┬───────┘                  └─────────────┘
                                          │
                                          │ Write-behind sync
                                          ▼
                                   ┌──────────────┐
                                   │  PostgreSQL   │
                                   │  (Supabase)   │
                                   └──────────────┘
```

### Backend (Go)
- **API Layer** (`go-chi`) — Handles HTTP health checks and upgrades connections to WebSockets.
- **Hub Engine** — Manages Rooms and Clients. A background goroutine per active document fans out messages to all connected clients.
- **Syncer** — Background worker that periodically flushes dirty in-memory documents to PostgreSQL.
- **Config** — Centralized environment-based configuration with `.env` support via `godotenv`.

### Frontend (Angular)
- Reactive Angular application with CodeMirror editor.
- Automerge CRDT integration for conflict-free collaborative editing.
- Environment-based configuration (`environment.ts` / `environment.prod.ts`).

## 📂 Project Structure

```
syncPad/
├── backend/
│   ├── cmd/server/          # Application entrypoint
│   ├── internal/
│   │   ├── api/             # HTTP & WebSocket upgrade handlers
│   │   ├── config/          # Environment configuration loader
│   │   ├── hub/             # Core concurrency engine (Rooms, Clients, Manager)
│   │   ├── redisclient/     # Redis Pub/Sub driver
│   │   ├── storage/         # PostgreSQL persistence layer
│   │   └── syncer/          # Background DB-sync workers
│   ├── .env.example         # Local dev environment template
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── environments/    # Dev & prod environment configs
│   │   └── app/             # Angular components & services
│   ├── nginx.conf           # Nginx reverse proxy config (Docker)
│   └── Dockerfile
├── docker-compose.yml       # Full-stack local orchestration
├── .env.example             # Docker Compose environment template
└── README.md
```

## 🛠️ Getting Started

### Prerequisites
- [Go 1.22+](https://go.dev/)
- [Node.js & npm](https://nodejs.org/) (for Angular)
- [Docker & Docker Compose](https://www.docker.com/)

---

### Option A: Docker (Recommended for Contributors)

The fastest way to run the entire stack locally:

```bash
# 1. Clone the repo
git clone https://github.com/Divyanshupandey007/syncPad.git
cd syncPad

# 2. Create your environment file
cp .env.example .env

# 3. Start everything
docker compose up --build
```

Open **http://localhost** in your browser. Done!

---

### Option B: Manual (For Active Development)

Run each service individually for hot-reloading during development.

#### 1. Start Infrastructure
Start only the database and Redis containers:
```bash
docker compose up db redis -d
```

#### 2. Run the Backend
```bash
cd backend
cp .env.example .env     # Only needed once
go mod tidy
go run ./cmd/server
```
The backend starts on **http://localhost:3000**.

#### 3. Run the Frontend
```bash
cd frontend
npm install              # Only needed once
npm start
```
The Angular dev server starts on **http://localhost:4200** with hot-reload.

---

## ⚙️ Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `REDIS_URL` | ✅ | — | Redis connection string (must use `redis://` or `rediss://` prefix) |
| `SERVER_PORT` | ❌ | `3000` | Port the Go backend listens on |
| `APP_ENV` | ❌ | `development` | `development` or `production` |
| `ALLOWED_ORIGINS` | ❌ | *(all)* | Comma-separated WebSocket origin whitelist (enforced in production only) |
| `POSTGRES_USER` | ❌ | — | Used by Docker Compose for the PostgreSQL container |
| `POSTGRES_PASSWORD` | ❌ | — | Used by Docker Compose for the PostgreSQL container |
| `POSTGRES_DB` | ❌ | — | Used by Docker Compose for the PostgreSQL container |

## 🌐 Production Deployment

SyncPad is deployed on a 100% free-tier stack:

| Service | Provider | Purpose |
|---------|----------|---------|
| Frontend | Cloudflare Pages | Static Angular build served via CDN |
| Backend | Render.com | Dockerized Go server |
| Database | Supabase | Managed PostgreSQL |
| Pub/Sub | Upstash | Managed Redis |

### Deploying Changes
1. Push to `main` branch.
2. **Render** auto-deploys the backend from `backend/Dockerfile`.
3. **Cloudflare Pages** auto-builds the frontend from `frontend/`.

### Production Environment Variables (set in Render dashboard)
```
DATABASE_URL=postgres://...@supabase.co:5432/postgres
REDIS_URL=rediss://...@upstash-redis.com:6379
SERVER_PORT=3000
APP_ENV=production
ALLOWED_ORIGINS=https://syncpad-frontend.pandey-divyanshu03.workers.dev
```

## 🗺️ Roadmap

- [x] Phase 1: HTTP Routing & API Setup
- [x] Phase 2: In-Memory Concurrent WebSocket Engine
- [x] Phase 3: PostgreSQL Integration & Write-Behind Syncer
- [x] Phase 4: Redis Pub/Sub for Horizontal Scaling
- [x] Phase 5: Automerge CRDT for Conflict-Free Editing
- [x] Phase 6: CodeMirror Editor with 140+ Language Support
- [x] Phase 7: Free-Tier Cloud Deployment
- [ ] Phase 8: Graceful Shutdown & Connection Draining
- [ ] Phase 9: User Presence & Cursor Indicators

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes.
4. Test locally with `docker compose up --build`.
5. Push and open a Pull Request against `main`.

> **Note:** Never commit `.env` files. Use `.env.example` as a template.

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
