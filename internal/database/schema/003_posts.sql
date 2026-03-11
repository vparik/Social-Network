CREATE TABLE IF NOT EXISTS posts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    title       TEXT NOT NULL,
    content    TEXT    NOT NULL,
    privacy    TEXT    NOT NULL DEFAULT "public"
                       CHECK (privacy IN ('public','selected', 'private')),
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
)