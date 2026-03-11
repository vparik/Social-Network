CREATE  status {
    id  INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER  REFERENCES users(id)   ON DELETE CASCADE,
    event_id   INTEGER REFERENCES events (id) ON DELETE CASCADE,
    status      TEXT  CHECK (status IN ('GOING', 'NOT-GOING'))
}