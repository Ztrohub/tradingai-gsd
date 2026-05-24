import { apiGet, apiPost, apiPut } from "../lib/api-client.js";

export type WatchlistConfig = {
  targetSize: number;
  manualOverrideEnabled: boolean;
  min: number;
  max: number;
};

export async function loadCurrentWatchlist() {
  return apiGet<{ targetSize: number; symbols: Array<{ symbol: string; rank: number; score: number }> }>("/api/watchlist/current");
}

export async function loadWatchlistHistory() {
  return apiGet<Array<{ id: number; run_id: number | null; target_size: number; created_at: string }>>("/api/watchlist/history");
}

export async function loadDailyDataStatus(date: string) {
  return apiGet<Array<{ symbol: string; market_provider: string; close: number; sentiment_score: number }>>(`/api/data/daily/${date}`);
}

export async function loadWatchlistConfig() {
  return apiGet<WatchlistConfig>("/api/config/watchlist");
}

export async function saveWatchlistConfig(targetSize: number) {
  return apiPut<WatchlistConfig>("/api/config/watchlist", { targetSize });
}

export async function setWatchlistOverrideMode(enabled: boolean) {
  return apiPut<{ manualOverrideEnabled: boolean }>("/api/watchlist/override-mode", { enabled });
}

export async function loadUniverseSymbols() {
  return apiGet<{ symbols: string[] }>("/api/universe");
}

export async function syncUniverse() {
  return apiPost<{ ok: boolean; source: string }>("/api/universe/sync");
}
