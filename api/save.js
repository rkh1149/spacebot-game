/**
 * POST /api/save
 * Upserts a save game record for a player.
 */

import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    // Ensure total_score column exists — safe no-op if already present
    await sql`ALTER TABLE save_games ADD COLUMN IF NOT EXISTS total_score INT DEFAULT 0`;

    const {
      playerId,
      currentWorld = 1,
      currentLevel = 1,
      batteries = 0,
      laserPower = 100,
      keys = [],
      playtime = 0,
      totalScore = 0
    } = req.body;

    if (!playerId) {
      return res.status(400).json({ error: 'playerId is required' });
    }

    const result = await sql`
      INSERT INTO save_games (
        player_id, current_world, current_level,
        batteries_collected, laser_power, keys_obtained,
        total_playtime_seconds, total_score, last_saved
      )
      VALUES (
        ${playerId}, ${currentWorld}, ${currentLevel},
        ${batteries}, ${laserPower}, ${keys},
        ${playtime}, ${totalScore}, NOW()
      )
      ON CONFLICT (player_id)
      DO UPDATE SET
        current_world          = EXCLUDED.current_world,
        current_level          = EXCLUDED.current_level,
        batteries_collected    = EXCLUDED.batteries_collected,
        laser_power            = EXCLUDED.laser_power,
        keys_obtained          = EXCLUDED.keys_obtained,
        total_playtime_seconds = EXCLUDED.total_playtime_seconds,
        total_score            = GREATEST(save_games.total_score, EXCLUDED.total_score),
        last_saved             = NOW()
      RETURNING *;
    `;

    return res.status(200).json({ success: true, save: result[0] });
  } catch (err) {
    console.error('Save error:', err);
    return res.status(500).json({ error: err.message });
  }
}
