import fs from "fs/promises";
import path from "path";

const OUT = "public/data/dejen-leaderboard.json";
const RACE_ID = process.env.DEJEN_RACE_ID;
const BASE = "https://api.dejen.com";

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

function pickList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.leaderboard)) return payload.leaderboard;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.entries)) return payload.entries;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function normalizeRows(payload) {
  const list = pickList(payload);
  return list.map((entry, i) => {
    const rank = coerceNum(entry?.rank ?? entry?.position ?? i + 1, i + 1);
    const username = entry?.username ?? entry?.user ?? entry?.name ?? entry?.player ?? `Player ${rank}`;
    const wagered = coerceNum(entry?.wagered ?? entry?.totalAmount ?? entry?.amount ?? entry?.value ?? entry?.points ?? 0, 0);
    return { rank, username, wagered };
  }).sort((a, b) => a.rank - b.rank);
}

export default async function run() {
  if (!RACE_ID) throw new Error("DEJEN_RACE_ID missing");

  // 1) get leaderboard entries
  const lbUrl = `${BASE}/races/${RACE_ID}/leaderboard`;
  let lbPayload = await fetchJson(lbUrl).catch(() => null);

  // If the provider exposes entries directly at /races/:id (rare), also try that as a fallback
  if (!lbPayload) {
    const raceUrl = `${BASE}/races/${RACE_ID}`;
    lbPayload = await fetchJson(raceUrl).catch(() => ({}));
  }

  const rows = normalizeRows(lbPayload);

  // 2) grab prizes from the race object (if available)
  let prizes = [];
  try {
    const race = await fetchJson(`${BASE}/races/${RACE_ID}`);
    if (Array.isArray(race?.prizes)) {
      prizes = race.prizes
        .map(p => ({ rank: coerceNum(p?.rank), amount: coerceNum(p?.amount) }))
        .filter(p => Number.isFinite(p.rank) && Number.isFinite(p.amount));
    }
  } catch { /* ignore */ }

  const out = {
    schemaVersion: 1,
    rows,          // <- username + wagered + rank
    prizes,
    metadata: {
      source: "dejen",
      raceId: RACE_ID,
      fetchedAt: new Date().toISOString(),
      url: lbUrl
    }
  };

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(out, null, 2));
  console.log("✅ Wrote", path.resolve(OUT));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch(e => { console.error("Dejen error:", e.message); process.exit(1); });
}
