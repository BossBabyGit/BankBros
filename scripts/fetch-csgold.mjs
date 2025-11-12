// scripts/fetch-csgold.mjs
import fs from "fs/promises";
import path from "path";

const SCHEMA_VERSION = 1;

const CSGOLD_PRIZE_LADDER = [
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

function coerceNumber(v, fb = 0) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : fb;
  }
  return fb;
}
function extractUsername(x) {
  return x?.username ?? x?.user ?? x?.name ?? x?.player ?? x?.displayName ?? "—";
}
function extractWagered(x) {
  // You said CsGold returns `totalAmount`
  const src = x?.totalAmount ?? x?.wagered ?? x?.amount ?? x?.total ?? 0;
  return coerceNumber(src, 0);
}

async function fetchJson(url, init) {
  const r = await fetch(url, init);
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(`HTTP ${r.status} – ${url}${body ? ` – ${body.slice(0, 200)}` : ""}`);
  }
  return r.json();
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

// Month range in UTC (start of this month → end of this month)
function getMonthRangeUTC(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth(); // 0-based
  const start = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59)); // last day @ 23:59:59
  const iso = (x) => x.toISOString().slice(0, 10); // YYYY-MM-DD
  return {
    startISO: iso(start),
    endISO: iso(end),
    startTs: Math.floor(start.getTime() / 1000),
    endTs: Math.floor(end.getTime() / 1000),
  };
}

const apiKey = process.env.CSGOLD_API_KEY;
if (!apiKey) {
  console.warn("ℹ️ CSGOLD_API_KEY not set – skipping CsGold");
  process.exit(0);
}

const base = (process.env.CSGOLD_BASE_URL?.replace(/\/+$/,"") || "https://api.csgold.gg");
const endpointPath = process.env.CSGOLD_ENDPOINT || "/affiliate/leaderboard/referrals";
const endpoint = new URL(endpointPath, base);
const { startISO, endISO, startTs, endTs } = getMonthRangeUTC();

// include a bunch of common date param names (you said “if a date is needed”)
const qp = new URLSearchParams({
  start: startISO,
  end: endISO,
  from: startISO,
  to: endISO,
  date_from: startISO,
  date_to: endISO,
  startDate: startISO,
  endDate: endISO,
  from_ts: String(startTs),
  to_ts: String(endTs),
  period: "month",
});
endpoint.search = qp.toString();

// send BOTH headers (many backends accept one or the other)
const headers = {
  Accept: "application/json",
  "x-api-key": apiKey,
  Authorization: `Bearer ${apiKey}`,
};

let payload;
let errorMsg = "";
try {
  payload = await fetchJson(endpoint.toString(), { headers });
} catch (e) {
  errorMsg = String(e?.message ?? e);
  // Write error to file BUT do not invent fake players
  await writeJson("csgold-leaderboard.json", {
    schemaVersion: SCHEMA_VERSION,
    rows: [],
    prizes: CSGOLD_PRIZE_LADDER,
    metadata: {
      source: "csgold",
      fetchedAt: new Date().toISOString(),
      url: endpoint.toString(),
      error: errorMsg,
    },
  });
  process.exit(0);
}

// normalize
const list = Array.isArray(payload)
  ? payload
  : Array.isArray(payload?.leaderboard)
  ? payload.leaderboard
  : Array.isArray(payload?.rows)
  ? payload.rows
  : [];

const rows = (list || [])
  .map((entry, idx) => {
    const rankRaw = entry?.rank ?? entry?.position ?? entry?.place ?? (idx + 1);
    const rank = coerceNumber(rankRaw, idx + 1);
    const username = extractUsername(entry);
    const wagered = extractWagered(entry);
    const prize = CSGOLD_PRIZE_LADDER.find((p) => p.rank === rank)?.amount ?? 0;
    return { rank, username, wagered, prize };
  })
  .sort((a, b) => a.rank - b.rank);

// write file with REAL rows (or empty if API returned nothing)
await writeJson("csgold-leaderboard.json", {
  schemaVersion: SCHEMA_VERSION,
  rows,
  prizes: CSGOLD_PRIZE_LADDER,
  metadata: {
    source: "csgold",
    fetchedAt: new Date().toISOString(),
    url: endpoint.toString(),
  },
});
