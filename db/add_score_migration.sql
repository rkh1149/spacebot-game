-- Migration: add total_score to save_games
-- Run this once in the Neon SQL console (Dashboard → SQL Editor)
ALTER TABLE save_games ADD COLUMN IF NOT EXISTS total_score INT DEFAULT 0;
