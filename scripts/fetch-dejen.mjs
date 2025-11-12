// scripts/fetch-dejen.mjs
import fs from "fs/promises";
import path from "path";

const SCHEMA_VERSION = 1;

const DEJEN_PRIZE_LADDER = [
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
  // Dejen typically returns { username, wagered } or similar on /leaderboard
  const src = x?.wagered ?? x?.totalAmount ?? x?.amount ?? x?.value ?? x?.total ?? 0;
  return coerceNumber(src, 0);
}
function pickPrize(rank, ladder = DEJEN_PRIZE_LADDER) {
  return ladder.find((p) => p.rank === rank)?.amount ?? 0;
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

const raceId = process.env.DEJEN_RACE_ID;
if (!raceId) {
  console.warn("ℹ️ DEJEN_RACE_ID not set – skipping Dejen");
  process.exit(0);
}

const base = process.env.DEJEN_BASE_URL?.replace(/\/+$/,"") || "https://api.dejen.com";

// We try the real leaderboard endpoint first. If it fails, we fall back to /races/:id (in case they embed it later).
const urlsToTry = [
  `${base}/races/${raceId}/leaderboard`,
  `${base}/races/${raceId}`,
];

let payload = null;
let usedUrl = null;

for (const url of urlsToTry) {
  try {
    const j = await fetchJson(url, { headers: { Accept: "application/json" } });
    payload = j;
    usedUrl = url;
    break;
  } catch (e) {
    // try next
    continue;
  }
}

if (!payload) {
  throw new Error(`All Dejen endpoints failed: ${urlsToTry.join(", ")}`);
}

// Normalize: accept array or object with leaderboard list
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
    const prize = pickPrize(rank);
    return { rank, username, wagered, prize };
  })
  .sort((a, b) => a.rank - b.rank);

// If the endpoint didn’t actually return entries, don’t fake “sample” players.
// Just write prizes + empty rows (so you instantly see it’s empty).
const prizes = DEJEN_PRIZE_LADDER;

await writeJson("dejen-leaderboard.json", {
  schemaVersion: SCHEMA_VERSION,
  rows,
  prizes,
  metadata: {
    source: "dejen",
    raceId,
    fetchedAt: new Date().toISOString(),
    url: usedUrl,
  },
});
