import type { VercelRequest, VercelResponse } from '../../lib/vercel-types';
import { ensureSchema, upsertEntry } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // --- CORS handling ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { period_start, period_end, items } = req.body || {};
    if (!period_start || !period_end || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid body' });
    }

    await ensureSchema();

    let saved = 0;
    for (const entry of items) {
      if (!entry || !entry.uid) continue;
      await upsertEntry({
        period_start,
        period_end,
        uid: entry.uid,
        username: entry.username || '',
        wagered: Number(entry.wagered || 0),
        rank: Number(entry.rank || 0),
      });
      saved++;
    }

    return res.status(200).json({ ok: true, saved });
  } catch (e: any) {
    console.error('leaderboard/save error:', e);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
