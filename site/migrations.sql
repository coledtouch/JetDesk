-- Additive migrations for databases created before each change. Safe to re-run
-- statement by statement; SQLite refuses a duplicate column, which is the signal to skip it.

-- 2026-09-01 phase 1: password reset, lifecycle notices, email change, metrics
ALTER TABLE users ADD COLUMN reset_code TEXT;
ALTER TABLE users ADD COLUMN reset_exp INTEGER;
ALTER TABLE users ADD COLUMN last_seen INTEGER;
ALTER TABLE users ADD COLUMN notices TEXT;
ALTER TABLE users ADD COLUMN pending_email TEXT;
ALTER TABLE users ADD COLUMN pending_code TEXT;
ALTER TABLE users ADD COLUMN pending_exp INTEGER;
CREATE TABLE IF NOT EXISTS rate_limits (k TEXT PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0, exp INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS events (day TEXT NOT NULL, kind TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, kind));
