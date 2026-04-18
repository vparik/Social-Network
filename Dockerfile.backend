# ---- Build stage ----
FROM golang:1.25 AS builder

WORKDIR /app

# Download dependencies first (cached layer if go.mod/go.sum unchanged)
COPY go.mod go.sum ./
RUN go mod download

# Copy all source code and build
COPY . .
RUN CGO_ENABLED=1 GOOS=linux go build -o socialnet .

# ---- Runtime stage ----
FROM debian:bookworm-slim

# sqlite3 shared library required by go-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends \
    sqlite3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the compiled binary from builder
COPY --from=builder /app/socialnet .

# Copy database schema so InitDb() can run migrations on startup
COPY --from=builder /app/internal/database/schema ./internal/database/schema

# Create uploads directory (will be overridden by volume mount in compose)
RUN mkdir -p uploads

EXPOSE 8080

CMD ["./socialnet"]
