CREATE TABLE IF NOT EXISTS groups (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    created_at  INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_groups_owner ON groups(owner_id);

CREATE TABLE IF NOT EXISTS group_members (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id   INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    joined_at  INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user  ON group_members(user_id);

-- type: 'join_request' (user asked to join) | 'invite' (member invited someone)
CREATE TABLE IF NOT EXISTS group_requests (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id   INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    type       TEXT    NOT NULL CHECK(type IN ('join_request', 'invite')),
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    UNIQUE(group_id, user_id, type)
);

CREATE INDEX IF NOT EXISTS idx_group_requests_group ON group_requests(group_id);
CREATE INDEX IF NOT EXISTS idx_group_requests_user  ON group_requests(user_id);
