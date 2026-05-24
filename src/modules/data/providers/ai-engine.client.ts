import { env } from "../../../config/env.js";

export type UniverseSnapshotRow = {
  symbol: string;
  close: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  SMA_20: number;
  SMA_50: number;
  RSI_14: number;
  RVOL_10: number;
  MOMENTUM_5: number;
  MOMENTUM_20: number;
  RELATIVE_STRENGTH_20: number;
  MACRO_TREND: number;
  DAILY_TURNOVER_IDR: number;
};

export type WeeklyMarketContext = {
  benchmark: {
    symbol: string;
    close: number;
    sma20: number;
    sma50: number;
    momentum20: number;
    macro_trend: number;
  };
  sector_performance: Array<{
    sector: string;
    avg_momentum_20: number;
    avg_relative_strength_20: number;
    constituents: number;
  }>;
  universe_stats: {
    symbols: number;
    avg_rsi14: number;
    avg_momentum20: number;
    pct_above_sma20: number;
    pct_above_sma50: number;
  };
};

type WeeklyStrategyResponse = {
  run_id: number;
  as_of_date: string;
  selected_symbols: string[];
  dynamic_filters: Array<{ field: string; operator: string; value: number | string }>;
  ranking_rules: Array<{ field: string; direction: "asc" | "desc"; weight: number }>;
  market_regime: string;
  rationale: string;
  agent_reports: {
    macro_economist: Record<string, unknown>;
    sector_analyst: Record<string, unknown>;
    risk_manager: Record<string, unknown>;
  };
  engine_meta: {
    mode: string;
    provider: string;
    model: string;
    tradingagents_version: string;
  };
};

const DEFAULT_TIMEOUT_MS = 320_000;

type AppError = Error & {
  code?: string;
  detail?: string;
  context?: Record<string, unknown>;
};

function createAppError(message: string, code: string, detail: string, context: Record<string, unknown>): AppError {
  const err = new Error(message) as AppError;
  err.code = code;
  err.detail = detail;
  err.context = context;
  return err;
}

export async function requestWatchlistDebate(
  runId: number,
  asOfDate: string,
  marketContext: WeeklyMarketContext,
  universeSnapshot: UniverseSnapshotRow[],
  maxResults: number
): Promise<WeeklyStrategyResponse> {
  let response: Response;
  try {
    response = await fetch(`${env.AI_ENGINE_URL}/v1/watchlist/debate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        run_id: runId,
        as_of_date: asOfDate,
        market_context: marketContext,
        universe_snapshot: universeSnapshot,
        max_results: maxResults
      }),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
    });
  } catch (error) {
    throw createAppError("ai_engine_network_error", "ai_engine_network_error", String(error), {
      runId,
      asOfDate,
      timeoutMs: DEFAULT_TIMEOUT_MS
    });
  }

  if (!response.ok) {
    const text = await response.text();
    let parsedDetail: Record<string, unknown> | null = null;
    try {
      const parsed = JSON.parse(text) as { detail?: unknown };
      if (parsed && typeof parsed.detail === "object" && parsed.detail !== null) {
        parsedDetail = parsed.detail as Record<string, unknown>;
      }
    } catch {
      parsedDetail = null;
    }
    throw createAppError(`ai_engine_http_${response.status}`, "ai_engine_http_error", text.slice(0, 1000), {
      status: response.status,
      statusText: response.statusText,
      runId,
      asOfDate,
      upstream_code: parsedDetail && typeof parsedDetail.code === "string" ? parsedDetail.code : null,
      upstream_message: parsedDetail && typeof parsedDetail.message === "string" ? parsedDetail.message : null,
      upstream_context: parsedDetail && typeof parsedDetail.context === "object" ? parsedDetail.context : null
    });
  }

  let body: unknown;
  try {
    body = (await response.json()) as unknown;
  } catch (error) {
    throw createAppError("ai_engine_response_json_parse_failed", "ai_engine_response_json_parse_failed", String(error), {
      runId,
      asOfDate
    });
  }

  const parsed = body as Partial<WeeklyStrategyResponse>;
  if (!parsed || !Array.isArray(parsed.selected_symbols) || !Array.isArray(parsed.dynamic_filters) || !Array.isArray(parsed.ranking_rules)) {
    throw createAppError("ai_engine_response_schema_invalid", "ai_engine_response_schema_invalid", "Missing selected_symbols/dynamic_filters/ranking_rules", {
      runId,
      asOfDate,
      keys: parsed && typeof parsed === "object" ? Object.keys(parsed as Record<string, unknown>) : []
    });
  }

  return parsed as WeeklyStrategyResponse;
}
