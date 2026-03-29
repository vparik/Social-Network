CREATE TABLE IF NOT EXISTS group_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id    INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    title       TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    event_at    INTEGER NOT NULL,
    created_at  INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_group_events_group ON group_events(group_id);

-- option: 'going' | 'not_going'
CREATE TABLE IF NOT EXISTS group_event_votes (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL REFERENCES group_events(id) ON DELETE CASCADE,
    user_id  INTEGER NOT NULL REFERENCES users(id)        ON DELETE CASCADE,
    option   TEXT    NOT NULL CHECK(option IN ('going', 'not_going')),
    voted_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_event_votes_event ON group_event_votes(event_id);
