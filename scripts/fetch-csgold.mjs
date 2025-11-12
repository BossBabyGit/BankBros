import fs from "fs/promises";
import path from "path";
import process from "process";

const SCHEMA_VERSION = 1;

// ========================================
// 🔧 MANUAL DATE CONFIGURATION
// ========================================
// Set your date range here (format: YYYY-MM-DD)
const MANUAL_START_DATE = "2025-11-01";  // ← Change this
const MANUAL_END_DATE = "2025-12-01";    // ← Change this

// Set to true to use manual dates, false to use current month
const USE_MANUAL_DATES = true;  // ← Change to false to use current month
// ========================================

function coerceNumber(v, fb = 0) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : fb;
  }
  return fb;
}

// Get month bounds in UTC milliseconds
function monthBoundsUtcMs(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const startMs = Date.UTC(y, m, 1, 0, 0, 0);
  const endMs   = Date.UTC(y, m + 1, 1, 0, 0, 0) - 1;
  return { after: startMs, before: endMs };
}

// Get date range (manual or automatic)
function getDateRange() {
  if (USE_MANUAL_DATES) {
    const after = new Date(MANUAL_START_DATE).getTime();
    const before = new Date(MANUAL_END_DATE).getTime() - 1;
    
    if (!isNaN(after) && !isNaN(before)) {
      console.log(`📅 CsGold: Using MANUAL date range`);
      return { after, before };
    } else {
      console.warn(`⚠️  CsGold: Invalid manual dates, falling back to current month`);
    }
  }
  
  // Default: use current month
  console.log(`📅 CsGold: Using current month (automatic)`);
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

export default async function fetchCsGold() {
  const apiKey = process.env.CSGOLD_API_KEY;
  if (!apiKey) throw new Error("CSGOLD_API_KEY is not set");

  const { after, before } = getDateRange();

  console.log(`📅 CsGold: Fetching data for period:`);
  console.log(`   Start: ${new Date(after).toISOString()}`);
  console.log(`   End:   ${new Date(before).toISOString()}`);

  const url = "https://api.csgold.gg/affiliate/leaderboard/referrals";
  
  const body = JSON.stringify({
    key: apiKey,
    type: "WAGER",
    before: before,
    after: after,
  });

  const txt = await fetchText(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  let payload = null;
  try { 
    payload = JSON.parse(txt); 
  } catch (err) {
    throw new Error(`Non-JSON CsGold response: ${txt?.slice?.(0,200)}`);
  }

  if (process.env.DEBUG_FETCH) {
    await writeJson("public/data/_debug/csgold-raw.json", payload);
  }

  console.log(`📥 CsGold: API response:`, {
    success: payload?.success,
    dataLength: Array.isArray(payload?.data) ? payload.data.length : 0
  });

  // Handle both direct array response AND success wrapper
  let data = [];
  
  if (Array.isArray(payload)) {
    data = payload;
    console.log(`📊 CsGold: Received direct array with ${data.length} entries`);
  } else if (payload?.success && Array.isArray(payload?.data)) {
    data = payload.data;
    console.log(`📊 CsGold: Received wrapped response with ${data.length} entries`);
  } else if (Array.isArray(payload?.data)) {
    data = payload.data;
    console.log(`📊 CsGold: Received data array with ${data.length} entries`);
  } else if (!payload?.success) {
    console.warn(`⚠️  CsGold: API returned success=false or missing success field`);
  } else {
    console.warn(`⚠️  CsGold: Unexpected response structure. Keys: ${Object.keys(payload).join(', ')}`);
  }

  // If no data, log warning but continue
  if (data.length === 0) {
    console.warn(`⚠️  CsGold: No leaderboard data returned for this period`);
    console.warn(`⚠️  💡 TIP: Edit the MANUAL_START_DATE and MANUAL_END_DATE at the top of this file`);
  }

  // Sort by totalAmount descending and take top 10
  const top = data
    .slice()
    .sort((a, b) => coerceNumber(b?.totalAmount, 0) - coerceNumber(a?.totalAmount, 0))
    .slice(0, 10);

  const rows = top.map((e, i) => ({
    rank: i + 1,
    username: e?.username ?? "—",
    wagered: coerceNumber(e?.totalAmount, 0),
    prize: 0,
    avatar: e?.avatar ?? null,
    isAnon: e?.isAnon ?? false,
  }));

  const output = {
    schemaVersion: SCHEMA_VERSION,
    rows,
    prizes: [],
    metadata: {
      source: "csgold",
      fetchedAt: new Date().toISOString(),
      url,
      range: { 
        after, 
        before,
        humanReadable: {
          start: new Date(after).toISOString().split('T')[0],
          end: new Date(before).toISOString().split('T')[0]
        }
      },
      totalEntries: data.length,
    },
  };

  await writeJson("public/data/csgold-leaderboard.json", output);
  
  console.log(`✅ CsGold: Wrote ${rows.length} rows from ${data.length} total entries`);
  
  if (rows.length > 0) {
    console.log(`   🏆 Top player: ${rows[0].username} with $${rows[0].wagered.toFixed(2)}`);
  }
}
