# Social Network

A full-stack social networking application with a Go backend and vanilla JS frontend.

## Requirements

- [Docker](https://www.docker.com/products/docker-desktop) (with Docker Compose)

## Running with Docker

### 1. Clone the repository

```bash
git clone <repository-url>
cd social-network
```

### 2. Configure environment variables

The `.env` file in the project root is used by the backend at runtime. It is **not** baked into the Docker image.

```bash
# .env
JWT_SECRET=your-secret-key-here
```

> Change `JWT_SECRET` to a long random string before deploying.

### 3. Build the images

```bash
docker compose build
```

This builds two images:
- **social-network-backend** — Go binary compiled with `golang:1.25`, runs on a slim Debian base
- **social-network-frontend** — Nginx serving the static frontend files

### 4. Start the containers

```bash
docker compose up -d
```

The `-d` flag runs the containers in the background (detached mode).

### 5. Open the app

Visit [http://localhost:8080](http://localhost:8080) in your browser.

---

## Container Overview

```
Browser → localhost:8080
              └── frontend (nginx)
                    ├── /js/, /css/, /images/  →  served directly from web/
                    ├── /api/*                 →  proxied to backend:8080
                    ├── /ws                    →  WebSocket proxy to backend:8080
                    └── /uploads/              →  proxied to backend:8080
```

| Container | Image | Port |
|---|---|---|
| `social-network-backend` | Go + Debian slim | internal only (8080) |
| `social-network-frontend` | Nginx Alpine | host `8080` → container `80` |

The backend is **not** exposed to the host directly — all traffic goes through Nginx.

### Data persistence

The SQLite database and uploaded files are mounted as volumes, so your data persists across container restarts:

| Host path | Container path | Contents |
|---|---|---|
| `./socialnet.db` | `/app/socialnet.db` | SQLite database |
| `./uploads/` | `/app/uploads/` | User-uploaded images |

---

## Useful Commands

```bash
# View running containers and their sizes
docker ps -a --size

# View live logs from both containers
docker compose logs -f

# View logs from a specific container
docker compose logs -f backend
docker compose logs -f frontend

# Stop the containers
docker compose down

# Rebuild after code changes
docker compose build && docker compose up -d

# Rebuild a single service
docker compose build backend
docker compose up -d backend
```

---

## Project Structure

```
social-network/
├── Dockerfile              # Backend: multi-stage Go build
├── Dockerfile.frontend     # Frontend: Nginx serving web/
├── docker-compose.yml      # Orchestrates both containers
├── nginx.conf              # Nginx routing config
├── .dockerignore           # Files excluded from Docker images
├── .env                    # Environment variables (not in image)
├── main.go
├── cmd/
├── internal/
└── web/                    # Static frontend (HTML, JS, CSS)
```
