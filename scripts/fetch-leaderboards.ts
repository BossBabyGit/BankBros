/**
 * Fetches Dejen + CsGold leaderboard data and writes to /public/data/*.json
 * - Dejen: race id required
 * - CsGold: fully configurable auth headers; graceful fallback on 401
 * Node 18+; compatible with GitHub Actions. Use:
 *   node --experimental-strip-types scripts/fetch-leaderboards.ts
 */

import fs from "fs/promises";
import path from "path";
import process from "process";
import dotenv from "dotenv";

// ==============================
// Constants
// ==============================
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

const CSGOLD_PRIZE_LADDER = [
  { rank: 1, amount: 105 },
  { rank: 2, amount: 65 },
  { rank: 3, amount: 40 },
  { rank: 4, amount: 25 },
  { rank: 5, amount: 15 },
  { rank: 6, amount: 0 },
  { rank: 7, amount: 0 },
  { rank: 8, amount: 0 },
  { rank: 9, amount: 0 },
  { rank: 10, amount: 0 },
];

// A tiny default “empty” fallback so the site stays up even if CsGold auth fails.
const CSGOLD_EMPTY_ROWS = Array.from({ length: 10 }, (_, i) => ({
  rank: i + 1,
  username: "—",
  wagered: 0,
  prize: CSGOLD_PRIZE_LADDER.find(p => p.rank === i + 1)?.amount ?? 0,
}));

// ==============================
// Helpers
// ==============================
function coerceNumber(value: any, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function extractUsername(entry: any, fallback = "Player"): string {
  return (
    entry?.username ??
    entry?.user ??
    entry?.name ??
    entry?.player ??
    entry?.displayName ??
    fallback
  );
}

function extractWagered(entry: any): number {
  const src =
    entry?.wagered ??
    entry?.totalAmount ??
    entry?.amount ??
    entry?.value ??
    entry?.total ??
    0;
  return coerceNumber(src, 0);
}

function pickPrize(entry: any, rank: number, ladder: any[]): any {
  const fromEntry =
    typeof entry?.prize === "object"
      ? entry?.prize?.amount ?? entry?.prize?.value ?? entry?.prize?.total
      : entry?.prize;
  if (fromEntry !== undefined && fromEntry !== null) {
    return { rank, amount: coerceNumber(fromEntry, 0) };
  }
  const mapped = ladder.find((p) => p.rank === rank);
  return mapped ? { rank, amount: mapped.amount } : undefined;
}

function normalizeEntries(entries: any[], ladder: any[]) {
  const prizeByRank = new Map<number, any>();
  const rows = entries.map((entry, index) => {
    const rawRank =
      entry?.rank ??
      entry?.position ??
      entry?.place ??
      entry?.order ??
      entry?.index;
    const nr = typeof rawRank === "string" ? Number(rawRank) : rawRank;
    const rank = Number.isFinite(nr) && nr > 0 ? Number(nr) : index + 1;
    const username = extractUsername(entry, `Player ${rank}`);
    const wagered = extractWagered(entry);
    const prize = pickPrize(entry, rank, ladder);
    if (prize && !prizeByRank.has(rank)) prizeByRank.set(rank, prize);
    return { rank, username, wagered, prize: prize?.amount ?? 0 };
  });

  rows.sort((a, b) => a.rank - b.rank);

  const prizes = ladder.map((p) => ({
    rank: p.rank,
    amount: prizeByRank.get(p.rank)?.amount ?? p.amount,
  }));

  return { rows, prizes };
}

async function fetchJson(url: string, init: RequestInit = {}) {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} – ${url}${body ? ` – ${body.slice(0, 200)}` : ""}`);
  }
  return res.json();
}

async function ensureDataDirectory() {
  const dir = path.resolve("public/data");
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

async function writeJsonFile(filename: string, data: any) {
  const dir = await ensureDataDirectory();
  const file = path.join(dir, filename);
  await fs.writeFile(file, JSON.stringify(data, null, 2));
  console.log("✅ Wrote", file);
}

// ==============================
// Fetchers
// ==============================
async function fetchDejenLeaderboard(raceId: string) {
  const base = process.env.DEJEN_BASE_URL ?? "https://api.dejen.com";
  const url = `${base.replace(/\/+$/,"")}/races/${raceId}`;
  const payload = await fetchJson(url);
  const { rows, prizes } = normalizeEntries(payload?.leaderboard ?? [], DEJEN_PRIZE_LADDER);
  return {
    schemaVersion: SCHEMA_VERSION,
    rows,
    prizes,
    metadata: {
      source: "dejen",
      raceId,
      fetchedAt: new Date().toISOString(),
      url,
    },
  };
}

/**
 * CsGold often differs by environment:
 *  - Some need only `x-api-key: <key>`
 *  - Some need `Authorization: Bearer <token>`
 *  - Some use a different endpoint
 * Make it fully configurable via env:
 *   CSGOLD_BASE_URL        (default https://api.csgold.gg)
 *   CSGOLD_ENDPOINT        (default /affiliate/leaderboard/referrals)
 *   CSGOLD_API_KEY         (your secret)
 *   CSGOLD_AUTH_HEADER     (default x-api-key)
 *   CSGOLD_AUTH_SCHEME     (default raw; can be 'Bearer' to emit Authorization: Bearer <key>)
 *   CSGOLD_EXTRA_HEADERS   (optional JSON string of extra headers)
 */
async function fetchCsGoldLeaderboard() {
  const base = process.env.CSGOLD_BASE_URL ?? "https://api.csgold.gg";
  const endpointPath = process.env.CSGOLD_ENDPOINT ?? "/affiliate/leaderboard/referrals";
  const endpoint = new URL(endpointPath, base);

  const apiKey = process.env.CSGOLD_API_KEY ?? "";
  const authHeader = (process.env.CSGOLD_AUTH_HEADER ?? "x-api-key").toLowerCase();
  const authScheme = (process.env.CSGOLD_AUTH_SCHEME ?? "raw").toLowerCase();

  const headers: Record<string, string> = { Accept: "application/json" };

  if (!apiKey) {
    throw new Error("Missing CSGOLD_API_KEY");
  }

  if (authHeader === "authorization" && authScheme === "bearer") {
    headers["Authorization"] = `Bearer ${apiKey}`;
  } else if (authHeader === "authorization" && authScheme === "token") {
    headers["Authorization"] = `Token ${apiKey}`;
  } else {
    // default: x-api-key: <key>
    headers[authHeader] = apiKey;
  }

  // Optional extra headers
  if (process.env.CSGOLD_EXTRA_HEADERS) {
    try {
      const extra = JSON.parse(process.env.CSGOLD_EXTRA_HEADERS);
      for (const [k, v] of Object.entries(extra)) headers[k] = String(v);
    } catch {
      console.warn("⚠️ CSGOLD_EXTRA_HEADERS is not valid JSON – ignored");
    }
  }

  const payload = await fetchJson(endpoint.toString(), { headers });

  // Accept either array or object with list property
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.leaderboard)
    ? payload.leaderboard
    : Array.isArray(payload?.rows)
    ? payload.rows
    : [];

  const { rows, prizes } = normalizeEntries(list, CSGOLD_PRIZE_LADDER);

  return {
    schemaVersion: SCHEMA_VERSION,
    rows,
    prizes,
    metadata: {
      source: "csgold",
      fetchedAt: new Date().toISOString(),
      url: endpoint.toString(),
    },
  };
}

// ==============================
// Main
// ==============================
async function main() {
  dotenv.config();

  const writes: Promise<any>[] = [];

  // Dejen (failures here should still let CsGold try)
  const dejenRaceId = process.env.DEJEN_RACE_ID;
  if (dejenRaceId) {
    try {
      const dejen = await fetchDejenLeaderboard(dejenRaceId);
      writes.push(writeJsonFile("dejen-leaderboard.json", dejen));
    } catch (err) {
      console.error("⚠️ Dejen fetch failed:", err);
      // Optional: write an all-fallback file instead of skipping
      const { rows, prizes } = normalizeEntries([], DEJEN_PRIZE_LADDER);
      writes.push(
        writeJsonFile("dejen-leaderboard.json", {
          schemaVersion: SCHEMA_VERSION,
          rows,
          prizes,
          metadata: {
            source: "dejen",
            fetchedAt: new Date().toISOString(),
            error: String(err),
          },
        })
      );
    }
  } else {
    console.warn("ℹ️ DEJEN_RACE_ID not set – skipping Dejen");
  }

  // CsGold — NEVER fail the whole run. Write a fallback on error.
  if (process.env.CSGOLD_API_KEY) {
    try {
      const cs = await fetchCsGoldLeaderboard();
      writes.push(writeJsonFile("csgold-leaderboard.json", cs));
    } catch (err: any) {
      console.error("⚠️ CsGold fetch failed; writing fallback:", err?.message ?? err);
      writes.push(
        writeJsonFile("csgold-leaderboard.json", {
          schemaVersion: SCHEMA_VERSION,
          rows: CSGOLD_EMPTY_ROWS,
          prizes: CSGOLD_PRIZE_LADDER,
          metadata: {
            source: "csgold",
            fetchedAt: new Date().toISOString(),
            error: String(err?.message ?? err),
          },
        })
      );
    }
  } else {
    console.warn("ℹ️ CSGOLD_API_KEY not set – skipping CsGold");
  }

  if (!writes.length) {
    console.warn("⚠️ No credentials configured — nothing fetched.");
    return;
  }

  await Promise.all(writes);
  console.log("✅ Leaderboards updated successfully");
}

main().catch((err) => {
  // This catch is now mostly for unexpected write failures.
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
