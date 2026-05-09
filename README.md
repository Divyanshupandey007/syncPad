<p align="center">
  <img src="https://img.shields.io/badge/go-%2300ADD8.svg?style=for-the-badge&logo=go&logoColor=white" alt="Go" />
  <img src="https://img.shields.io/badge/angular-%23DD0031.svg?style=for-the-badge&logo=angular&logoColor=white" alt="Angular" />
  <img src="https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/automerge-%23FF6F00.svg?style=for-the-badge&logo=data:image/svg+xml;base64,&logoColor=white" alt="Automerge CRDT" />
</p>

<h1 align="center">SyncPad 📝</h1>

<p align="center">
  <strong>A real-time collaborative text editor built for concurrency, low latency, and distributed systems.</strong>
</p>

<p align="center">
  <a href="https://sync-pad.pages.dev">Live Demo</a> · <a href="#-getting-started">Quick Start</a> · <a href="#%EF%B8%8F-architecture">Architecture</a>
</p>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Real-Time Collaboration** | Sub-millisecond local latency. Changes broadcast instantly to all connected users via WebSockets. |
| **Conflict-Free Editing (CRDT)** | Powered by [Automerge](https://automerge.org/) — all clients converge to the same document state, even with concurrent edits and network partitions. |
| **Live Presence** | See how many collaborators are viewing the same document in real-time. Connection status is displayed in the navbar. |
| **140+ Languages** | CodeMirror 6 editor with syntax highlighting and formatting for 140+ programming languages. |
| **Auto-Document Creation** | Navigate to any URL path and a new document is instantly provisioned — no sign-up required. |
| **Editable Document Title** | Click the title in the navbar to rename. Title changes sync to all collaborators in real-time via CRDT. |
| **Download as File** | Export your document content as a `.txt` file with one click. |
| **Theme Toggle** | Switch between dark and light modes. Preference is saved locally. |
| **Write-Behind Persistence** | In-memory state is flushed to PostgreSQL on a background ticker — no database thrashing. |
| **Horizontal Scaling** | Redis Pub/Sub broadcasts changes across multiple backend instances. |
| **Thread-Safe Concurrency** | Go's `sync.RWMutex` protects all shared state — no race conditions under high concurrency. |

---

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

### Backend — Go

| Layer | Responsibility |
|-------|---------------|
| **API** (`go-chi`) | HTTP health checks, WebSocket upgrade handshake, origin validation |
| **Hub Engine** | Manages Rooms and Clients. A dedicated goroutine per document fans out messages to all connected clients |
| **Presence** | Broadcasts a 2-byte presence message (`[0x03, count]`) whenever a client joins or leaves a room |
| **Syncer** | Background worker that periodically flushes dirty documents to PostgreSQL |
| **Redis Pub/Sub** | Cross-instance message relay for horizontal scaling |
| **Config** | Centralized `.env`-based configuration via `godotenv` |

### Frontend — Angular

| Layer | Responsibility |
|-------|---------------|
| **CodeMirror 6** | Feature-rich editor with 140+ language modes, line numbers, word wrap, and font-size control |
| **Automerge CRDT** | Conflict-free replication — local edits are merged with remote changes without coordination |
| **WebSocket Service** | Binary protocol handler with automatic reconnection awareness and presence message interception |
| **Navbar** | Connection status indicator, live collaborator count, editable document title, theme toggle, download button |

---

## 📂 Project Structure

```
syncPad/
├── backend/
│   ├── cmd/server/             # Application entrypoint (main.go)
│   ├── internal/
│   │   ├── api/                # HTTP routes & WebSocket upgrade handler
│   │   ├── config/             # Environment configuration loader
│   │   ├── hub/                # Core concurrency engine (Hub → Room → Client)
│   │   ├── redisclient/        # Redis Pub/Sub driver
│   │   ├── storage/            # PostgreSQL persistence layer
│   │   └── syncer/             # Background write-behind sync worker
│   ├── .env.example            # Backend-only env template (for manual dev)
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/     # Navbar, Editor, Settings Modal, Help Modal
│   │   │   └── services/       # WebSocket, Automerge, CodeMirror, Settings
│   │   └── environments/       # Dev & prod environment configs
│   ├── nginx.conf              # Nginx reverse proxy (WebSocket + SPA routing)
│   └── Dockerfile
├── docker-compose.yml          # Full-stack local orchestration
├── .env.example                # Docker Compose environment template
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- [Docker & Docker Compose](https://www.docker.com/) (for Option A)
- [Go 1.22+](https://go.dev/) (for Option B)
- [Node.js 22+ & npm](https://nodejs.org/) (for Option B)

---

### Option A: Docker — One Command Setup

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

> **What runs:** 4 containers — PostgreSQL, Redis, Go backend, and Nginx (serving the Angular build + proxying WebSockets).

---

### Option B: Manual — For Active Development

Run each service individually for hot-reloading during development.

**1. Start infrastructure** (database + Redis):
```bash
docker compose up db redis -d
```

**2. Start the Go backend:**
```bash
cd backend
cp .env.example .env     # Only needed once
go mod tidy
go run ./cmd/server
```
Backend starts on **http://localhost:3000**.

**3. Start the Angular dev server:**
```bash
cd frontend
npm install              # Only needed once
npm start
```
Frontend starts on **http://localhost:4200** with live reload.

---

## ⚙️ Environment Variables

All variables are configured via `.env` files. Copy `.env.example` to `.env` to get started.

| Variable | Required | Default | Description |
|----------|:--------:|---------|-------------|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `REDIS_URL` | ✅ | — | Redis connection string (`redis://` or `rediss://` prefix) |
| `SERVER_PORT` | ❌ | `3000` | Port the Go backend listens on |
| `APP_ENV` | ❌ | `development` | `development` or `production` |
| `ALLOWED_ORIGINS` | ❌ | *(all)* | Comma-separated WebSocket origin whitelist (enforced in production only) |
| `POSTGRES_USER` | ❌ | — | Docker Compose: PostgreSQL container user |
| `POSTGRES_PASSWORD` | ❌ | — | Docker Compose: PostgreSQL container password |
| `POSTGRES_DB` | ❌ | — | Docker Compose: PostgreSQL database name |

> **Note:** Never commit `.env` files. They are git-ignored. Use `.env.example` as a template.

---

## 🌐 Production Deployment

SyncPad is deployed on a **100% free-tier** cloud stack:

| Service | Provider | Purpose |
|---------|----------|---------|
| Frontend | [Cloudflare Pages](https://pages.cloudflare.com/) | Static Angular build served via global CDN |
| Backend | [Render](https://render.com/) | Dockerized Go WebSocket server |
| Database | [Supabase](https://supabase.com/) | Managed PostgreSQL |
| Pub/Sub | [Upstash](https://upstash.com/) | Serverless Redis |

### How It Works

The frontend is a static build hosted on Cloudflare Pages. Since static CDNs can't proxy WebSocket connections, the frontend detects whether it's running locally (Docker/dev) or on a remote host and connects to the appropriate backend:

| Environment | WebSocket Target |
|---|---|
| `ng serve` (localhost:4200) | `ws://localhost:3000/ws/` (direct to Go) |
| Docker Compose (localhost:80) | `ws://localhost/ws/` (nginx proxies to Go) |
| Production (Cloudflare Pages) | `wss://syncpad-backend-7041.onrender.com/ws/` |

### Deploying Changes

1. Push to `main`.
2. **Render** auto-deploys the backend from `backend/Dockerfile`.
3. **Cloudflare Pages** auto-builds the frontend from `frontend/`.

---

## 🤝 Contributing

1. **Fork** the repository.
2. Create a feature branch: `git checkout -b feature/my-feature`.
3. Make your changes.
4. Test locally with `docker compose up --build`.
5. Push and open a **Pull Request** against `main`.

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.
