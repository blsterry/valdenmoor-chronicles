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

-- NPC relationship + memory persistence per player
CREATE TABLE IF NOT EXISTS npc_states (
  id                 SERIAL PRIMARY KEY,
  user_id            INTEGER REFERENCES users(id) ON DELETE CASCADE,
  npc_id             TEXT NOT NULL,
  relationship       INTEGER DEFAULT 0,        -- -100 to +100
  interaction_count  INTEGER DEFAULT 0,
  memory             JSONB NOT NULL DEFAULT '[]',   -- last 8 { day, summary } entries
  teaching_progress  JSONB NOT NULL DEFAULT '{}',   -- { "spell_id": { stage:N, tasks_done:N } }
  flags              JSONB NOT NULL DEFAULT '{}',
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, npc_id)
);

-- Game event log: tracks every meaningful action with game-time for NPC memory, timed events, needs
CREATE TABLE IF NOT EXISTS game_events (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  game_time   INTEGER NOT NULL,        -- game minutes from start (0 = Day 1, 18:00)
  event_type  TEXT NOT NULL,           -- 'npc_interaction'|'location_entered'|'item_acquired'|'combat'|'rest'|'quest'|'timed_event'|'travel'|'general'
  location    TEXT,
  npc_id      TEXT,
  description TEXT NOT NULL,
  flags       JSONB DEFAULT '{}',      -- { expires_at_game_time, quest_id, completed, ... }
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Insert your admin account (change username/password before running)
-- Password here is "changeme" — update immediately after first login
INSERT INTO users (username, password, is_admin)
VALUES ('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', TRUE)
ON CONFLICT DO NOTHING;
