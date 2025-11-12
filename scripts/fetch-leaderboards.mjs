// scripts/fetch-leaderboards.mjs
import fs from "fs/promises";
import path from "path";
import process from "process";
import dotenv from "dotenv";

dotenv.config();

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

const CSGOLD_EMPTY_ROWS = Array.from({ length: 10 }, (_, i) => ({
  rank: i + 1,
  username: "—",
  wagered: 0,
  prize: CSGOLD_PRIZE_LADDER.find(p => p.rank === i + 1)?.amount ?? 0,
}));

function getEnv(key, fallback) {
  const v = process.env[key];
  return v && v.trim().length ? v.trim() : fallback;
}

/* ---------------------------
   Robust array extraction
--------------------------- */
function firstArrayDeep(obj, maxDepth = 6) {
  const seen = new Set();
  function walk(v, depth) {
    if (v == null || depth > maxDepth) return null;
    if (Array.isArray(v)) return v;
    if (typeof v !== "object") return null;
    if (seen.has(v)) return null;
    seen.add(v);
    // try common keys first
    const prioritizedKeys = [
      "leaderboard", "rows", "data", "items", "result", "list", "entries", "top",
    ];
    for (const k of prioritizedKeys) {
      if (k in v) {
        const arr = walk(v[k], depth + 1);
        if (arr) return arr;
      }
    }
    // fallback: scan all props
    for (const k of Object.keys(v)) {
      const arr = walk(v[k], depth + 1);
      if (arr) return arr;
    }
    return null;
  }
  return walk(obj, 0) || [];
}

function coerceNumber(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  if (typeof value === "bigint") return Number(value);
  return fallback;
}

function extractUsername(entry, fallback) {
  // direct
  const direct = entry?.username ?? entry?.user ?? entry?.name ?? entry?.player ?? entry?.displayName ?? entry?.alias;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  // nested { user: { name / username / displayName } }
  for (const key of ["user", "account", "player", "profile"]) {
    const obj = entry?.[key];
    if (obj && typeof obj === "object") {
      const nested =
        obj.username ?? obj.name ?? obj.displayName ?? obj.handle ?? obj.nick ?? obj.nickname;
      if (typeof nested === "string" && nested.trim()) return nested.trim();
    }
  }
  return fallback;
}

function extractWagered(entry) {
  // common numeric fields
  const candidates = [
    entry?.wagered, entry?.totalAmount, entry?.amount, entry?.value, entry?.total,
    entry?.points, entry?.volume, entry?.sum, entry?.wager, entry?.turnover,
  ];
  for (const c of candidates) {
    const n = coerceNumber(c, NaN);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function pickPrize(entry, rank, ladder) {
  const fromEntry = typeof entry?.prize === "object"
    ? entry?.prize?.amount ?? entry?.prize?.value ?? entry?.prize?.total
    : entry?.prize;
  if (fromEntry !== undefined && fromEntry !== null) return { rank, amount: coerceNumber(fromEntry, 0) };
  const mapped = ladder.find(p => p.rank === rank);
  return mapped ? { rank, amount: mapped.amount } : undefined;
}

function normalizeEntries(payloadLike, ladder) {
  const list = Array.isArray(payloadLike) ? payloadLike : firstArrayDeep(payloadLike);
  const prizeByRank = new Map();
  const rows = list.map((entry, index) => {
    const rawRank = entry?.rank ?? entry?.position ?? entry?.place ?? entry?.order ?? entry?.index;
    const nr = typeof rawRank === "string" ? Number(rawRank) : rawRank;
    const rank = Number.isFinite(nr) && nr > 0 ? Number(nr) : index + 1;
    const username = extractUsername(entry, `Player ${rank}`);
    const wagered = extractWagered(entry);
    const prize = pickPrize(entry, rank, ladder);
    if (prize && !prizeByRank.has(rank)) prizeByRank.set(rank, prize);
    return { rank, username, wagered, prize: prize?.amount ?? 0 };
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
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} – ${url}${body ? ` – ${body.slice(0, 200)}` : ""}`);
  }
  return res.json();
}

async function ensureDataDirectory() {
  const dir = path.resolve("public/data");
  await fs.mkdir(dir, { recursive: true });
  return dir;
}
async function writeJsonFile(filename, data) {
  const dir = await ensureDataDirectory();
  const file = path.join(dir, filename);
  await fs.writeFile(file, JSON.stringify(data, null, 2));
  console.log("✅ Wrote", file);
}

/* ---------------------------
   Dejen
--------------------------- */
async function fetchDejenLeaderboard(raceId) {
  const base = getEnv("DEJEN_BASE_URL", "https://api.dejen.com").replace(/\/+$/, "");
  const url = `${base}/races/${raceId}`;
  const payload = await fetchJson(url);
  const { rows, prizes } = normalizeEntries(payload, DEJEN_PRIZE_LADDER);
  return {
    schemaVersion: SCHEMA_VERSION,
    rows,
    prizes,
    metadata: { source: "dejen", raceId, fetchedAt: new Date().toISOString(), url },
  };
}

/* ---------------------------
   CsGold with monthly window
--------------------------- */
function currentMonthRangeUTC() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0-based
  const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999)); // last day of this month
  // ISO (date only) variants
  const startISOd = start.toISOString().slice(0, 10); // YYYY-MM-DD
  const endISOd = end.toISOString().slice(0, 10);
  return {
    start, end, startISOd, endISOd,
    startISO: start.toISOString(), endISO: end.toISOString(),
    startEpoch: Math.floor(start.getTime() / 1000), endEpoch: Math.floor(end.getTime() / 1000),
  };
}

async function fetchCsGoldLeaderboard() {
  const base = getEnv("CSGOLD_BASE_URL", "https://api.csgold.gg");
  const endpointPath = getEnv("CSGOLD_ENDPOINT", "/affiliate/leaderboard/referrals");
  const endpoint = new URL(endpointPath, base);

  // Attach a bunch of common date params at once (server will ignore unknown)
  const rng = currentMonthRangeUTC();
  const params = endpoint.searchParams;
  params.set("start", rng.startISOd);
  params.set("end", rng.endISOd);
  params.set("from", rng.startISOd);
  params.set("to", rng.endISOd);
  params.set("date_from", rng.startISOd);
  params.set("date_to", rng.endISOd);
  params.set("startDate", rng.startISOd);
  params.set("endDate", rng.endISOd);
  params.set("from_ts", String(rng.startEpoch));
  params.set("to_ts", String(rng.endEpoch));
  params.set("period", "month");

  const apiKey = getEnv("CSGOLD_API_KEY", "");
  const authHeader = getEnv("CSGOLD_AUTH_HEADER", "x-api-key").toLowerCase();
  const authScheme = getEnv("CSGOLD_AUTH_SCHEME", "raw").toLowerCase();
  if (!apiKey) throw new Error("Missing CSGOLD_API_KEY");

  const headers = { Accept: "application/json" };
  if (authHeader === "authorization" && authScheme === "bearer") headers["Authorization"] = `Bearer ${apiKey}`;
  else if (authHeader === "authorization" && authScheme === "token") headers["Authorization"] = `Token ${apiKey}`;
  else headers[authHeader] = apiKey;

  const extra = getEnv("CSGOLD_EXTRA_HEADERS", "");
  if (extra) {
    try { Object.entries(JSON.parse(extra)).forEach(([k, v]) => (headers[k] = String(v))); }
    catch { console.warn("⚠️ CSGOLD_EXTRA_HEADERS is not valid JSON – ignored"); }
  }

  const payload = await fetchJson(endpoint.toString(), { headers });

  const { rows, prizes } = normalizeEntries(payload, CSGOLD_PRIZE_LADDER);
  return {
    schemaVersion: SCHEMA_VERSION,
    rows,
    prizes,
    metadata: {
      source: "csgold",
      fetchedAt: new Date().toISOString(),
      url: endpoint.toString(),
      dateRange: { start: rng.startISOd, end: rng.endISOd },
    },
  };
}

/* ---------------------------
   Main
--------------------------- */
async function main() {
  const writes = [];

  const dejenRaceId = getEnv("DEJEN_RACE_ID", "");
  if (dejenRaceId) {
    try {
      const dejen = await fetchDejenLeaderboard(dejenRaceId);
      writes.push(writeJsonFile("dejen-leaderboard.json", dejen));
    } catch (err) {
      console.error("⚠️ Dejen fetch failed:", err);
      const { rows, prizes } = normalizeEntries([], DEJEN_PRIZE_LADDER);
      writes.push(writeJsonFile("dejen-leaderboard.json", {
        schemaVersion: SCHEMA_VERSION, rows, prizes,
        metadata: { source: "dejen", fetchedAt: new Date().toISOString(), error: String(err) },
      }));
    }
  } else {
    console.warn("ℹ️ DEJEN_RACE_ID not set – skipping Dejen");
  }

  if (getEnv("CSGOLD_API_KEY", "")) {
    try {
      const cs = await fetchCsGoldLeaderboard();
      writes.push(writeJsonFile("csgold-leaderboard.json", cs));
    } catch (err) {
      console.error("⚠️ CsGold fetch failed; writing fallback:", err?.message ?? err);
      writes.push(writeJsonFile("csgold-leaderboard.json", {
        schemaVersion: SCHEMA_VERSION, rows: CSGOLD_EMPTY_ROWS, prizes: CSGOLD_PRIZE_LADDER,
        metadata: { source: "csgold", fetchedAt: new Date().toISOString(), error: String(err?.message ?? err) },
      }));
    }
  } else {
    console.warn("ℹ️ CSGOLD_API_KEY not set – skipping CsGold");
  }

  if (!writes.length) {
    console.warn("⚠️ No credentials configured — nothing fetched.");
    return;
  }

  await Promise.all(writes);
  console.log("✅ Leaderboards updated successfully");
}

main().catch(err => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
