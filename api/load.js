/**
 * GET /api/load?playerId=...
 * Returns the most recent save for a player.
 */

import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sql = neon(process.env.DATABASE_URL);
  const { playerId } = req.query;

  if (!playerId) {
    return res.status(400).json({ error: 'playerId is required' });
  }

  try {
    const result = await sql`
      SELECT * FROM save_games WHERE player_id = ${playerId} LIMIT 1;
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: 'No save found' });
    }

    return res.status(200).json({ save: result[0] });
  } catch (err) {
    console.error('Load error:', err);
    return res.status(500).json({ error: err.message });
  }
}
