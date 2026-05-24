export type Ohlcv = { open: number; high: number; low: number; close: number; volume: number };
export type OhlcvBar = Ohlcv & { tradeDate: string };

type YahooHost = "query1.finance.yahoo.com" | "query2.finance.yahoo.com";
type YahooRange = "1mo" | "3mo" | "6mo" | "1y";

const REQUEST_TIMEOUT_MS = 20_000;
const MIN_REQUEST_GAP_MS = 150;
const MAX_RETRIES = 3;

let lastRequestAt = 0;

function toYahooSymbol(symbol: string): string {
  const normalized = symbol.trim().toUpperCase();
  if (normalized.startsWith("^")) return normalized;
  return normalized.endsWith(".JK") ? normalized : `${normalized}.JK`;
}

function rangeForLookback(lookbackDays: number): YahooRange {
  if (lookbackDays <= 30) return "1mo";
  if (lookbackDays <= 90) return "3mo";
  if (lookbackDays <= 180) return "6mo";
  return "1y";
}

function toFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseBars(payload: unknown): OhlcvBar[] {
  const root = payload as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: {
          quote?: Array<{
            open?: Array<number | null>;
            high?: Array<number | null>;
            low?: Array<number | null>;
            close?: Array<number | null>;
            volume?: Array<number | null>;
          }>;
        };
      }>;
      error?: unknown;
    };
  };

  const result = root.chart?.result?.[0];
  if (!result) return [];
  const quote = result.indicators?.quote?.[0];
  if (!quote) return [];

  const timestamps = result.timestamp ?? [];
  const opens = quote.open ?? [];
  const highs = quote.high ?? [];
  const lows = quote.low ?? [];
  const closes = quote.close ?? [];
  const volumes = quote.volume ?? [];

  const bars: OhlcvBar[] = [];
  for (let i = 0; i < timestamps.length; i += 1) {
    const open = toFiniteNumber(opens[i]);
    const high = toFiniteNumber(highs[i]);
    const low = toFiniteNumber(lows[i]);
    const close = toFiniteNumber(closes[i]);
    const volume = toFiniteNumber(volumes[i]);
    if (open === null || high === null || low === null || close === null || volume === null) continue;
    if (volume <= 0) continue;

    bars.push({
      tradeDate: new Date(timestamps[i] * 1000).toISOString().slice(0, 10),
      open,
      high,
      low,
      close,
      volume
    });
  }

  return bars;
}

async function throttleRequests() {
  const now = Date.now();
  const waitMs = Math.max(0, MIN_REQUEST_GAP_MS - (now - lastRequestAt));
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  lastRequestAt = Date.now();
}

function buildChartUrl(host: YahooHost, symbol: string, range: YahooRange): string {
  const resolved = encodeURIComponent(toYahooSymbol(symbol));
  return `https://${host}/v8/finance/chart/${resolved}?interval=1d&range=${range}&includePrePost=false`;
}

async function fetchJsonWithRetry(url: string): Promise<unknown> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    await throttleRequests();
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ai-trade-idx/1.0)",
          Accept: "application/json"
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });

      if (response.status === 429 || response.status >= 500) {
        throw new Error(`market_http_${response.status}`);
      }
      if (!response.ok) {
        throw new Error(`market_http_${response.status}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt === MAX_RETRIES) break;
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }
  throw lastError ?? new Error("market_fetch_failed");
}

export async function fetchYahooMarketHistory(
  symbol: string,
  lookbackDays: number,
  host: YahooHost = "query1.finance.yahoo.com"
): Promise<OhlcvBar[]> {
  const range = rangeForLookback(lookbackDays);
  const payload = await fetchJsonWithRetry(buildChartUrl(host, symbol, range));
  const bars = parseBars(payload);
  if (bars.length === 0) throw new Error("market_data_empty");
  return bars;
}

export function pickLatestBarOnOrBefore(history: OhlcvBar[], tradeDate: string): OhlcvBar | null {
  let selected: OhlcvBar | null = null;
  for (const bar of history) {
    if (bar.tradeDate <= tradeDate) {
      selected = bar;
    }
  }
  return selected;
}
