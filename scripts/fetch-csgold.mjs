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

// UTC month bounds → ms (as your PHP example does)
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

  // EXACTLY like your working PHP: POST body with key/type/after/before (ms)
  const url = "https://api.csgold.gg/affiliate/leaderboard/referrals";
  const body = JSON.stringify({
    key: apiKey,
    type: "WAGER",
    after,
    before,
  });

  const txt = await fetchText(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  let payload = null;
  try { payload = JSON.parse(txt); } catch {
    throw new Error(`Non-JSON CsGold response: ${txt?.slice?.(0,200)}`);
  }

  if (process.env.DEBUG_FETCH) {
    await writeJson("public/data/_debug/csgold-raw.json", payload);
  }

  if (!payload?.success) {
    throw new Error(`CsGold success=false: ${txt?.slice?.(0,200)}`);
  }

  const data = Array.isArray(payload?.data) ? payload.data : [];
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
  }));

  await writeJson("public/data/csgold-leaderboard.json", {
    schemaVersion: SCHEMA_VERSION,
    rows,
    prizes: [],
    metadata: {
      source: "csgold",
      fetchedAt: new Date().toISOString(),
      url,
      range: { after, before },
    },
  });
}
