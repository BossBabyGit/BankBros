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

// Extract wager — support direct 'wager' field and other fallbacks.
// If cents-like fields appear, we convert them to base units by dividing by 100.
function extractWagered(entry) {
  if (!entry) return 0;

  // explicit CSBattle shape uses `wager` (already base units)
  if (entry?.wager != null) return coerceNumber(entry.wager, 0);

  // common cent-like fields (unlikely for your sample, but kept defensively)
  const centLike =
    entry?.wager_total ??
    entry?.wagered_cents ??
    entry?.wageredCents ??
    entry?.amount_cents ??
    entry?.amountCents;
  if (centLike != null) return coerceNumber(centLike, 0) / 100;

  // general fallbacks
  const direct =
    entry?.wagered ??
    entry?.wager_amount ??
    entry?.total_wagered ??
    entry?.totalAmount ??
    entry?.amount ??
    entry?.value;
  return coerceNumber(direct, 0);
}

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  const txt = await res.text();
  let json = null;
  try { json = JSON.parse(txt); } catch (e) {
    // still throw with helpful message
  }
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
  const lbUrl =
    process.env.CSBATTLE_LEADERBOARD_URL ??
    "https://api.csbattle.com/leaderboards/affiliates/9f38c248-ff26-493e-ae4e-20f82a20ccf1?from=2025-01-12%2000:00:00&to=2036-01-02%2023:59:59";

  console.log("🔎 Fetching CSBattle leaderboard from", lbUrl);

  const lbResponse = await fetchJson(lbUrl, {
    headers: {
      ...(process.env.CSBATTLE_API_KEY ? { Authorization: `Bearer ${process.env.CSBATTLE_API_KEY}` } : {}),
      "Accept": "application/json",
    },
  });

  if (process.env.DEBUG_FETCH) {
    await writeJson("public/data/_debug/csbattle-raw.json", lbResponse);
  }

  // ----- Prefer explicit CSBattle shape first -----
  let leaderboardData = [];

  if (Array.isArray(lbResponse?.users)) {
    leaderboardData = lbResponse.users;
  } else if (Array.isArray(lbResponse)) {
    leaderboardData = lbResponse;
  } else if (Array.isArray(lbResponse?.leaderboard)) {
    leaderboardData = lbResponse.leaderboard;
  } else if (Array.isArray(lbResponse?.data)) {
    leaderboardData = lbResponse.data;
  } else if (Array.isArray(lbResponse?.entries)) {
    leaderboardData = lbResponse.entries;
  } else {
    // try to detect any array nested one level deep
    const firstArray = Object.values(lbResponse ?? {}).find(v => Array.isArray(v));
    if (firstArray) leaderboardData = firstArray;
  }

  console.log(`📊 CsBattle: Found ${leaderboardData.length} leaderboard entries`);

  const rows = leaderboardData
    .map((e, i) => {
      const rank = Number.isFinite(+e?.rank) && +e.rank > 0 ? +e.rank : i + 1;
      const username = extractUsername(e, `Player ${i + 1}`);
      const wagered = extractWagered(e);
      const row = {
        rank,
        username,
        wagered,
        prize: 0,
      };
      if (process.env.DEBUG_FETCH) row.raw = e;
      return row;
    })
    .sort((a, b) => a.rank - b.rank);

  // Prizes: CSBattle example didn't include prizes — keep defensive logic
  let prizes = [];
  const maybePrizes =
    lbResponse?.prizes ??
    lbResponse?.prize_tiers ??
    lbResponse?.prizeTiers ??
    lbResponse?.metadata?.prizes ??
    lbResponse?.meta?.prizes;

  if (Array.isArray(maybePrizes) && maybePrizes.length) {
    prizes = maybePrizes
      .map(p => {
        const rank = coerceNumber(p?.rank ?? p?.position ?? p?.place, NaN);
        let amount = 0;
        if (p?.amount_cents ?? p?.value_cents ?? p?.payout_cents) {
          amount = coerceNumber(p?.amount_cents ?? p?.value_cents ?? p?.payout_cents, 0) / 100;
        } else {
          amount = coerceNumber(p?.amount ?? p?.value ?? p?.payout, 0);
        }
        return { rank, amount };
      })
      .filter(p => Number.isFinite(p.rank) && p.rank > 0)
      .sort((a, b) => a.rank - b.rank);
  }

  // attach prizes by rank if present
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
      shapeHint: Array.isArray(lbResponse) ? "array" : Object.keys(lbResponse ?? {}).slice(0, 20),
    },
  };

  await writeJson("public/data/csbattle-leaderboard.json", output);

  console.log(`✅ CsBattle: Wrote ${rows.length} rows with ${prizes.length} prizes`);
}
