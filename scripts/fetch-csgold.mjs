import fs from "fs/promises";
import path from "path";

const OUT = "public/data/csgold-leaderboard.json";
const API_KEY = process.env.CSGOLD_API_KEY;
const BASE = "https://api.csgold.gg";
const ENDPOINT = "/affiliate/leaderboard/referrals";

function monthRangeMsUTC(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const start = Date.UTC(y, m, 1, 0, 0, 0);                 // ms
  const end   = Date.UTC(y, m + 1, 1, 0, 0, 0) - 1;         // ms
  return { after: start, before: end };
}

function coerceNum(v, f = 0) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : f;
  }
  return f;
}

async function fetchJson(url, init = {}) {
  const res = await fetch(url, init);
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} – ${url} – ${text.slice(0,300)}`);
  try { return JSON.parse(text); } catch { throw new Error(`Bad JSON from ${url}: ${text.slice(0,300)}`); }
}

function normalizeRows(payload) {
  // API returns: { success: true, data: [ { username, totalAmount, avatar, ... } ] }
  const list = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
  return list.map((entry, i) => {
    const rank = i + 1;
    const username = entry?.username ?? `Player ${rank}`;
    const wagered = coerceNum(entry?.totalAmount ?? entry?.wagered ?? entry?.amount ?? 0, 0);
    return { rank, username, wagered };
  });
}

export default async function run() {
  if (!API_KEY) throw new Error("CSGOLD_API_KEY missing");

  const { after, before } = monthRangeMsUTC(); // ms like your PHP example
  const url = new URL(ENDPOINT, BASE).toString();

  const body = JSON.stringify({
    key: API_KEY,
    type: "WAGER",
    before,  // timestamps in ms
    after
  });

  const payload = await fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body
  });

  if (payload?.success !== true) {
    throw new Error(`API returned unsuccessful response: ${JSON.stringify(payload).slice(0,300)}`);
  }

  const rows = normalizeRows(payload);

  const out = {
    schemaVersion: 1,
    rows,                // <- username + wagered + rank
    prizes: [],          // ladder handled in UI
    metadata: {
      source: "csgold",
      fetchedAt: new Date().toISOString(),
      url
    }
  };

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(out, null, 2));
  console.log("✅ Wrote", path.resolve(OUT));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch(e => { console.error("CsGold error:", e.message); process.exit(1); });
}
