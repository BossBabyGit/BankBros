// scripts/fetch-dejen.mjs
import fs from "fs/promises";
import path from "path";

const OUT = "public/data/dejen-leaderboard.json";
const RACE_ID = process.env.DEJEN_RACE_ID;

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

function normalizeRows(list) {
  // Accept a few common shapes:
  const items = Array.isArray(list) ? list
    : Array.isArray(list?.leaderboard) ? list.leaderboard
    : Array.isArray(list?.rows) ? list.rows
    : [];

  return items.map((entry, i) => {
    const rank = coerceNumber(entry?.rank ?? entry?.position ?? i + 1, i + 1);
    const username = entry?.username ?? entry?.user ?? entry?.name ?? entry?.player ?? `Player ${rank}`;
    const wagered = coerceNumber(
      entry?.wagered ?? entry?.totalAmount ?? entry?.amount ?? entry?.value ?? 0,
      0
    );
    return { rank, username, wagered };
  }).sort((a, b) => a.rank - b.rank);
}

export default async function fetchDejen() {
  if (!RACE_ID) throw new Error("DEJEN_RACE_ID missing");
  const base = "https://api.dejen.com";
  const url = `${base}/races/${RACE_ID}/leaderboard`;

  const payload = await fetchJson(url);
  const rows = normalizeRows(payload);

  // also grab prizes from the race object in case the endpoint returns it
  // fallback: if none, keep empty array (UI already has a ladder)
  let prizes = [];
  if (Array.isArray(payload?.prizes)) {
    prizes = payload.prizes.map(p => ({ rank: coerceNumber(p.rank), amount: coerceNumber(p.amount) }))
                          .filter(p => Number.isFinite(p.rank) && Number.isFinite(p.amount));
  }

  const out = {
    schemaVersion: 1,
    rows,              // <- username + wagered + rank
    prizes,
    metadata: {
      source: "dejen",
      raceId: RACE_ID,
      fetchedAt: new Date().toISOString(),
      url
    }
  };

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(out, null, 2));
  console.log("✅ Wrote", path.resolve(OUT));
}

// Allow running standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchDejen().catch((e) => {
    console.error("Dejen error:", e.message);
    process.exit(1);
  });
}
