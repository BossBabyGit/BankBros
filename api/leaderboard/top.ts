// api/leaderboard/top.ts
import type { VercelRequest, VercelResponse } from '../../lib/vercel-types';
import { ensureSchema, getTop15ForCurrentPeriod } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // --- CORS (must be INSIDE the handler) ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    await ensureSchema(); // ensure table exists
    const rows = await getTop15ForCurrentPeriod();

    // 60s edge cache (optional)
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');

    return res.status(200).json({ items: rows });
  } catch (e: any) {
    console.error('leaderboard/top error:', e);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
