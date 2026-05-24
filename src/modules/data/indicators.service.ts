import type { Ohlcv } from "./providers/market-primary.client.js";

export function computeIndicators(ohlcv: Ohlcv): Record<string, number> {
  const range = ohlcv.high - ohlcv.low;
  const momentum = ohlcv.close - ohlcv.open;
  const volatility = ohlcv.open === 0 ? 0 : range / ohlcv.open;
  return {
    momentum: Number(momentum.toFixed(4)),
    volatility: Number(volatility.toFixed(6)),
    close_to_open: Number((ohlcv.close / ohlcv.open).toFixed(6))
  };
}
