CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  endpoint TEXT UNIQUE NOT NULL,
  subscription TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  last_slot TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
