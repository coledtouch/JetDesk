CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  pw_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created INTEGER NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0,
  verify_code TEXT,
  verify_exp INTEGER,
  plan TEXT NOT NULL DEFAULT 'free',
  plan_until INTEGER,
  trial_until INTEGER,
  stripe_customer TEXT,
  stripe_sub TEXT,
  sub_interval TEXT,
  home_base TEXT,
  tail TEXT,
  op_id TEXT,
  reset_code TEXT,
  reset_exp INTEGER,
  last_seen INTEGER,
  notices TEXT,
  pending_email TEXT,
  pending_code TEXT,
  pending_exp INTEGER,
  push_prefs TEXT,
  referred_by TEXT,
  referral_credits INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created INTEGER NOT NULL,
  expires INTEGER NOT NULL,
  ua TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS ops (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  created INTEGER NOT NULL,
  share_prices INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS op_members (
  op_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  added INTEGER NOT NULL,
  PRIMARY KEY (op_id, email)
);
CREATE INDEX IF NOT EXISTS idx_members_email ON op_members(email);

CREATE TABLE IF NOT EXISTS rate_limits (
  k TEXT PRIMARY KEY,
  n INTEGER NOT NULL DEFAULT 0,
  exp INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  day TEXT NOT NULL,
  kind TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, kind)
);
CREATE TABLE IF NOT EXISTS push_subs (
  endpoint TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  ua TEXT,
  created INTEGER NOT NULL,
  last_ok INTEGER
);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subs(user_id);
CREATE TABLE IF NOT EXISTS price_reports (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  price REAL NOT NULL,
  date TEXT NOT NULL,
  op_id TEXT NOT NULL,
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pr_code ON price_reports(code, date);
