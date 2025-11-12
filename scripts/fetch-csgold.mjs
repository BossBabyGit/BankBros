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

// Get current month bounds in UTC milliseconds
function monthBoundsUtcMs(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const startMs = Date.UTC(y, m, 1, 0, 0, 0);
  const endMs   = Date.UTC(y, m + 1, 1, 0, 0, 0) - 1;
  return { after: startMs, before: endMs };
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

  const { after, before } = monthBoundsUtcMs(new Date());

  console.log(`📅 CsGold: Fetching data for period:`);
  console.log(`   Start: ${new Date(after).toISOString()}`);
  console.log(`   End:   ${new Date(before).toISOString()}`);

  const url = "https://api.csgold.gg/affiliate/leaderboard/referrals";
  
  // Match your working PHP script structure EXACTLY
  const body = JSON.stringify({
    key: apiKey,
    type: "WAGER",
    before: before,
    after: after,
  });

  console.log(`📤 CsGold: Sending request with body:`, JSON.parse(body));

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
    // Direct array response (like your PHP example shows)
    data = payload;
    console.log(`📊 CsGold: Received direct array with ${data.length} entries`);
  } else if (payload?.success && Array.isArray(payload?.data)) {
    // Wrapped in success response
    data = payload.data;
    console.log(`📊 CsGold: Received wrapped response with ${data.length} entries`);
  } else if (Array.isArray(payload?.data)) {
    // Just wrapped in data
    data = payload.data;
    console.log(`📊 CsGold: Received data array with ${data.length} entries`);
  } else if (!payload?.success) {
    console.warn(`⚠️  CsGold: API returned success=false or missing success field`);
    console.warn(`⚠️  Full response:`, payload);
  } else {
    console.warn(`⚠️  CsGold: Unexpected response structure. Keys: ${Object.keys(payload).join(', ')}`);
  }

  // If no data, log warning but continue (will use empty array)
  if (data.length === 0) {
    console.warn(`⚠️  CsGold: No leaderboard data returned for this period`);
    console.warn(`⚠️  This might be normal if:
    - The current month just started
    - No players have wagered yet
    - The API key doesn't have data for this period
    - The date range needs adjustment`);
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
      range: { after, before },
      totalEntries: data.length,
    },
  };

  await writeJson("public/data/csgold-leaderboard.json", output);
  
  console.log(`✅ CsGold: Wrote ${rows.length} rows from ${data.length} total entries`);
  
  if (rows.length > 0) {
    console.log(`   Top player: ${rows[0].username} with $${rows[0].wagered.toFixed(2)}`);
  }
}
