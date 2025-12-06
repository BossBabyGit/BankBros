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

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  const txt = await res.text();
  let json = null;
  try { json = JSON.parse(txt); } catch {}
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
  // default to the URL you provided; can be overridden by CSBATTLE_URL env var
  const defaultUrl = "https://api.csbattle.com/leaderboards/affiliates/9f38c248-ff26-493e-ae4e-20f82a20ccf1?from=2025-01-12%2000:00:00&to=2026-01-06%2023:59:59";
  const url = process.env.CSBATTLE_URL ?? defaultUrl;

  if (!url) throw new Error("CSBATTLE_URL is not set and no default URL available");

  // fetch the leaderboard response
  const resp = await fetchJson(url);

  if (process.env.DEBUG_FETCH) {
    await writeJson("public/data/_debug/csbattle-raw.json", resp);
  }

  // CSBattle returns { "users": [ ... ] }
  const users = Array.isArray(resp?.users) ? resp.users : [];

  console.log(`📊 CSBattle: Found ${users.length} users`);

  // map to rows
  const rows = users
    .map((u, i) => {
      // rank fallback to index+1 if not present/valid
      const rank = Number.isFinite(+u?.rank) && +u.rank > 0 ? +u.rank : i + 1;
      // wager field in sample is already a number (dollars)
      const wagered = coerceNumber(u?.wager ?? u?.wagered ?? u?.wager_total ?? u?.amount ?? 0, 0);
      return {
        rank,
        uuid: u?.uuid ?? null,
        username: extractUsername(u, `Player ${i + 1}`),
        avatar: u?.avatar ?? null,
        wagered,
        prize: 0, // no prize info provided in this endpoint; keep 0 so format matches Dejen output
      };
    })
    .sort((a, b) => a.rank - b.rank);

  // Build output object similar to your Dejen output
  const output = {
    schemaVersion: SCHEMA_VERSION,
    rows,
    prizes: [], // CSBattle endpoint sample doesn't include prize tiers — leave empty
    metadata: {
      source: "csbattle",
      fetchedAt: new Date().toISOString(),
      url,
    },
  };

  await writeJson("public/data/csbattle-leaderboard.json", output);

  console.log(`✅ CSBattle: Wrote ${rows.length} rows`);
}

// If run directly with node: run the fetch
if (process.argv[1] === new URL(import.meta.url).pathname) {
  fetchCsBattle().catch(err => {
    console.error("❌ Error:", err);
    process.exit(1);
  });
}
