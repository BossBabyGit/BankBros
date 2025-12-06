// scripts/fetch-roulobets.mjs
import fs from "fs/promises";
import path from "path";
import process from "process";

const SCHEMA_VERSION = 1;

// ========================================
// 🔧 MANUAL DATE CONFIGURATION
// ========================================
// Set your date range here (format: YYYY-MM-DD)
const MANUAL_START_DATE = "2025-12-06";
const MANUAL_END_DATE   = "2026-01-06";

// Set to true to use manual dates, false to use current month
const USE_MANUAL_DATES = true;
// ========================================

// If you really want to hardcode the key (not recommended for GitHub), set HARDCODED_API_KEY here.
// Leave as null to prefer process.env.ROULOBETS_API_KEY.
const HARDCODED_API_KEY = null;

function coerceNumber(v, fb = 0) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : fb;
  }
  return fb;
}

function monthBoundsUtcMs(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const startMs = Date.UTC(y, m, 1, 0, 0, 0);
  const endMs   = Date.UTC(y, m + 1, 1, 0, 0, 0) - 1;
  return { after: startMs, before: endMs };
}

function getDateRange() {
  if (USE_MANUAL_DATES) {
    const after = new Date(MANUAL_START_DATE).getTime();
    const before = new Date(MANUAL_END_DATE).getTime() - 1;
    if (!Number.isNaN(after) && !Number.isNaN(before)) {
      console.log(`📅 Roulobets: Using MANUAL date range`);
      return { after, before };
    } else {
      console.warn(`⚠️  Roulobets: Invalid manual dates, falling back to current month`);
    }
  }
  console.log(`📅 Roulobets: Using current month (automatic)`);
  return monthBoundsUtcMs(new Date());
}

async function fetchText(url, init) {
  const res = await fetch(url, init);
  const txt = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} – ${url} – ${txt?.slice?.(0,200)}`);
  return txt;
}

async function ensureDir(p) { await fs.mkdir(p, { recursive: true }); }

async function writeJson(file, data) {
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, JSON.stringify(data, null, 2));
  console.log("✅ Wrote", file);
}

export default async function fetchRoulobets() {
  const apiKey = HARDCODED_API_KEY || process.env.ROULOBETS_API_KEY;
  if (!apiKey) throw new Error("ROULOBETS_API_KEY is not set in environment (or HARDCODED_API_KEY is null).");

  const { after, before } = getDateRange();

  console.log(`📅 Roulobets: Fetching data for period:`);
  console.log(`   Start: ${new Date(after).toISOString()}`);
  console.log(`   End:   ${new Date(before).toISOString()}`);

  const startStr = USE_MANUAL_DATES ? MANUAL_START_DATE : new Date(after).toISOString().split("T")[0];
  const endStr = USE_MANUAL_DATES ? MANUAL_END_DATE : new Date(before + 1).toISOString().split("T")[0];

  const baseUrl = "https://api.roulobets.com/v1/external/affiliates";
  const url = `${baseUrl}?start_at=${encodeURIComponent(startStr)}&end_at=${encodeURIComponent(endStr)}&key=${encodeURIComponent(apiKey)}`;

  let txt;
  try {
    txt = await fetchText(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "roulobets-node-client/1.0"
      },
    });
  } catch (err) {
    console.error(`❌ Roulobets fetch error: ${err.message}`);
    throw err;
  }

  let payload;
  try {
    payload = JSON.parse(txt);
  } catch (err) {
    console.error(`❌ Failed to parse JSON response`);
    console.error(`Raw response (first 500 chars):`, txt.slice(0, 500));
    throw new Error(`Non-JSON Roulobets response: ${txt?.slice?.(0,200)}`);
  }

  console.log(`📦 Raw API response keys: ${Object.keys(payload).join(", ")}`);

  if (process.env.DEBUG_FETCH) {
    try { await writeJson("public/data/_debug/roulobets-raw.json", payload); }
    catch (err) { console.error("❌ Failed to write debug file:", err?.message ?? err); }
  }

  // Normalize the affiliates array (supports payload.raw_response.affiliates OR payload.affiliates)
  let data = [];
  if (Array.isArray(payload?.raw_response?.affiliates)) data = payload.raw_response.affiliates;
  else if (Array.isArray(payload?.affiliates)) data = payload.affiliates;
  else console.warn(`⚠️ Roulobets: unexpected response shape; keys: ${Object.keys(payload).join(", ")}`);

  if (data.length === 0) {
    console.warn("⚠️ Roulobets: No affiliate data returned for this period");
  }

  const normalized = data.map((e) => ({
    username: e?.username ?? "—",
    id: e?.id ?? null,
    wagered: coerceNumber(e?.wagered_amount ?? e?.wagered ?? 0, 0),
    rank: e?.rank ?? null,
    avatar: e?.avatar ?? null,
    isAnon: e?.isAnon ?? false,
  }));

  const top = normalized
    .slice()
    .sort((a, b) => coerceNumber(b.wagered, 0) - coerceNumber(a.wagered, 0))
    .slice(0, 10);

  const rows = top.map((e, i) => ({
    rank: i + 1,
    username: e.username,
    wagered: e.wagered,
    prize: 0,
    avatar: e.avatar,
    isAnon: e.isAnon,
  }));

  const output = {
    schemaVersion: SCHEMA_VERSION,
    rows,
    prizes: [],
    metadata: {
      source: "roulobets",
      fetchedAt: new Date().toISOString(),
      url,
      range: {
        after,
        before,
        humanReadable: { start: startStr, end: endStr }
      },
      totalEntries: data.length,
    },
  };

  await writeJson("public/data/roulobets-leaderboard.json", output);

  console.log(`✅ Roulobets: Wrote ${rows.length} rows from ${data.length} entries`);
  if (rows.length > 0) console.log(`   🏆 Top player: ${rows[0].username} with ${rows[0].wagered}`);
}
