-- Drop redundant group_events tables created in 012 (events table handles group events)
DROP TABLE IF EXISTS group_event_votes;
DROP TABLE IF EXISTS group_events;

-- Link events to their group
ALTER TABLE events ADD COLUMN group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_events_group ON events(group_id);
