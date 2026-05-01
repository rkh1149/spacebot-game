/**
 * POST /api/player
 * Creates a new player record. Returns existing player if username matches.
 *
 * Body: { username }
 */

import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sql = neon(process.env.DATABASE_URL);
  const { username } = req.body;

  if (!username || username.length < 2 || username.length > 50) {
    return res.status(400).json({ error: 'Username must be 2-50 characters' });
  }

  try {
    // Try to find existing player first
    const existing = await sql`
      SELECT * FROM players WHERE username = ${username} LIMIT 1;
    `;

    if (existing.length > 0) {
      return res.status(200).json({ player: existing[0], existing: true });
    }

    // Create new
    const result = await sql`
      INSERT INTO players (username) VALUES (${username}) RETURNING *;
    `;

    return res.status(201).json({ player: result[0], existing: false });
  } catch (err) {
    console.error('Player create error:', err);
    return res.status(500).json({ error: err.message });
  }
}
