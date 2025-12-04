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

// Extract wagered — handle cents-style fields and direct dollar/number fields
function extractWagered(entry) {
  // Common cent-like fields
  const centLike =
    entry?.wager_total ??
    entry?.wagered_cents ??
    entry?.wageredCents ??
    entry?.total_wagered_cents ??
    entry?.totalWageredCents ??
    entry?.amount_cents ??
    entry?.amountCents;

  if (centLike != null) {
    const n = coerceNumber(centLike, 0);
    // convert cents to dollars (or base units)
    return Math.round(n) / 100;
  }

  // direct numeric fields (already in base currency)
  const direct =
    entry?.wagered ??
    entry?.wager ??
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

export default async function fetchCsBattle() {
  // You can set CSBATTLE_LEADERBOARD_URL in your secrets or env.
  // If not set, fallback to the URL you provided in the request.
  const lbUrl =
    process.env.CSBATTLE_LEADERBOARD_URL ??
    "https://api.csbattle.com/leaderboards/affiliates/9f38c248-ff26-493e-ae4e-20f82a20ccf1?from=2025-01-12%2000:00:00&to=2036-01-02%2023:59:59";

  console.log("🔎 Fetching CSBattle leaderboard from", lbUrl);

  const lbResponse = await fetchJson(lbUrl, {
    headers: {
      // if you have an API key for csbattle, set it in CSBATTLE_API_KEY
      ...(process.env.CSBATTLE_API_KEY ? { Authorization: `Bearer ${process.env.CSBATTLE_API_KEY}` } : {}),
    },
  });

  if (process.env.DEBUG_FETCH) {
    await writeJson("public/data/_debug/csbattle-lb.json", lbResponse);
  }

  // Normalize possible response shapes
  let leaderboardData = [];

  // common shapes: array directly, or object with leaderboard/data/entries rows
  if (Array.isArray(lbResponse)) {
    leaderboardData = lbResponse;
  } else if (Array.isArray(lbResponse?.leaderboard)) {
    leaderboardData = lbResponse.leaderboard;
  } else if (Array.isArray(lbResponse?.data)) {
    leaderboardData = lbResponse.data;
  } else if (Array.isArray(lbResponse?.entries)) {
    leaderboardData = lbResponse.entries;
  } else if (Array.isArray(lbResponse?.rows)) {
    leaderboardData = lbResponse.rows;
  } else if (Array.isArray(lbResponse?.result)) {
    leaderboardData = lbResponse.result;
  } else if (Array.isArray(lbResponse?.response?.data)) {
    leaderboardData = lbResponse.response.data;
  } else {
    // try to detect any array nested one level deep
    const firstArray = Object.values(lbResponse).find(v => Array.isArray(v));
    if (firstArray) leaderboardData = firstArray;
  }

  console.log(`📊 CsBattle: Found ${leaderboardData.length} leaderboard entries`);

  const rows = leaderboardData
    .map((e, i) => ({
      rank: Number.isFinite(+e?.rank) && +e.rank > 0 ? +e.rank : i + 1,
      username: extractUsername(e, `Player ${i + 1}`),
      wagered: extractWagered(e),
      prize: 0,
      // keep raw for debugging/reference
      raw: process.env.DEBUG_FETCH ? e : undefined,
    }))
    .sort((a, b) => a.rank - b.rank);

  // Try to extract prizes from the response if present in various shapes
  let prizes = [];
  const maybePrizes =
    lbResponse?.prizes ??
    lbResponse?.prize_tiers ??
    lbResponse?.prizeTiers ??
    lbResponse?.metadata?.prizes ??
    lbResponse?.meta?.prizes ??
    lbResponse?.race?.prizes ??
    lbResponse?.data?.prizes;

  if (Array.isArray(maybePrizes) && maybePrizes.length) {
    prizes = maybePrizes
      .map(p => ({
        rank: coerceNumber(p?.rank ?? p?.position ?? p?.place, NaN),
        amount: (() => {
          const centLike = p?.amount_cents ?? p?.amountCents ?? p?.value_cents ?? p?.valueCents;
          if (centLike != null) return coerceNumber(centLike, 0) / 100;
          return coerceNumber(p?.amount ?? p?.value ?? p?.price ?? p?.payout, 0);
        })(),
      }))
      .filter(p => Number.isFinite(p.rank) && p.rank > 0)
      .sort((a, b) => a.rank - b.rank);
  }

  console.log(`💰 CsBattle: Processed ${prizes.length} prize tiers`);

  // attach prize by rank if available
  if (prizes.length && rows.length) {
    const byRank = new Map(prizes.map(p => [p.rank, p.amount]));
    for (const r of rows) {
      if (byRank.has(r.rank)) r.prize = byRank.get(r.rank);
    }
  }

  const output = {
    schemaVersion: SCHEMA_VERSION,
    rows,
    prizes,
    metadata: {
      source: "csbattle",
      fetchedAt: new Date().toISOString(),
      url: lbUrl,
      rawResponseShape: {
        topKeys: Array.isArray(lbResponse) ? ["array"] : Object.keys(lbResponse ?? {}).slice(0, 20)
      }
    }
  };

  await writeJson("public/data/csbattle-leaderboard.json", output);

  console.log(`✅ CsBattle: Wrote ${rows.length} rows with ${prizes.length} prizes`);
}
