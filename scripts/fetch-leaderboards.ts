/**
 * Fetches Dejen + CsGold leaderboard data and writes it to /public/data/*.json
 * Compatible with GitHub Actions or local manual runs (Node 18+).
 */

import fs from "fs/promises";
import path from "path";
import process from "process";
import dotenv from "dotenv";

// ==============================
// Constants
// ==============================
const SCHEMA_VERSION = 1;
const DEFAULT_TIMEOUT_MS = 15000;

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
  if (fromEntry) return { rank, amount: coerceNumber(fromEntry, 0) };
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
    const rank = Number.isFinite(rawRank) ? Number(rawRank) : index + 1;
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

async function fetchJson(url: string, init: any = {}) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`HTTP ${res.status} – ${url}`);
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
  const base = "https://api.dejen.com";
  const url = `${base}/races/${raceId}`;
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

// ✅ Fixed version — uses correct CsGold endpoint + API key
async function fetchCsGoldLeaderboard(apiKey: string) {
  const base = process.env.CSGOLD_BASE_URL ?? "https://api.csgold.gg";
  const endpoint = new URL("/affiliate/leaderboard/referrals", base);

  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${apiKey}`,
    "x-api-key": apiKey,
  };

  const payload = await fetchJson(endpoint.toString(), { headers });
  if (!Array.isArray(payload))
    throw new Error("Unexpected CsGold response – expected array");

  const { rows, prizes } = normalizeEntries(payload, CSGOLD_PRIZE_LADDER);
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

  const dejenRaceId = process.env.DEJEN_RACE_ID;
  const csGoldApiKey = process.env.CSGOLD_API_KEY;
  const writes: Promise<any>[] = [];

  if (dejenRaceId) {
    const dejen = await fetchDejenLeaderboard(dejenRaceId);
    writes.push(writeJsonFile("dejen-leaderboard.json", dejen));
  }

  if (csGoldApiKey) {
    const cs = await fetchCsGoldLeaderboard(csGoldApiKey);
    writes.push(writeJsonFile("csgold-leaderboard.json", cs));
  }

  if (!writes.length) {
    console.warn("⚠️ No credentials configured — nothing fetched.");
    return;
  }

  await Promise.all(writes);
  console.log("✅ Leaderboards updated successfully");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
