CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    first_name    TEXT    NOT NULL,
    last_name     TEXT    NOT NULL,
    date_of_birth TEXT    NOT NULL,
    avatar_path   TEXT,
    nickname      TEXT,
    about_me      TEXT,
    role          TEXT    NOT NULL DEFAULT 'user',
    is_public     INTEGER NOT NULL DEFAULT 1,
    created_at    INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);