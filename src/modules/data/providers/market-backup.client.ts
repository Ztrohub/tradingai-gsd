import { env } from "../../../config/env.js";
import { fetchYahooMarketHistory, pickLatestBarOnOrBefore, type Ohlcv, type OhlcvBar } from "./yahoo-market.client.js";

const REQUEST_TIMEOUT_MS = 20_000;

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function toFiniteNumber(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
  return Number.isFinite(n) ? n : null;
}

function parseTwelveDataBars(payload: unknown): OhlcvBar[] {
  const parsed = payload as {
    code?: number;
    status?: string;
    values?: Array<{ datetime?: string; open?: string; high?: string; low?: string; close?: string; volume?: string }>;
  };

  if (parsed.code || parsed.status === "error") {
    throw new Error(`twelvedata_error_${parsed.code ?? "unknown"}`);
  }

  const values = parsed.values ?? [];
  const bars: OhlcvBar[] = [];
  for (const row of values) {
    const open = toFiniteNumber(row.open);
    const high = toFiniteNumber(row.high);
    const low = toFiniteNumber(row.low);
    const close = toFiniteNumber(row.close);
    const volume = toFiniteNumber(row.volume);
    if (!row.datetime || open === null || high === null || low === null || close === null || volume === null) continue;
    if (volume <= 0) continue;

    bars.push({
      tradeDate: row.datetime.slice(0, 10),
      open,
      high,
      low,
      close,
      volume
    });
  }

  if (bars.length === 0) {
    throw new Error("twelvedata_data_empty");
  }

  return bars;
}

function buildTwelveDataSymbolVariants(symbol: string): string[] {
  const normalized = normalizeSymbol(symbol);
  const exchange = env.TWELVEDATA_EXCHANGE;
  return [`${normalized}:${exchange}`, normalized, `${normalized}.JK`];
}

async function fetchTwelveDataHistory(symbol: string, lookbackDays: number): Promise<OhlcvBar[]> {
  if (!env.TWELVEDATA_API_KEY) throw new Error("twelvedata_key_missing");

  const outputSize = Math.max(30, Math.min(lookbackDays, 5000));
  const variants = buildTwelveDataSymbolVariants(symbol);
  let lastError: unknown;

  for (const resolvedSymbol of variants) {
    try {
      const url = new URL("https://api.twelvedata.com/time_series");
      url.searchParams.set("symbol", resolvedSymbol);
      url.searchParams.set("interval", "1day");
      url.searchParams.set("outputsize", String(outputSize));
      url.searchParams.set("order", "asc");
      url.searchParams.set("apikey", env.TWELVEDATA_API_KEY);

      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });
      if (!response.ok) throw new Error(`twelvedata_http_${response.status}`);
      const payload = await response.json();
      return parseTwelveDataBars(payload);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("twelvedata_fetch_failed");
}

export async function fetchBackupMarketHistory(symbol: string, lookbackDays = 90) {
  if (env.TWELVEDATA_API_KEY) {
    try {
      return await fetchTwelveDataHistory(symbol, lookbackDays);
    } catch {
      // Falls back to Yahoo when Twelve Data cannot resolve symbol/plan access/availability.
    }
  }
  return fetchYahooMarketHistory(symbol, lookbackDays, "query2.finance.yahoo.com");
}

export async function fetchBackupMarketData(symbol: string, tradeDate: string): Promise<Ohlcv> {
  const history = await fetchBackupMarketHistory(symbol, 180);
  const selected = pickLatestBarOnOrBefore(history, tradeDate);
  if (!selected) throw new Error("backup_data_not_available");
  return {
    open: selected.open,
    high: selected.high,
    low: selected.low,
    close: selected.close,
    volume: selected.volume
  };
}
