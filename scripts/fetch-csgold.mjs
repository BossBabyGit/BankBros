// scripts/fetch-csgold.mjs
import fs from "fs/promises";
import path from "path";

const OUT = "public/data/csgold-leaderboard.json";
const API_KEY = process.env.CSGOLD_API_KEY;
const BASE = process.env.CSGOLD_BASE_URL?.trim() || "https://api.csgold.gg";
const ENDPOINT = process.env.CSGOLD_ENDPOINT?.trim() || "/affiliate/leaderboard/referrals";

// If the API requires a date range, we’ll include it. If not, the server will ignore.
function monthRangeUTC(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59));
  // A bunch of common param keys (server can accept any subset)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
    date_from: start.toISOString().slice(0, 10),
    date_to: end.toISOString().slice(0, 10),
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    from_ts: Math.floor(start.getTime() / 1000),
    to_ts: Math.floor(end.getTime() / 1000),
    period: "month"
  };
}

function coerceNumber(v, f = 0) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : f;
  }
  return f;
}

async function fetchJson(url, init = {}) {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} – ${url}${body ? ` – ${body.slice(0,200)}` : ""}`);
  }
  return res.json();
}

function normalizeRows(payload) {
  const list = Array.isArray(payload) ? payload
    : Array.isArray(payload?.leaderboard) ? payload.leaderboard
    : Array.isArray(payload?.rows) ? payload.rows
    : [];

  return list.map((entry, i) => {
    const rank = coerceNumber(entry?.rank ?? i + 1, i + 1);
    const username = entry?.username ?? entry?.user ?? entry?.name ?? `Player ${rank}`;
    const wagered = coerceNumber(entry?.totalAmount ?? entry?.wagered ?? entry?.amount ?? 0, 0);
    return { rank, username, wagered };
  }).sort((a, b) => a.rank - b.rank);
}

export default async function fetchCsGold() {
  if (!API_KEY) throw new Error("CSGOLD_API_KEY missing");

  const url = new URL(ENDPOINT, BASE);

  // Attach month params (harmless if API ignores)
  const q = monthRangeUTC();
  Object.entries(q).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const headers = {
    Accept: "application/json",
    "x-api-key": API_KEY,     // <- EXACTLY like your curl
  };

  const payload = await fetchJson(url.toString(), { headers });
  const rows = normalizeRows(payload);

  const out = {
    schemaVersion: 1,
    rows,                    // <- username + wagered + rank
    prizes: [],              // we only store raw rows here; UI applies ladder
    metadata: {
      source: "csgold",
      fetchedAt: new Date().toISOString(),
      url: url.toString()
    }
  };

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(out, null, 2));
  console.log("✅ Wrote", path.resolve(OUT));
}

// Allow running standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchCsGold().catch((e) => {
    console.error("CsGold error:", e.message);
    process.exit(1);
  });
}
