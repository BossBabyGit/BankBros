import type { VercelRequest, VercelResponse } from '../../lib/vercel-types';
import { ensureSchema, upsertEntry } from '../../lib/db';

// Fixed periods instead of calculated ones
function getPeriods() {
  return {
    current: {
      startISO: '2025-09-25T00:00:00.000Z',
      endISO:   '2025-10-10T00:00:00.000Z',
    },
    previous: {
      startISO: '2025-09-10T00:00:00.000Z',
      endISO:   '2025-09-25T00:00:00.000Z',
    },
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    await ensureSchema();

    const base   = process.env.ROOBET_BASE_URL!;
    const token  = process.env.ROOBET_BEARER!;
    const userId = process.env.ROOBET_USER_ID!;
    if (!base || !token || !userId) throw new Error('Missing env vars');

    const { current, previous } = getPeriods();

    // Only slots + provably fair (explicitly exclude dice to be safe)
    const CATEGORY_FILTER = 'slots,provably fair,-dice';

    async function fetchAndSave(range: { startISO: string; endISO: string }) {
      const url = new URL('/affiliate/v2/stats', base);
      url.searchParams.set('userId', userId);
      url.searchParams.set('startDate', range.startISO);
      url.searchParams.set('endDate', range.endISO);
      url.searchParams.set('categories', CATEGORY_FILTER);

      const r = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!r.ok) {
        const t = await r.text();
        throw new Error(`Upstream error: ${t}`);
      }

      type Row = {
        uid: string;
        username: string;
        wagered: number;
        weightedWagered: number;
      };

      const data: Row[] = await r.json();

      const top = (data ?? [])
        .sort((a, b) => (b.weightedWagered || 0) - (a.weightedWagered || 0))
        .slice(0, 15);

      let rank = 1;
      for (const row of top) {
        await upsertEntry({
          period_start: range.startISO,
          period_end: range.endISO,
          uid: row.uid,
          username: row.username,
          wagered: Number(row.weightedWagered || 0), // uses weighted for leaderboard
          rank,
        });
        rank++;
      }

      return top.length;
    }

    const savedCurrent = await fetchAndSave(current);
    const savedPrevious = await fetchAndSave(previous);

    return res.status(200).json({ ok: true, savedCurrent, savedPrevious });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
