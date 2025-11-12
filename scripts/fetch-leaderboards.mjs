import fs from "fs/promises";
import path from "path";
import process from "process";

// -------------------- helpers --------------------
const SCHEMA_VERSION = 1;

const DEJEN_PRIZE_LADDER = [
  { rank: 1, amount: 1050 }, { rank: 2, amount: 750 }, { rank: 3, amount: 500 },
  { rank: 4, amount: 275 },  { rank: 5, amount: 150 }, { rank: 6, amount: 100 },
  { rank: 7, amount: 75 },   { rank: 8, amount: 50 },  { rank: 9, amount: 30 },
  { rank: 10, amount: 20 },
];

const CSGOLD_PRIZE_LADDER = [
  { rank: 1, amount: 105 }, { rank: 2, amount: 65 }, { rank: 3, amount: 40 },
  { rank: 4, amount: 25 },  { rank: 5, amount: 15 }, { rank: 6, amount: 0 },
  { rank: 7, amount: 0 },   { rank: 8, amount: 0 },  { rank: 9, amount: 0 },
  { rank: 10, amount: 0 },
];

function coerceNumber(v, fb = 0) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : fb;
  }
  if (typeof v === "bigint") return Number(v);
  return fb;
}

function firstArrayDeep(obj, maxDepth = 6) {
  const seen = new Set();
  function walk(x, d) {
    if (!x || d > maxDepth) return null;
    if (Array.isArray(x)) return x;
    if (typeof x !== "object") return null;
    if (seen.has(x)) return null;
    seen.add(x);

    // try common keys first
    for (const k of ["leaderboard", "rows", "entries", "data", "items", "list", "result", "top"]) {
      if (k in x) {
        const arr = walk(x[k], d + 1);
        if (arr) return arr;
      }
    }
    // scan all props
    for (const k of Object.keys(x)) {
      const arr = walk(x[k], d + 1);
      if (arr) return arr;
    }
    return null;
  }
  return walk(obj, 0) || [];
}

function mapRows(list, ladder, usernameKey = "username", wagerKey = "wagered") {
  const prizeByRank = new Map();
  const rows = list.map((entry, idx) => {
    const rawRank = entry?.rank ?? entry?.position ?? entry?.place ?? idx + 1;
    const rank = coerceNumber(rawRank, idx + 1);

    // Username
    const username =
      entry?.[usernameKey] ??
      entry?.username ??
      entry?.user ??
      entry?.name ??
      entry?.player ??
      entry?.displayName ??
      `Player ${rank}`;

    // Wagered
    const wagered =
      coerceNumber(entry?.[wagerKey], NaN) ??
      0;
    const bestWagered = Number.isFinite(wagered)
      ? wagered
      : coerceNumber(entry?.totalAmount ?? entry?.amount ?? entry?.value ?? entry?.total ?? entry?.points ?? entry?.volume, 0);

    // Prize
    const fromEntry = typeof entry?.prize === "object"
      ? entry?.prize?.amount ?? entry?.prize?.value ?? entry?.prize?.total
      : entry?.prize;
    const prizeAmount = fromEntry != null ? coerceNumber(fromEntry, 0)
      : (ladder.find(p => p.rank === rank)?.amount ?? 0);

    if (!prizeByRank.has(rank)) prizeByRank.set(rank, { rank, amount: prizeAmount });

    return { rank, username: String(username), wagered: bestWagered, prize: prizeAmount };
  });

  rows.sort((a, b) => a.rank - b.rank);

  const prizes = ladder.map(p => ({
    rank: p.rank,
    amount: prizeByRank.get(p.rank)?.amount ?? p.amount,
  }));

  return { rows, prizes };
}

async function fetchJson(url, init = {}) {
  const res = await fetch(url, init);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} – ${url} – ${text.slice(0, 200)}`);
  }
  try { return JSON.parse(text); } catch {
    throw new Error(`Invalid JSON from ${url}: ${text.slice(0, 120)}`);
  }
}

async function ensureDir() {
  const dir = path.resolve("public/data");
  await fs.mkdir(dir, { recursive: true });
  return dir;
}
async function writeJson(filename, data) {
  const dir = await ensureDir();
  const file = path.join(dir, filename);
  await fs.writeFile(file, JSON.stringify(data, null, 2));
  console.log("✅ Wrote", file);
}

// -------------------- Dejen --------------------
// Tries the race URL first; if no rows found, tries /races/:id/leaderboard
async function fetchDejen(raceId) {
  const base = "https://api.dejen.com";
  const url = `${base}/races/${raceId}`;
  const payload = await fetchJson(url);

  let list = firstArrayDeep(payload);
  if (!list.length) {
    // try sibling endpoint that commonly exposes the actual leaderboard rows
    const alt = `${base}/races/${raceId}/leaderboard`;
    try {
      const lb = await fetchJson(alt);
      list = firstArrayDeep(lb);
      if (!list.length && Array.isArray(lb)) list = lb;
      var metaUrl = alt; // eslint-disable-line no-var
    } catch (e) {
      // ignore; we’ll proceed with empty rows
      metaUrl = url; // eslint-disable-line no-var
    }
  }
  const { rows, prizes } = mapRows(list, DEJEN_PRIZE_LADDER, "username", "wagered");
  return {
    schemaVersion: SCHEMA_VERSION,
    rows,
    prizes: payload?.prizes ?? prizes,
    metadata: {
      source: "dejen",
      raceId,
      fetchedAt: new Date().toISOString(),
      url: metaUrl || url,
    },
  };
}

// -------------------- CsGold --------------------
// EXACT match to your sample: array of { username, totalAmount, ... }
function currentMonthRangeUTC() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
  const d = (dt) => dt.toISOString().slice(0, 10);
  return { startISOd: d(start), endISOd: d(end) };
}

async function fetchCsGold() {
  const base = "https://api.csgold.gg";
  const endpoint = new URL("/affiliate/leaderboard/referrals", base);

  if (process.env.CSGOLD_USE_MONTH === "true") {
    const r = currentMonthRangeUTC();
    // Add *only* two conventional params; avoid spammy noise
    endpoint.searchParams.set("from", r.startISOd);
    endpoint.searchParams.set("to", r.endISOd);
  }

  const key = process.env.CSGOLD_API_KEY;
  if (!key) throw new Error("Missing CSGOLD_API_KEY");

  // CsGold per your sample: x-api-key ONLY. No bearer.
  const headers = {
    Accept: "application/json",
    "x-api-key": key,
  };

  const payload = await fetchJson(endpoint.toString(), { headers });

  // If the API returns an array (your sample), use it directly.
  const list = Array.isArray(payload) ? payload : firstArrayDeep(payload);
  const { rows, prizes } = mapRows(list, CSGOLD_PRIZE_LADDER, "username", "totalAmount");

  return {
    schemaVersion: SCHEMA_VERSION,
    rows,
    prizes,
    metadata: {
      source: "csgold",
      fetchedAt: new Date().toISOString(),
      url: endpoint.toString(),
    },
  };
}

// -------------------- main --------------------
async function main() {
  const writes = [];

  const raceId = process.env.DEJEN_RACE_ID;
  if (raceId) {
    try {
      const dejen = await fetchDejen(raceId);
      writes.push(writeJson("dejen-leaderboard.json", dejen));
    } catch (e) {
      console.error("Dejen error:", e.message || e);
      // still write meta + prizes so UI doesn't break
      writes.push(writeJson("dejen-leaderboard.json", {
        schemaVersion: SCHEMA_VERSION,
        rows: [],
        prizes: DEJEN_PRIZE_LADDER,
        metadata: { source: "dejen", raceId, fetchedAt: new Date().toISOString(), error: String(e) },
      }));
    }
  } else {
    console.warn("DEJEN_RACE_ID not set – skipping Dejen");
  }

  if (process.env.CSGOLD_API_KEY) {
    try {
      const cs = await fetchCsGold();
      writes.push(writeJson("csgold-leaderboard.json", cs));
    } catch (e) {
      console.error("CsGold error:", e.message || e);
      // write nothing fake besides empty rows (so UI shows zeros, not random names)
      const emptyRows = Array.from({ length: 10 }, (_, i) => ({
        rank: i + 1, username: "—", wagered: 0,
        prize: CSGOLD_PRIZE_LADDER.find(p => p.rank === i + 1)?.amount ?? 0,
      }));
      writes.push(writeJson("csgold-leaderboard.json", {
        schemaVersion: SCHEMA_VERSION,
        rows: emptyRows,
        prizes: CSGOLD_PRIZE_LADDER,
        metadata: { source: "csgold", fetchedAt: new Date().toISOString(), error: String(e) },
      }));
    }
  } else {
    console.warn("CSGOLD_API_KEY not set – skipping CsGold");
  }

  if (!writes.length) {
    console.warn("No credentials provided; nothing fetched.");
    return;
  }

  await Promise.all(writes);
  console.log("✅ Leaderboards updated successfully");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
