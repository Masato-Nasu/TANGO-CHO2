CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  endpoint TEXT UNIQUE NOT NULL,
  subscription TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  last_slot TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schedules (
  subscription_id TEXT PRIMARY KEY,
  times TEXT NOT NULL
);
-- Preserve the original default schedule for pre-existing subscriptions.
INSERT OR IGNORE INTO schedules (subscription_id, times)
SELECT id, '["08:45","18:15"]' FROM subscriptions;
