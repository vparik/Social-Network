# Social Network

A full-stack social networking platform built with Go and Vue 3. Features real-time chat, groups, events, a follow system with privacy controls, and image uploads — all served through Docker with Nginx as a reverse proxy.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Running with Docker (Recommended)](#running-with-docker-recommended)
  - [Running Locally (Development)](#running-locally-development)
- [Container Overview](#container-overview)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [WebSocket Events](#websocket-events)
- [Security Considerations](#security-considerations)
- [Good Practices & Notes](#good-practices--notes)

---

## Features

### Authentication
- Register with email, password, first/last name, and date of birth
- JWT-based authentication stored in HTTP-only cookies
- CSRF protection on all state-changing endpoints
- Bcrypt password hashing
- Token revocation on logout

### User Profiles
- Public and private profile visibility modes
- Avatar upload and removal
- Nickname, bio, and date of birth fields
- Follower/following counts

### Follow System
- Follow public users instantly
- Send follow requests to private users (requires acceptance)
- Accept or decline incoming follow requests
- Unfollow at any time

### Posts & Comments
- Three privacy levels: **public**, **followers only**, **selected users**
- Image attachments on posts and comments
- Delete your own posts and comments
- Real-time feed updates via WebSocket

### Groups
- Create groups and manage members as owner
- Join groups via request or accept invitations
- Remove members (owner only)
- Leave groups at any time

### Group Posts & Events
- Members-only posts with image attachments and comments
- Group events with going/not-going voting
- Auto-notifications to group members on new events

### Private Chat
- Real-time messaging between mutual followers only
- Full conversation history
- Message received and read receipts
- Emoji picker support

### Group Chat
- Real-time group messaging for all group members
- Full message history

### Notifications
- Types: follow requests, comments, group invitations, group events
- Read/unread tracking
- Real-time push via WebSocket
- Mark all as read

### Media Uploads
- Avatar and post/comment image uploads
- Image re-encoding to strip metadata and validate format (PNG, JPG, GIF)
- 5 MB file size limit
- Automatic orphaned image cleanup (runs every 24 hours)

### User Search
- Search by first name, last name, or nickname
- In-memory cache for fast lookups (populated at startup)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Go 1.25 (`net/http` standard library) |
| Database | SQLite 3 with migration support via `gosqlitekit` |
| Authentication | JWT via `goauthlib` + bcrypt (`golang.org/x/crypto`) |
| WebSockets | `gorilla/websocket` v1.5.3 |
| Frontend | Vue 3 (Global CDN build, no build step required) |
| Styling | Vanilla CSS (modular per feature) |
| Reverse Proxy | Nginx (Alpine) |
| Containerization | Docker + Docker Compose |

---

## Project Structure

```
social-network/
├── cmd/                        # CLI entry point and flags
├── internal/
│   ├── http/
│   │   ├── server/
│   │   │   ├── server.go       # Server initialization and config
│   │   │   └── routes.go       # All route definitions
│   │   ├── handlers/           # HTTP request handlers (one file per domain)
│   │   │   ├── auth.go
│   │   │   ├── posts.go
│   │   │   ├── comments.go
│   │   │   ├── follows.go
│   │   │   ├── groups.go
│   │   │   ├── group_posts.go
│   │   │   ├── group_events.go
│   │   │   ├── events.go
│   │   │   ├── profile.go
│   │   │   ├── notifications.go
│   │   │   ├── search.go
│   │   │   ├── upload.go
│   │   │   └── chat/
│   │   └── ws/                 # WebSocket hub and real-time event handlers
│   ├── database/
│   │   ├── schema/             # 14 SQL migration files (applied in order on startup)
│   │   └── store/              # Data access layer (one file per domain)
│   ├── models/                 # Shared data structures
│   ├── memory/                 # In-memory user search cache
│   └── cleanup/                # Background orphaned image cleanup
├── web/                        # Frontend (Vue 3 SPA — no build step)
│   ├── index.html
│   ├── js/
│   │   ├── app.js              # Vue app entry point
│   │   ├── router.js           # Client-side router
│   │   ├── ws.js               # WebSocket client
│   │   ├── events.js           # Reactive event bus
│   │   ├── toast.js            # Toast notification system
│   │   ├── pages/              # LoginPage, RegisterPage, HomePage, ProfilePage, GroupsPage, GroupPage
│   │   └── components/         # Navbar, CreatePost, CommentSection, ChatSidebar, ChatBox, EmojiPicker, ...
│   └── css/                    # Modular CSS (one file per feature)
├── uploads/                    # User-uploaded files (gitignored, mounted as Docker volume)
├── docker-compose.yml
├── Dockerfile                  # Backend: multi-stage Go build
├── Dockerfile.frontend         # Frontend: Nginx Alpine image
├── nginx.conf                  # Reverse proxy routing config
├── .env                        # Environment variables (see below)
├── go.mod
└── main.go
```

---

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/) — for the recommended setup
- Go 1.25+ and SQLite3 — only needed for local development without Docker

### Environment Variables

A `.env` file is already present in the project root. Update it before running:

```env
JWT_SECRET=replace-this-with-a-long-random-secret
```

> **Important:** The default value is insecure. Generate a strong secret before running in any shared or production environment:
> ```bash
> openssl rand -hex 32
> ```

The `.env` file is loaded at runtime by the backend container. It is **not** baked into the Docker image.

### Running with Docker (Recommended)

```bash
# 1. Set a secure JWT secret
echo "JWT_SECRET=$(openssl rand -hex 32)" > .env

# 2. Build the images
docker compose build

# 3. Start the containers in the background
docker compose up -d

# 4. Open the app
open http://localhost:8080
```

**Useful commands:**

```bash
# View live logs from all containers
docker compose logs -f

# View logs from a specific container
docker compose logs -f backend
docker compose logs -f frontend

# Stop all containers
docker compose down

# Rebuild and restart a single service after code changes
docker compose build backend && docker compose up -d backend
docker compose build frontend && docker compose up -d frontend

# Rebuild everything
docker compose build && docker compose up -d

# View running containers and image sizes
docker ps -a --size
```

### Running Locally (Development)

```bash
# Install Go dependencies
go mod download

# Set the JWT secret
export JWT_SECRET="dev-secret-key"

# Run the backend (listens on :8080)
go run .
```

Then open `http://localhost:8080` in your browser. The backend serves the frontend static files automatically.

> SQLite3 must be installed on your system for the CGo driver to compile:
> - macOS: `brew install sqlite3`
> - Ubuntu/Debian: `apt-get install libsqlite3-dev`

---

## Container Overview

```
Browser → localhost:8080
              └── frontend (nginx)
                    ├── /js/, /css/, /images/  →  served directly from web/
                    ├── /api/*                 →  proxied to backend:8080
                    ├── /ws                    →  WebSocket proxy to backend:8080
                    ├── /uploads/*             →  proxied to backend:8080
                    └── /                      →  serves index.html (SPA fallback)
```

| Container | Image | Exposed Port |
|---|---|---|
| `social-network-backend` | Go binary on Debian slim | Internal only (8080) |
| `social-network-frontend` | Nginx Alpine | Host `8080` → Container `80` |

The backend is not exposed to the host directly — all traffic goes through Nginx.

### Data Persistence

The SQLite database and uploaded files are bind-mounted so data survives container restarts:

| Host path | Container path | Contents |
|---|---|---|
| `./socialnet.db` | `/app/socialnet.db` | SQLite database |
| `./uploads/` | `/app/uploads/` | User-uploaded images |

> Do **not** run `docker compose down -v` unless you intend to wipe all persistent data.

---

## API Reference

All endpoints require authentication (JWT cookie) unless marked otherwise.

### Authentication

| Method | Path | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/register` | No | Create a new account |
| `POST` | `/api/login` | No | Log in and receive JWT cookie |
| `POST` | `/api/logout` | Yes | Revoke token and clear cookie |

### Profile & Users

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/home` | Home feed |
| `GET` | `/api/profile` | Get own profile |
| `GET` | `/api/profile?id={userID}` | Get another user's profile |
| `PATCH` | `/api/profile` | Update profile fields |
| `GET` | `/api/profile/groups` | Get user's groups |
| `POST` | `/api/profile/privacy` | Toggle public/private profile |
| `GET` | `/api/users/search?q={query}` | Search users by name/nickname |

### Follow System

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/follow?id={userID}` | Follow a user |
| `DELETE` | `/api/follow?id={userID}` | Unfollow a user |
| `GET` | `/api/follow/status` | Check follow status with a user |
| `GET` | `/api/followers` | List your followers |
| `GET` | `/api/following` | List who you follow |
| `GET` | `/api/follow/requests` | Pending incoming follow requests |
| `POST` | `/api/follow/accept` | Accept a follow request |
| `DELETE` | `/api/follow/request` | Decline a follow request |

### Posts & Comments

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/posts` | Create a post |
| `GET` | `/api/posts` | Get feed posts |
| `DELETE` | `/api/posts/{id}` | Delete own post |
| `POST` | `/api/posts/{id}/comments` | Add a comment |
| `GET` | `/api/posts/{id}/comments` | Get comments on a post |
| `DELETE` | `/api/comments/{id}` | Delete own comment |

### Groups

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/groups` | Create a group |
| `GET` | `/api/groups` | List my groups and pending invites |
| `GET` | `/api/groups/{id}` | Get group details |
| `GET` | `/api/groups/{id}/members` | List group members |
| `POST` | `/api/groups/{id}/join` | Request to join a group |
| `DELETE` | `/api/groups/{id}/members` | Leave the group |
| `DELETE` | `/api/groups/{id}/members/{userID}` | Remove a member (owner only) |
| `POST` | `/api/groups/{id}/invite` | Invite a user to the group |
| `GET` | `/api/groups/{id}/requests` | Get pending join requests |
| `POST` | `/api/groups/{id}/requests/{userID}/accept` | Accept a join request |
| `DELETE` | `/api/groups/{id}/requests/{userID}` | Decline a join request |
| `POST` | `/api/groups/{id}/invites/accept` | Accept a group invitation |
| `DELETE` | `/api/groups/{id}/invites` | Decline a group invitation |
| `GET` | `/api/groups/invites` | List my pending group invitations |

### Group Posts & Comments

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/groups/{id}/posts` | Create a group post |
| `GET` | `/api/groups/{id}/posts` | List group posts |
| `DELETE` | `/api/groups/{id}/posts/{postID}` | Delete a group post |
| `POST` | `/api/groups/{id}/posts/{postID}/comments` | Add a comment |
| `GET` | `/api/groups/{id}/posts/{postID}/comments` | Get comments |
| `DELETE` | `/api/groups/{id}/comments/{commentID}` | Delete a comment |

### Group Events

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/groups/{id}/events` | Create a group event |
| `GET` | `/api/groups/{id}/events` | List group events |
| `POST` | `/api/groups/{id}/events/{eventID}/vote` | Vote going/not going |

### Personal Events

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/events` | Create a personal event |
| `GET` | `/api/events` | List events you created or were invited to |

### Chat & Messaging

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/chat/users` | List users you can chat with (mutual followers) |
| `GET` | `/api/messages?userId={id}` | Load conversation history |
| `GET` | `/api/groups/{id}/messages` | Load group chat history |
| `GET` | `/ws` | Upgrade to WebSocket for real-time events |

### Notifications

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/notifications` | Get notifications with unread count |
| `POST` | `/api/notifications/read-all` | Mark all notifications as read |

### Uploads

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/upload/avatar/temp` | Upload avatar temporarily |
| `POST` | `/api/upload/avatar/confirm` | Confirm and persist temp avatar |
| `POST` | `/api/upload/avatar` | Direct avatar upload |
| `DELETE` | `/api/upload/avatar` | Remove avatar |
| `POST` | `/api/upload/image` | Upload post or comment image |

---

## Database Schema

Migrations in `internal/database/schema/` are applied automatically on startup in numerical order. Foreign key constraints are enabled with cascading deletes.

| Table | Purpose |
|---|---|
| `users` | Accounts: email, password hash, profile fields, privacy flag |
| `tokens` | JWT revocation list |
| `posts` | Posts with privacy level (public / selected / private) |
| `post_allowed_users` | ACL for posts with "selected users" privacy |
| `comments` | Comments on posts |
| `follows` | Active follow relationships |
| `follow_requests` | Pending follow requests for private users |
| `messages` | Private direct messages (with sent/received/read timestamps) |
| `notifications` | User notifications with read/unread status |
| `groups` | Groups with owner reference |
| `group_members` | Group membership |
| `group_requests` | Join requests and invitations |
| `group_posts` | Posts scoped to a group |
| `group_comments` | Comments on group posts |
| `group_messages` | Group chat messages |
| `events` | Personal and group events (`group_id` is optional) |
| `status` | RSVP votes for personal events (GOING / NOT-GOING) |
| `group_event_votes` | Going/not-going votes for group events |

---

## WebSocket Events

A single persistent WebSocket connection at `/ws` handles all real-time communication.

| Event | Direction | Description |
|---|---|---|
| `chat_message` | Bidirectional | Private message sent/received |
| `chat_received` | Server → Client | Delivery acknowledgment |
| `chat_read` | Server → Client | Read receipt |
| `group_message` | Bidirectional | Group chat message |
| `notification` | Server → Client | New notification pushed |
| `post_created` | Server → Client | New post appears in feed |
| `post_deleted` | Server → Client | Post removed from feed |
| `comment_created` | Server → Client | New comment on a post |
| `follow_request` | Server → Client | Incoming follow request |
| `follow_accepted` | Server → Client | Follow request was accepted |
| `privacy_changed` | Server → Client | User changed their privacy setting |
| `group_event` | Server → Client | New group event created |

---

## Security Considerations

### Required Before Any Shared or Production Deployment

- **Change `JWT_SECRET`:** The current default is insecure. Set a cryptographically random value:
  ```bash
  openssl rand -hex 32
  ```
- **Enable HTTPS and set `Secure` on cookies:** Update `Secure: false` to `Secure: true` in `internal/http/server/server.go` and terminate TLS at the Nginx level.
- **Restrict WebSocket origin:** The WebSocket upgrader currently accepts any origin. Restrict `CheckOrigin` to your domain in `internal/http/ws/ws.go`.

### Already Handled

- Passwords hashed with bcrypt (cost 10)
- CSRF token validation on all `POST`, `PATCH`, and `DELETE` endpoints
- Image uploads re-encoded through Go's image codecs (strips EXIF metadata, validates format)
- JWT tokens revoked in the database on logout
- All SQL queries use parameterized statements (no string concatenation)
- Foreign key constraints prevent orphaned data
- File upload size enforced at 5 MB
- Post and comment visibility enforced server-side — privacy is not just a UI concern

---

## Good Practices & Notes

### Post Privacy Model

| Level | Who can see it |
|---|---|
| `public` | Everyone |
| `selected` | Only followers of the post author |
| `private` | Only users explicitly listed in `post_allowed_users` |

Privacy is enforced at the database query level on every request.

### Chat Access Control

Only users who mutually follow each other can open or view a private chat. This is enforced server-side on both the REST endpoint (`GET /api/chat/users`) and the WebSocket message handler.

### In-Memory Search Cache

The user search cache is built from the database at server startup. New users are added when they register; name and nickname changes update the cache immediately. The cache is rebuilt automatically on restart — no manual intervention needed.

### Image Cleanup

A background goroutine runs every 24 hours and deletes post images from disk that are no longer referenced in the database. Avatars are managed explicitly on upload and deletion and are not part of this sweep.

### Frontend Architecture

The frontend is a Vue 3 SPA using the Global CDN build — no Node.js, no `npm install`, no build step. Client-side routing covers `/login`, `/register`, `/`, `/profile`, `/groups`, and `/group`. Cross-component state is coordinated through a reactive event bus (`web/js/events.js`).

### Rebuilding After Code Changes

```bash
# Backend only
docker compose build backend && docker compose up -d backend

# Frontend only
docker compose build frontend && docker compose up -d frontend

# Both
docker compose build && docker compose up -d
```

---

## Authors

Thanos Ziagakis

Thanos Diridis

Andreas-Rafail Andrikopoulos

Vasileios Parikoglou
