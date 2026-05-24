import { fetchYahooMarketHistory, pickLatestBarOnOrBefore, type Ohlcv, type OhlcvBar } from "./yahoo-market.client.js";

export type { Ohlcv };
export type HistoricalOhlcv = OhlcvBar;

export async function fetchPrimaryMarketHistory(symbol: string, lookbackDays = 90): Promise<HistoricalOhlcv[]> {
  return fetchYahooMarketHistory(symbol, lookbackDays, "query1.finance.yahoo.com");
}

export async function fetchPrimaryMarketData(symbol: string, tradeDate: string): Promise<Ohlcv> {
  const history = await fetchPrimaryMarketHistory(symbol, 180);
  const selected = pickLatestBarOnOrBefore(history, tradeDate);
  if (!selected) throw new Error("primary_data_not_available");
  return {
    open: selected.open,
    high: selected.high,
    low: selected.low,
    close: selected.close,
    volume: selected.volume
  };
}
