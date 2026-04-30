# SyncPad 📝

![Go](https://img.shields.io/badge/go-%2300ADD8.svg?style=for-the-badge&logo=go&logoColor=white)
![Angular](https://img.shields.io/badge/angular-%23DD0031.svg?style=for-the-badge&logo=angular&logoColor=white)
![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)

**SyncPad** is a highly scalable, distributed real-time collaborative text editor. Built from the ground up with a focus on concurrency, low latency, and distributed systems architecture, it allows multiple users to seamlessly edit the same document at the exact same time.

## 🚀 Features

- **Real-Time Collaboration**: Sub-millisecond latency for real-time keystroke broadcasting using WebSockets.
- **Concurrent & Safe**: Thread-safe memory management utilizing Go's `sync.RWMutex` to prevent race conditions during simultaneous edits.
- **Auto-Document Creation**: No need to "create" a document. Just navigate to a unique URL, and the document is instantly provisioned.
- **Write-Behind Caching (Planned)**: Optimized database writes. In-memory state is synced to PostgreSQL on a background ticker, preventing database thrashing on every keystroke.
- **Distributed Scaling (Planned)**: Designed to run across multiple servers using Redis Pub/Sub to broadcast WebSocket messages horizontally.

## 🏗️ Architecture

SyncPad is structured into two main components:

### Backend (Golang)
The backend is built around a custom, concurrent WebSocket Hub.
* **API Layer (`go-chi`)**: Handles initial document fetching and upgrades HTTP connections to WebSockets.
* **Hub Engine**: Manages Rooms and Clients. A background Goroutine runs for every active document, listening on a broadcast channel and fanning out messages to all connected clients.
* **Syncer**: A background worker that periodically flushes the in-memory document state to persistent storage.

### Frontend (Angular)
A lightweight, reactive Angular application that establishes a persistent WebSocket connection to the backend, rendering UI updates instantly as state changes.

## 📂 Project Structure

```text
syncPad/
├── backend/
│   ├── cmd/server/         # Application entrypoint
│   ├── internal/
│   │   ├── api/            # HTTP & WebSocket upgrade handlers
│   │   ├── hub/            # Core concurrency engine (Rooms, Clients, Manager)
│   │   ├── storage/        # Database drivers (PostgreSQL)
│   │   └── syncer/         # Background DB-sync workers
│   └── docker-compose.yml  # Local infrastructure (Postgres, Redis)
└── frontend/               # Angular application
```

## 🛠️ Getting Started (Local Development)

### Prerequisites
- [Go 1.22+](https://go.dev/)
- [Node.js & npm](https://nodejs.org/) (for Angular)
- [Docker & Docker Compose](https://www.docker.com/)

### 1. Start the Infrastructure
Start the local PostgreSQL and Redis instances using Docker:
```bash
cd backend
docker-compose up -d
```

### 2. Run the Backend
Ensure your `.env` file is set up with your local database credentials (see `.env.example`).
```bash
cd backend
go mod tidy
go run ./cmd/server
```
*The backend server will start on `http://localhost:3000`*

### 3. Run the Frontend
```bash
cd frontend
npm install
npm start
```
*The Angular development server will start on `http://localhost:4200`*

## 🗺️ Roadmap
- [x] Phase 1: Basic HTTP Routing & API Setup
- [x] Phase 2: In-Memory Concurrent WebSocket Engine
- [ ] Phase 3: PostgreSQL Integration & Write-Behind Syncer
- [ ] Phase 4: Redis Pub/Sub for Horizontal Scaling
- [ ] Phase 5: Graceful Shutdown implementation

## 📜 License
Distributed under the MIT License. See `LICENSE` for more information.