import fs from "fs/promises";
import path from "path";

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------

const SCHEMA_VERSION = 1;

// Public tournament ID (no env needed)
const TOURNAMENT_ID = "3dc11c01-c0f0-4e1f-93ad-0c32ded89628";
const BASE_URL = "https://api.menace.com/api/retention/tournaments";

// ---------------------------------------------------------------------------
// HELPERS (identical style to Dejen)
// ---------------------------------------------------------------------------

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
    entry?.userName ??
    entry?.player ??
    entry?.playerName ??
    entry?.nickname ??
    entry?.name ??
    entry?.player_id ??
    entry?.user?.username ??
    entry?.user?.name ??
    entry?.user ??
    fb
  );
}

// Menace uses CENTS → convert to dollars
function extractWagered(entry) {
  const centLike =
    entry?.wagered ??
    entry?.amount ??
    entry?.value ??
    entry?.score ??
    entry?.total ??
    entry?.wager ??
    entry?.points ??
    entry?.real_amount ??
    entry?.stats?.wagered ??
    entry?.totals?.wagered ??
    entry?.metrics?.wagered;

  const n = coerceNumber(centLike, 0);
  return Math.round(n) / 100;
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

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function writeJson(file, data) {
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, JSON.stringify(data, null, 2));
  console.log("✅ Wrote", file);
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

export default async function fetchMenace() {
  const url = `${BASE_URL}/${TOURNAMENT_ID}`;
  const payload = await fetchJson(url);

  if (process.env.DEBUG_FETCH) {
    await writeJson("public/data/_debug/menace-raw.json", payload);
  }

  // -------------------------------------------------------------------------
  // Find leaderboard data (defensive like Dejen)
  // -------------------------------------------------------------------------

  let leaderboardData = [];
  const dataNode = payload?.data ?? payload;

  if (Array.isArray(dataNode)) {
    leaderboardData = dataNode;
  } else if (Array.isArray(dataNode?.leaderboard)) {
    leaderboardData = dataNode.leaderboard;
  } else if (Array.isArray(dataNode?.leaders)) {
    leaderboardData = dataNode.leaders;
  } else if (Array.isArray(dataNode?.players)) {
    leaderboardData = dataNode.players;
  } else if (Array.isArray(dataNode?.entries)) {
    leaderboardData = dataNode.entries;
  } else if (Array.isArray(dataNode?.items)) {
    leaderboardData = dataNode.items;
  } else if (typeof dataNode === "object") {
    for (const v of Object.values(dataNode)) {
      if (Array.isArray(v)) {
        leaderboardData = v;
        break;
      }
    }
  }

  console.log(`📊 Menace: Found ${leaderboardData.length} leaderboard entries`);

  // -------------------------------------------------------------------------
  // Normalize rows
  // -------------------------------------------------------------------------

  const rows = leaderboardData
    .map((e, i) => ({
      rank:
        Number.isFinite(+e?.rank) && +e.rank > 0
          ? +e.rank
          : i + 1,
      username: extractUsername(e, `Player ${i + 1}`),
      wagered: extractWagered(e),
      prize: 0,
    }))
    .sort((a, b) => a.rank - b.rank);

  // Ensure minimum rows (matches Python behaviour)
  while (rows.length < 10) {
    rows.push({
      rank: rows.length + 1,
      username: "No User",
      wagered: 0,
      prize: 0,
    });
  }

  // Top 10 only
  rows.splice(10);

  // -------------------------------------------------------------------------
  // Metadata
  // -------------------------------------------------------------------------

  const startAt =
    dataNode?.startAt ??
    dataNode?.start_at ??
    null;

  const endAt =
    dataNode?.endAt ??
    dataNode?.end_at ??
    null;

  const cacheUpdatedAt =
    dataNode?.cacheUpdatedAt ??
    dataNode?.updatedAt ??
    dataNode?.updated_at ??
    dataNode?.lastUpdated ??
    dataNode?.modifiedAt ??
    null;

  const output = {
    schemaVersion: SCHEMA_VERSION,
    rows,
    prizes: [],
    metadata: {
      source: "menace",
      tournamentId: TOURNAMENT_ID,
      fetchedAt: new Date().toISOString(),
      url,
      range: { startAt, endAt },
      sourceCacheUpdatedAt: cacheUpdatedAt,
    },
  };

  await writeJson("public/data/menace-leaderboard.json", output);

  console.log(`✅ Menace: Wrote ${rows.length} rows`);
}
