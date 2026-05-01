-- Space Bot - Database Schema
-- Run this once in your Neon SQL editor or via psql to set up the tables.

CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS save_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  current_world INT DEFAULT 1,
  current_level INT DEFAULT 1,
  batteries_collected INT DEFAULT 0,
  laser_power INT DEFAULT 100,
  keys_obtained TEXT[] DEFAULT '{}',
  total_playtime_seconds INT DEFAULT 0,
  last_saved TIMESTAMP DEFAULT NOW(),
  UNIQUE(player_id)
);

CREATE INDEX IF NOT EXISTS idx_save_games_player ON save_games(player_id);
CREATE INDEX IF NOT EXISTS idx_players_username ON players(username);
