-- D1 schema for Worker API (SQLite)
-- Listings snapshot (synced from pipeline)
CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  address TEXT,
  area TEXT,
  url TEXT,
  price REAL,
  currency TEXT DEFAULT 'USD',
  recorded_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_listings_recorded_at ON listings(recorded_at);
CREATE INDEX IF NOT EXISTS idx_listings_area ON listings(area);
CREATE INDEX IF NOT EXISTS idx_listings_source ON listings(source);

-- Price history for charts (one row per listing per day)
CREATE TABLE IF NOT EXISTS price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL,
  source TEXT NOT NULL,
  area TEXT,
  price REAL,
  recorded_at TEXT NOT NULL,
  UNIQUE(source_id, source, recorded_at)
);

CREATE INDEX IF NOT EXISTS idx_price_history_recorded ON price_history(recorded_at);
CREATE INDEX IF NOT EXISTS idx_price_history_area ON price_history(area);
