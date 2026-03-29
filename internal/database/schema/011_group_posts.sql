CREATE TABLE IF NOT EXISTS group_posts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id   INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    title      TEXT    NOT NULL,
    content    TEXT    NOT NULL,
    image_url  TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_group_posts_group ON group_posts(group_id);

CREATE TABLE IF NOT EXISTS group_comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id    INTEGER NOT NULL REFERENCES group_posts(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
    content    TEXT    NOT NULL,
    image_url  TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_group_comments_post ON group_comments(post_id);
