/**
 * GET /api/leaderboard
 * Returns top 10 pilots ranked by all-time high score.
 */

import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    // Ensure total_score column exists — safe no-op if already present
    await sql`ALTER TABLE save_games ADD COLUMN IF NOT EXISTS total_score INT DEFAULT 0`;

    const rows = await sql`
      SELECT
        p.username,
        s.total_score,
        s.current_world
      FROM save_games s
      JOIN players p ON p.id = s.player_id
      WHERE s.total_score > 0
      ORDER BY s.total_score DESC
      LIMIT 10
    `;

    return res.status(200).json({ leaderboard: rows });
  } catch (err) {
    console.error('Leaderboard error:', err);
    return res.status(500).json({ error: err.message });
  }
}
