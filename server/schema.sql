-- Run this once to set up your database
-- In Render: connect to your PostgreSQL instance and run this SQL

CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  username    TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,          -- bcrypt hash
  is_admin    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saves (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  character   JSONB NOT NULL DEFAULT '{}',
  messages    JSONB NOT NULL DEFAULT '[]',
  display_log JSONB NOT NULL DEFAULT '[]',
  mood        TEXT DEFAULT 'mysterious',
  options     JSONB NOT NULL DEFAULT '[]',
  scene       TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Insert your admin account (change username/password before running)
-- Password here is "changeme" — update immediately after first login
INSERT INTO users (username, password, is_admin)
VALUES ('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', TRUE)
ON CONFLICT DO NOTHING;
