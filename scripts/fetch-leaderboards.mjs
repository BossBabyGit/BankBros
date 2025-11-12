// scripts/fetch-leaderboards.mjs
import fs from "fs/promises";
import path from "path";
import process from "process";
import dotenv from "dotenv";

dotenv.config();

// ---------- constants ----------
const SCHEMA_VERSION = 1;

const DEJEN_PRIZES_DEFAULT = [
  { rank: 1, amount: 1050 },
  { rank: 2, amount: 750 },
  { rank: 3, amount: 500 },
  { rank: 4, amount: 275 },
  { rank: 5, amount: 150 },
  { rank: 6, amount: 100 },
  { rank: 7, amount: 75 },
  { rank: 8, amount: 50 },
  { rank: 9, amount: 30 },
  { rank: 10, amount: 20 },
];

const CSGOLD_PRIZES = [
  { rank: 1, amount: 105 },
  { rank: 2, amount: 65 },
  { rank: 3, amount: 40 },
  { rank: 4, amount: 25 },
  { rank: 5, amount: 15 },
  { rank: 6, amount: 0 },
  { rank: 7, amount: 0 },
  { rank: 8, amount: 0 },
  { rank: 9, amount: 0 },
  { rank: 10, amount: 0 },
];

// ---------- utils ----------
const DATA_DIR = path.resolve("public/data");
async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}
async function writeJson(file, data) {
  await ensureDir();
  const p = path.join(DATA_DIR, file);
  await fs.writeFile(p, JSON.stringify(data, null, 2));
  console.log("✅ Wrote", p);
}

function coerceNumber(v, fb = 0) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : fb;
  }
  return fb;
}

function extractArray(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  const keys = ["leaderboard", "rows", "items", "data", "entries", "list", "users"];
  for (const k of keys) if (Array.isArray(payload?.[k])) return payload[k];
  return [];
}

function normalizeRows(list, prizeLadder = []) {
  const prizeByRank = new Map(prizeLadder.map(p => [p.rank, p.amount]));

  const rows = extractArray(list).map((row, idx) => {
    const rawRank = row?.rank ?? row?.position ?? row?.place ?? row?.order ?? row?.index;
    const rank = Number.isFinite(rawRank) ? Number(rawRank) : idx + 1;

    const username =
      row?.username ??
      row?.user ??
      row?.name ??
      row?.player ??
      row?.displayName ??
      `Player ${rank}`;

    // common wager fields
    const wagerSrc =
      row?.wagered ??
      row?.totalAmount ??
      row?.amount ??
      row?.value ??
      row?.volume ??
      row?.points ??
      row?.total ??
      0;

    const wagered = coerceNumber(wagerSrc, 0);

    // prize (prefer explicit, else ladder)
    const prizeFromRow =
      typeof row?.prize === "object"
        ? row?.prize?.amount ?? row?.prize?.value ?? row?.prize?.total
        : row?.prize;
    const prize = coerceNumber(prizeFromRow, prizeByRank.get(rank) ?? 0);

    return { rank, username, wagered, prize };
  });

  rows.sort((a, b) => a.rank - b.rank);
  // ensure prize array straight from ladder (or from data if provided)
  const prizes = prizeLadder.length
    ? prizeLadder
    : Array.from({ length: 10 }, (_, i) => ({
        rank: i + 1,
        amount: rows.find(r => r.rank === i + 1)?.prize ?? 0,
      }));

  return { rows, prizes };
}

async function fetchJson(url, init = {}) {
  const res = await fetch(url, init);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} – ${url} – ${text.slice(0, 400)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON from ${url}: ${text.slice(0, 200)}`);
  }
}

// ---------- Dejen ----------
async function fetchDejenAll(raceId) {
  const base = (process.env.DEJEN_BASE_URL || "https://api.dejen.com").replace(/\/+$/,"");
  const metaUrl = `${base}/races/${raceId}`;
  const candidates = [
    `${base}/races/${raceId}/leaderboard`,
    `${base}/races/${raceId}/standings`,
    // last resort: some APIs include it inline
    metaUrl
  ];

  // 1) get meta (for prizes window & to write raw)
  const meta = await fetchJson(metaUrl).catch(e => {
    console.warn("Dejen meta fetch failed:", e.message);
    return null;
  });
  if (meta) await writeJson("dejen-raw.json", meta);

  // prizes: prefer meta.prizes if present
  const ladder = Array.isArray(meta?.prizes) && meta.prizes.length ? meta.prizes : DEJEN_PRIZES_DEFAULT;

  // 2) try endpoints for actual rows
  for (const url of candidates) {
    try {
      const payload = await fetchJson(url);
      await writeJson("dejen-leaderboard-raw.json", { url, payload }); // debug
      const arr = extractArray(payload);
      if (arr.length) {
        const { rows, prizes } = normalizeRows(arr, ladder);
        return {
          schemaVersion: SCHEMA_VERSION,
          rows,
          prizes,
          metadata: {
            source: "dejen",
            raceId,
            fetchedAt: new Date().toISOString(),
            url,
            period: { start: meta?.start_time ?? null, end: meta?.end_time ?? null },
          },
        };
      }
    } catch (e) {
      // try next
      console.warn("Dejen endpoint failed:", e.message);
    }
  }

  // 3) if we get here, we didn’t find rows; still write meta-based prizes
  const { rows, prizes } = normalizeRows([], ladder);
  return {
    schemaVersion: SCHEMA_VERSION,
    rows, // empty -> your UI will show “no live data yet”
    prizes,
    metadata: {
      source: "dejen",
      raceId,
      fetchedAt: new Date().toISOString(),
      error: "No leaderboard array found on any known endpoint",
      tried: candidates,
      period: { start: meta?.start_time ?? null, end: meta?.end_time ?? null },
    },
  };
}

// ---------- CsGold ----------
function monthRangeUTC(now = new Date()) {
  // Europe/Vienna timezone is UTC+1/+2, but CsGold likely wants UTC dates.
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0-based
  const start = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59));
  const toISO = (d) => d.toISOString().slice(0, 10); // YYYY-MM-DD
  return {
    startISO: toISO(start),
    endISO: toISO(end),
    startUnix: Math.floor(start.getTime() / 1000),
    endUnix: Math.floor(end.getTime() / 1000),
  };
}

async function fetchCsGold() {
  const base = (process.env.CSGOLD_BASE_URL || "https://api.csgold.gg").replace(/\/+$/,"");
  const endpointPath = process.env.CSGOLD_ENDPOINT || "/affiliate/leaderboard/referrals";
  const url = new URL(endpointPath, base);

  const { startISO, endISO, startUnix, endUnix } = monthRangeUTC();

  // include a bunch of commonly used param names — the server will ignore unknown ones
  const params = {
    start: startISO,
    end: endISO,
    from: startISO,
    to: endISO,
    date_from: startISO,
    date_to: endISO,
    startDate: startISO,
    endDate: endISO,
    from_ts: String(startUnix),
    to_ts: String(endUnix),
    period: "month",
  };
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const key = process.env.CSGOLD_API_KEY || "";
  if (!key) throw new Error("Missing CSGOLD_API_KEY");

  // Most affiliates use x-api-key. If your key actually needs Authorization, set the envs accordingly.
  const authHeader = (process.env.CSGOLD_AUTH_HEADER || "x-api-key").toLowerCase();
  const authScheme = (process.env.CSGOLD_AUTH_SCHEME || "raw").toLowerCase();

  const headers = { Accept: "application/json" };
  if (authHeader === "authorization") {
    headers["Authorization"] =
      authScheme === "bearer" ? `Bearer ${key}` :
      authScheme === "token" ? `Token ${key}` :
      key;
  } else {
    headers[authHeader] = key; // default: x-api-key: <key>
  }

  if (process.env.CSGOLD_EXTRA_HEADERS) {
    try {
      const extra = JSON.parse(process.env.CSGOLD_EXTRA_HEADERS);
      for (const [k, v] of Object.entries(extra)) headers[k] = String(v);
    } catch {
      console.warn("CSGOLD_EXTRA_HEADERS is not valid JSON; ignoring");
    }
  }

  try {
    const payload = await fetchJson(url.toString(), { headers });
    await writeJson("csgold-raw.json", { url: url.toString(), payload }); // debug

    // payload is expected to be an array of { username, totalAmount, ... }
    const { rows, prizes } = normalizeRows(payload, CSGOLD_PRIZES);
    return {
      schemaVersion: SCHEMA_VERSION,
      rows,
      prizes,
      metadata: {
        source: "csgold",
        fetchedAt: new Date().toISOString(),
        url: url.toString(),
      },
    };
  } catch (e) {
    // 401 or any other error — write a file with the error and zero rows (no fake names)
    await writeJson("csgold-raw.json", { url: url.toString(), error: String(e.message || e) });
    return {
      schemaVersion: SCHEMA_VERSION,
      rows: [], // no sample usernames
      prizes: CSGOLD_PRIZES,
      metadata: {
        source: "csgold",
        fetchedAt: new Date().toISOString(),
        url: url.toString(),
        error: String(e.message || e),
      },
    };
  }
}

// ---------- main ----------
async function main() {
  const writes = [];

  // Dejen
  const dejenId = process.env.DEJEN_RACE_ID;
  if (dejenId) {
    const dejen = await fetchDejenAll(dejenId);
    writes.push(writeJson("dejen-leaderboard.json", dejen));
  } else {
    console.warn("DEJEN_RACE_ID not set — skipping Dejen");
  }

  // CsGold
  if (process.env.CSGOLD_API_KEY) {
    const cs = await fetchCsGold();
    writes.push(writeJson("csgold-leaderboard.json", cs));
  } else {
    console.warn("CSGOLD_API_KEY not set — skipping CsGold");
  }

  await Promise.all(writes);
  console.log("✅ Leaderboards updated successfully");
}

main().catch((e) => {
  console.error("❌ Fatal error:", e);
  process.exit(1);
});
