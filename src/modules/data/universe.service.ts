import {
  createUniverseSnapshot,
  deleteStaticUniverseSnapshots,
  extractSymbols,
  getLatestNonStaticUniverseSnapshot
} from "./universe.repository.js";
import { fetchLq45UniverseFromProvider } from "./providers/universe.client.js";

let staticPurged = false;

async function purgeStaticSnapshotsOnce() {
  if (staticPurged) return;
  await deleteStaticUniverseSnapshots();
  staticPurged = true;
}

export async function refreshUniverseSnapshot(opts: { fallbackToLatest?: boolean } = {}) {
  const fallbackToLatest = opts.fallbackToLatest ?? true;
  try {
    const scraped = await fetchLq45UniverseFromProvider();
    return await createUniverseSnapshot(`scraped_lq45:${scraped.sourceUrl}`, scraped.symbols);
  } catch (error) {
    if (!fallbackToLatest) throw error;
    const latest = await getLatestNonStaticUniverseSnapshot();
    if (!latest) throw error;
    return latest;
  }
}

export async function getUniverseSymbols(): Promise<string[]> {
  await purgeStaticSnapshotsOnce();

  let latest = await getLatestNonStaticUniverseSnapshot();
  if (!latest) {
    const created = await refreshUniverseSnapshot({ fallbackToLatest: true });
    latest = created;
  }
  return extractSymbols(latest);
}

export async function getUniverseState() {
  await purgeStaticSnapshotsOnce();
  const latest = await getLatestNonStaticUniverseSnapshot();
  if (!latest) return null;
  return {
    source: latest.source,
    createdAt: latest.created_at,
    symbols: extractSymbols(latest)
  };
}

function normalizeOne(symbol: string): string {
  const normalized = symbol.trim().toUpperCase();
  if (!/^[A-Z]{2,6}$/.test(normalized)) throw new Error("invalid_symbol");
  return normalized;
}

export async function addUniverseSymbol(symbol: string) {
  const normalized = normalizeOne(symbol);
  const current = await getUniverseSymbols();
  if (current.includes(normalized)) throw new Error("symbol_exists");
  return createUniverseSnapshot("manual_override", [...current, normalized]);
}

export async function updateUniverseSymbol(oldSymbol: string, newSymbol: string) {
  const oldNormalized = normalizeOne(oldSymbol);
  const newNormalized = normalizeOne(newSymbol);
  const current = await getUniverseSymbols();
  if (!current.includes(oldNormalized)) throw new Error("symbol_not_found");
  if (oldNormalized !== newNormalized && current.includes(newNormalized)) throw new Error("symbol_exists");

  const next = current.map((s) => (s === oldNormalized ? newNormalized : s));
  return createUniverseSnapshot("manual_override", next);
}

export async function deleteUniverseSymbol(symbol: string) {
  const normalized = normalizeOne(symbol);
  const current = await getUniverseSymbols();
  if (!current.includes(normalized)) throw new Error("symbol_not_found");
  const next = current.filter((s) => s !== normalized);
  return createUniverseSnapshot("manual_override", next);
}
