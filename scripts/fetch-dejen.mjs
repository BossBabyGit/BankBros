import fs from "fs/promises";
import path from "path";
import process from "process";

const SCHEMA_VERSION = 1;

function coerceNumber(v, fb = 0) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : fb;
  }
  return fb;
}

function extractUsername(entry, fb = "Player") {
  return (
    entry?.username ??
    entry?.user?.username ??
    entry?.user ??
    entry?.name ??
    entry?.player ??
    entry?.displayName ??
    fb
  );
}

// Try a bunch of common keys Dejen might use for volume.
function extractWagered(entry) {
  // integers representing cents/lowest unit we divide by 100
  const centLike =
    entry?.wager_total ??
    entry?.wagered_cents ??
    entry?.wageredCents ??
    entry?.total_wagered_cents ??
    entry?.totalWageredCents;

  if (centLike != null) {
    const n = coerceNumber(centLike, 0);
    return Math.round(n) / 100;
  }

  // numbers already in dollars
  const direct =
    entry?.wagered ??
    entry?.total_wagered ??
    entry?.totalWagered ??
    entry?.totalAmount ??
    entry?.amount ??
    entry?.value ??
    entry?.total ??
    entry?.points ??
    entry?.volume;

  return coerceNumber(direct, 0);
}

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  const txt = await res.text();
  let json = null;
  try { json = JSON.parse(txt); } catch {}
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} – ${url} – ${txt?.slice?.(0,200)}`);
  }
  return json ?? {};
}

async function ensureDir(p) { await fs.mkdir(p, { recursive: true }); }

async function writeJson(file, data) {
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, JSON.stringify(data, null, 2));
  console.log("✅ Wrote", file);
}

export default async function fetchDejen() {
  const raceId = process.env.DEJEN_RACE_ID;
  if (!raceId) throw new Error("DEJEN_RACE_ID is not set");

  const base = "https://api.dejen.com";

  // Metadata (prizes etc.)
  const metaUrl = `${base}/races/${raceId}`;
  const meta = await fetchJson(metaUrl);

  // Leaderboard rows - THIS IS THE KEY FIX
  // The leaderboard endpoint returns the actual player data
  const lbUrl = `${base}/races/${raceId}/leaderboard`;
  const lbResponse = await fetchJson(lbUrl);

  if (process.env.DEBUG_FETCH) {
    await writeJson("public/data/_debug/dejen-meta.json", meta);
    await writeJson("public/data/_debug/dejen-lb.json", lbResponse);
  }

  // Handle different possible response structures
  let leaderboardData = [];
  
  if (Array.isArray(lbResponse)) {
    leaderboardData = lbResponse;
  } else if (Array.isArray(lbResponse?.leaderboard)) {
    leaderboardData = lbResponse.leaderboard;
  } else if (Array.isArray(lbResponse?.data)) {
    leaderboardData = lbResponse.data;
  } else if (lbResponse?.entries && Array.isArray(lbResponse.entries)) {
    leaderboardData = lbResponse.entries;
  }

  console.log(`📊 Dejen: Found ${leaderboardData.length} leaderboard entries`);

  const rows = leaderboardData
    .map((e, i) => ({
      rank: Number.isFinite(+e?.rank) && +e.rank > 0 ? +e.rank : i + 1,
      username: extractUsername(e, `Player ${i + 1}`),
      wagered: extractWagered(e),
      prize: 0,
    }))
    .sort((a, b) => a.rank - b.rank);

  const prizes = Array.isArray(meta?.prizes)
    ? meta.prizes
        .map(p => ({ rank: coerceNumber(p?.rank, NaN), amount: coerceNumber(p?.amount, 0) }))
        .filter(p => Number.isFinite(p.rank) && p.rank > 0)
        .sort((a, b) => a.rank - b.rank)
    : [];

  // attach prize by rank
  if (prizes.length && rows.length) {
    const byRank = new Map(prizes.map(p => [p.rank, p.amount]));
    for (const r of rows) if (byRank.has(r.rank)) r.prize = byRank.get(r.rank);
  }

  const output = {
    schemaVersion: SCHEMA_VERSION,
    rows,
    prizes,
    metadata: {
      source: "dejen",
      raceId,
      fetchedAt: new Date().toISOString(),
      url: lbUrl,
      raceInfo: {
        displayName: meta?.display_name,
        status: meta?.status,
        startTime: meta?.start_time,
        endTime: meta?.end_time,
      }
    },
  };

  await writeJson("public/data/dejen-leaderboard.json", output);
  
  console.log(`✅ Dejen: Wrote ${rows.length} rows with ${prizes.length} prizes`);
}
