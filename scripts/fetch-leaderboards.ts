import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'public', 'data');
const DEFAULT_TIMEOUT_MS = 15_000;
const SCHEMA_VERSION = 1;

const BANKBROS_PRIZE_LADDER = [
  { rank: 1, amount: 1100, currency: 'USD', label: '$1,100 cash' },
  { rank: 2, amount: 750, currency: 'USD', label: '$750 cash' },
  { rank: 3, amount: 500, currency: 'USD', label: '$500 cash' },
  { rank: 4, amount: 275, currency: 'USD', label: '$275 cash' },
  { rank: 5, amount: 150, currency: 'USD', label: '$150 cash' },
  { rank: 6, amount: 100, currency: 'USD', label: '$100 cash' },
  { rank: 7, amount: 75, currency: 'USD', label: '$75 cash' },
  { rank: 8, amount: 50, currency: 'USD', label: '$50 cash' },
  { rank: 9, amount: 30, currency: 'USD', label: '$30 cash' },
  { rank: 10, amount: 20, currency: 'USD', label: '$20 cash' },
];

const CSGOLD_PRIZE_LADDER = [
  { rank: 1, amount: 500, currency: 'USD', label: '$500 cash' },
  { rank: 2, amount: 350, currency: 'USD', label: '$350 cash' },
  { rank: 3, amount: 200, currency: 'USD', label: '$200 cash' },
  { rank: 4, amount: 125, currency: 'USD', label: '$125 cash' },
  { rank: 5, amount: 100, currency: 'USD', label: '$100 cash' },
  { rank: 6, amount: 75, currency: 'USD', label: '$75 cash' },
  { rank: 7, amount: 50, currency: 'USD', label: '$50 cash' },
  { rank: 8, amount: 25, currency: 'USD', label: '$25 cash' },
];

function coerceNumber(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.,-]/g, '').replace(/,(?=\d{3}(\D|$))/g, '');
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  return fallback;
}

function coerceString(value) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  return '';
}

function getNestedString(entry, keys) {
  for (const key of keys) {
    if (!entry || typeof entry !== 'object') break;
    const val = entry[key];
    if (typeof val === 'string' && val.trim()) return val.trim();
    if (val && typeof val === 'object') {
      const nested = getNestedString(val, keys);
      if (nested) return nested;
    }
  }
  return '';
}

function extractUsername(entry, fallback) {
  const directKeys = [
    'username', 'userName', 'user_name', 'name', 'displayName',
    'player', 'playerName', 'nickname', 'alias', 'handle', 'user',
  ];
  for (const key of directKeys) {
    const value = entry?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (value && typeof value === 'object') {
      const nested = getNestedString(value, directKeys);
      if (nested) return nested;
    }
  }
  const nestedParents = ['user', 'player', 'account', 'profile'];
  for (const parent of nestedParents) {
    const obj = entry?.[parent];
    if (obj && typeof obj === 'object') {
      const nested = extractUsername(obj, '');
      if (nested) return nested;
    }
  }
  return fallback;
}

function extractWagered(entry) {
  const numericKeys = [
    'wagered', 'wager', 'amount', 'totalAmount', 'totalWagered',
    'volume', 'value', 'score', 'points', 'total', 'net',
  ];
  for (const key of numericKeys) {
    const value = entry?.[key];
    if (value === undefined) continue;
    const parsed = coerceNumber(value, Number.NaN);
    if (Number.isFinite(parsed)) return parsed;
  }
  const numericParents = ['stats', 'totals'];
  for (const parent of numericParents) {
    const obj = entry?.[parent];
    if (obj && typeof obj === 'object') {
      const nested = extractWagered(obj);
      if (Number.isFinite(nested)) return nested;
    }
  }
  return 0;
}

function parsePrizeFromValue(value, rank, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { rank, amount: value, currency: fallback?.currency ?? 'USD', label: fallback?.label };
  }
  if (typeof value === 'string') {
    const amount = coerceNumber(value, Number.NaN);
    if (Number.isFinite(amount)) {
      const currencyMatch = value.match(/[A-Z]{3}|\$/);
      const currency = currencyMatch ? currencyMatch[0].replace('$', 'USD') : fallback?.currency ?? 'USD';
      return { rank, amount, currency, label: fallback?.label ?? value.trim() };
    }
  }
  if (typeof value === 'object') {
    const amountCandidate = value.amount ?? value.value ?? value.total;
    const currencyCandidate = value.currency ?? value.iso ?? value.symbol;
    const labelCandidate = value.label ?? value.display ?? value.description;
    const parsedAmount = coerceNumber(amountCandidate, Number.NaN);
    const currency = currencyCandidate ? coerceString(currencyCandidate) : fallback?.currency ?? 'USD';
    const label = coerceString(labelCandidate) || fallback?.label;
    if (Number.isFinite(parsedAmount)) {
      return { rank, amount: parsedAmount, currency: currency || 'USD', label };
    }
  }
  return fallback;
}

function pickPrize(entry, rank, ladder) {
  const directKeys = ['prize', 'reward', 'payout', 'bonus', 'prizes', 'rewardAmount'];
  for (const key of directKeys) {
    const value = entry?.[key];
    if (value === undefined) continue;
    const fallback = ladder.find((p) => p.rank === rank);
    const parsed = parsePrizeFromValue(value, rank, fallback);
    if (parsed) return parsed;
  }
  const nestedParents = ['prize', 'reward', 'rewards', 'payout'];
  for (const parent of nestedParents) {
    const obj = entry?.[parent];
    if (obj && typeof obj === 'object') {
      const fallback = ladder.find((p) => p.rank === rank);
      const parsed = parsePrizeFromValue(obj, rank, fallback);
      if (parsed) return parsed;
    }
  }
  return ladder.find((p) => p.rank === rank);
}

function normalizeEntries(entries, ladder) {
  const prizeByRank = new Map();
  const rows = entries.map((entry, index) => {
    const rawRank = entry?.rank ?? entry?.position ?? entry?.place ?? entry?.order ?? entry?.index;
    const candidateRank = coerceNumber(rawRank, Number.NaN);
    const rank = Number.isFinite(candidateRank) ? candidateRank : index + 1;
    const username = extractUsername(entry, `Player ${rank}`) || `Player ${rank}`;
    const wagered = extractWagered(entry);
    const prize = pickPrize(entry, rank, ladder);
    if (prize && !prizeByRank.has(rank)) prizeByRank.set(rank, prize);
    return prize ? { rank, username, wagered, prize } : { rank, username, wagered };
  });

  rows.sort((a, b) => a.rank - b.rank);

  const prizes = Array.from(prizeByRank.values());
  for (const fallback of ladder) {
    if (!prizes.some((p) => p.rank === fallback.rank) && fallback.amount > 0) {
      prizes.push(fallback);
    }
  }
  prizes.sort((a, b) => a.rank - b.rank);

  return { rows, prizes };
}

async function fetchWithTimeout(url, init = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

async function fetchJson(url, init = {}) {
  const response = await fetchWithTimeout(url, init);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Request failed (${response.status} ${response.statusText}) for ${url}: ${text}`);
  }
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Failed to parse JSON from ${url}: ${error.message}`);
  }
}

function findLeaderboardEntries(payload) {
  if (!payload) return undefined;
  if (Array.isArray(payload.rows)) return payload.rows;
  if (Array.isArray(payload.leaderboard)) return payload.leaderboard;
  if (Array.isArray(payload.entries)) return payload.entries;
  if (Array.isArray(payload)) {
    if (payload.every((item) => item && typeof item === 'object')) {
      const hasRank = payload.some((item) => item && typeof item === 'object' &&
        ('rank' in item || 'position' in item || 'place' in item || 'order' in item || 'index' in item));
      const hasUser = payload.some((item) => item && typeof item === 'object' &&
        ('username' in item || 'userName' in item || 'user' in item || 'player' in item || 'name' in item));
      if (hasRank || hasUser) return payload;
    }
    for (const item of payload) {
      const nested = findLeaderboardEntries(item);
      if (nested) return nested;
    }
    return undefined;
  }
  if (typeof payload === 'object') {
    for (const value of Object.values(payload)) {
      const nested = findLeaderboardEntries(value);
      if (nested) return nested;
    }
  }
  return undefined;
}

async function fetchDejenLeaderboard(raceId) {
  const base = process.env.DEJEN_BASE_URL ?? 'https://api.dejen.com';
  const candidatePaths = [
    `/races/${raceId}/leaderboard`,
    `/races/${raceId}`,
    `/public/races/${raceId}`,
    `/api/races/${raceId}/leaderboard`,
    `/api/races/${raceId}`,
  ];

  const headers = { Accept: 'application/json' };
  let lastError;

  for (const pathCandidate of candidatePaths) {
    const url = new URL(pathCandidate, base);
    try {
      const payload = await fetchJson(url.toString(), { headers });
      const entries = findLeaderboardEntries(payload);
      if (!entries) throw new Error('Unable to locate leaderboard entries in response');
      const { rows, prizes } = normalizeEntries(entries, BANKBROS_PRIZE_LADDER);
      return {
        schemaVersion: SCHEMA_VERSION,
        rows,
        prizes,
        metadata: {
          source: 'dejen',
          raceId,
          resolvedUrl: url.toString(),
          baseUrl: base,
          fetchedAt: new Date().toISOString(),
          rawCount: Array.isArray(entries) ? entries.length : 0,
        },
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`Failed to fetch Dejen leaderboard for race "${raceId}": ${lastError?.message ?? 'unknown error'}`);
}

async function fetchCsGoldLeaderboard(apiKey) {
  const base = process.env.CSGOLD_BASE_URL ?? 'https://api.csgold.gg';
  const leaderboardId = process.env.CSGOLD_LEADERBOARD_ID ?? 'bankbros';
  const candidatePaths = [
    `/api/leaderboards/${leaderboardId}`,
    `/api/leaderboard/${leaderboardId}`,
    `/v1/leaderboards/${leaderboardId}`,
    `/leaderboards/${leaderboardId}`,
  ];

  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${apiKey}`,
    'x-api-key': apiKey,
  };

  let lastError;

  for (const pathCandidate of candidatePaths) {
    const url = new URL(pathCandidate, base);
    try {
      const payload = await fetchJson(url.toString(), { headers });
      const entries = findLeaderboardEntries(payload);
      if (!entries) throw new Error('Unable to locate leaderboard entries in response');
      const { rows, prizes } = normalizeEntries(entries, CSGOLD_PRIZE_LADDER);
      return {
        schemaVersion: SCHEMA_VERSION,
        rows,
        prizes,
        metadata: {
          source: 'csgold',
          leaderboardId,
          resolvedUrl: url.toString(),
          baseUrl: base,
          fetchedAt: new Date().toISOString(),
          rawCount: Array.isArray(entries) ? entries.length : 0,
        },
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`Failed to fetch CsGold leaderboard for "${leaderboardId}": ${lastError?.message ?? 'unknown error'}`);
}

async function ensureDataDirectory() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function writeJsonFile(filename, payload) {
  const destination = path.join(DATA_DIR, filename);
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  await fs.writeFile(destination, json, 'utf8');
}

async function loadEnvFile() {
  const envPath = path.join(ROOT_DIR, '.env');
  try {
    const content = await fs.readFile(envPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const equalsIndex = trimmed.indexOf('=');
      if (equalsIndex === -1) continue;
      const key = trimmed.slice(0, equalsIndex).trim();
      const value = trimmed.slice(equalsIndex + 1).trim();
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      console.warn(`Failed to load .env file: ${error.message}`);
    }
  }
}

async function main() {
  await loadEnvFile();
  const dejenRaceId = process.env.DEJEN_RACE_ID;
  const csGoldApiKey = process.env.CSGOLD_API_KEY;

  if (!dejenRaceId && !csGoldApiKey) {
    throw new Error('Missing DEJEN_RACE_ID and CSGOLD_API_KEY – set at least one to update leaderboards.');
  }

  await ensureDataDirectory();

  const writes = [];
  const summary = {};

  if (dejenRaceId) {
    const dejen = await fetchDejenLeaderboard(dejenRaceId);
    writes.push(writeJsonFile('bankbros-leaderboard.json', dejen));
    summary.dejen = dejen.rows.length;
  } else {
    console.warn('Skipping Dejen leaderboard fetch – DEJEN_RACE_ID not configured.');
  }

  if (csGoldApiKey) {
    const csGold = await fetchCsGoldLeaderboard(csGoldApiKey);
    writes.push(writeJsonFile('csgold-leaderboard.json', csGold));
    summary.csGold = csGold.rows.length;
  } else {
    console.warn('Skipping CsGold leaderboard fetch – CSGOLD_API_KEY not configured.');
  }

  await Promise.all(writes);

  console.log('Leaderboards updated:', summary);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
