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
-- Phase B (Sep 2026): push notifications and community prices
ALTER TABLE ops ADD COLUMN share_prices INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN push_prefs TEXT;
CREATE TABLE IF NOT EXISTS push_subs (endpoint TEXT PRIMARY KEY, user_id TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL, ua TEXT, created INTEGER NOT NULL, last_ok INTEGER);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subs(user_id);
CREATE TABLE IF NOT EXISTS price_reports (id TEXT PRIMARY KEY, code TEXT NOT NULL, price REAL NOT NULL, date TEXT NOT NULL, op_id TEXT NOT NULL, created INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_pr_code ON price_reports(code, date);
-- Phase C (Sep 2026): referrals
ALTER TABLE users ADD COLUMN referred_by TEXT;
ALTER TABLE users ADD COLUMN referral_credits INTEGER NOT NULL DEFAULT 0;
