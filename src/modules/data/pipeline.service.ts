import { computeIndicators } from "./indicators.service.js";
import { fetchBackupMarketData } from "./providers/market-backup.client.js";
import { fetchPrimaryMarketData } from "./providers/market-primary.client.js";
import { fetchSymbolSentiment } from "./providers/news.client.js";
import { requestWatchlistDebate } from "./providers/ai-engine.client.js";
import { getUniverseSymbols, refreshUniverseSnapshot } from "./universe.service.js";
import {
  appendDataFetchError,
  createWatchlist,
  getLatestWatchlistSymbols,
  readWatchlistConfig,
  upsertIndicators,
  upsertMarketData,
  upsertSentiment,
  upsertWatchlistDebateDecision
} from "./watchlist.repository.js";
import { buildWeeklyFilterDataset } from "./watchlist.service.js";

function tradeDateForRun(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function runWeeklyPipeline(runId: number) {
  await refreshUniverseSnapshot();
  const symbols = await getUniverseSymbols();
  const config = await readWatchlistConfig();
  const { asOfDate, marketContext, universeSnapshot } = await buildWeeklyFilterDataset(symbols);
  const maxResults = Math.max(1, config.targetSize);
  const debate = await requestWatchlistDebate(runId, asOfDate, marketContext, universeSnapshot, maxResults);
  if (!Array.isArray(debate.selected_symbols) || debate.selected_symbols.length === 0) {
    throw new Error("weekly_debate_selected_symbols_empty");
  }

  const normalizedUniverse = new Map(universeSnapshot.map((row) => [row.symbol, row]));
  const selectedSymbols = debate.selected_symbols.map((s) => String(s).trim().toUpperCase()).filter(Boolean);
  const uniqueSelected = Array.from(new Set(selectedSymbols));
  const filteredSelected = uniqueSelected.filter((symbol) => normalizedUniverse.has(symbol));
  if (filteredSelected.length === 0) {
    throw new Error("weekly_debate_selected_symbols_invalid");
  }

  const ranked = filteredSelected.slice(0, maxResults).map((symbol, index) => {
    const row = normalizedUniverse.get(symbol)!;
    const score = Number((1 - index / Math.max(filteredSelected.length, 1)).toFixed(6));
    return {
      symbol,
      rank: index + 1,
      score,
      scoreDetail: {
        source: "meta_agent_rule_engine",
        dynamic_filters: debate.dynamic_filters,
        ranking_rules: debate.ranking_rules,
        market_regime: debate.market_regime,
        rationale: debate.rationale,
        market_context: marketContext,
        universe_row: row,
        agent_reports: debate.agent_reports,
        engine_meta: debate.engine_meta
      }
    };
  });

  await createWatchlist(runId, ranked.length, ranked);

  for (const decision of ranked) {
    await upsertWatchlistDebateDecision({
      runId,
      symbol: decision.symbol,
      decision: "INCLUDE",
      confidence: Number((1 - (decision.rank - 1) / Math.max(ranked.length, 1)).toFixed(6)),
      rankHint: decision.rank,
      rationale: String(debate.rationale ?? ""),
      riskFlags: [],
      debateTrace: {
        macro_economist: JSON.stringify(debate.agent_reports.macro_economist),
        sector_analyst: JSON.stringify(debate.agent_reports.sector_analyst),
        risk_manager: JSON.stringify(debate.agent_reports.risk_manager)
      },
      provider: debate.engine_meta.provider,
      model: debate.engine_meta.model,
      rawResponse: {
        selected_symbol: decision.symbol,
        rank: decision.rank,
        dynamic_filters: debate.dynamic_filters,
        ranking_rules: debate.ranking_rules,
        market_regime: debate.market_regime
      }
    });
  }

  return { selectedCount: ranked.length, symbols: ranked.map((item) => item.symbol) };
}

export async function runDailyPipeline(runId: number) {
  const symbols = await getLatestWatchlistSymbols();
  if (symbols.length === 0) {
    throw new Error("watchlist_empty");
  }
  const tradeDate = tradeDateForRun();
  const processed: string[] = [];
  const skipped: string[] = [];

  for (const symbol of symbols) {
    try {
      let marketProvider = "primary";
      let ohlcv;
      try {
        ohlcv = await fetchPrimaryMarketData(symbol, tradeDate);
      } catch (primaryError) {
        await appendDataFetchError({
          runId,
          tradeDate,
          symbol,
          dataType: "market",
          provider: "primary",
          errorCode: "primary_failed",
          message: String(primaryError),
          retryable: true
        });
        marketProvider = "backup";
        ohlcv = await fetchBackupMarketData(symbol, tradeDate);
      }

      await upsertMarketData(tradeDate, symbol, marketProvider, ohlcv);
      await upsertIndicators(tradeDate, symbol, computeIndicators(ohlcv));
      const sentiment = await fetchSymbolSentiment(symbol, tradeDate);
      await upsertSentiment(tradeDate, symbol, sentiment.provider, sentiment.headlineCount, sentiment.sentimentScore);
      processed.push(symbol);
    } catch (error) {
      skipped.push(symbol);
      await appendDataFetchError({
        runId,
        tradeDate,
        symbol,
        dataType: "daily_symbol",
        provider: "backup",
        errorCode: "symbol_skipped",
        message: String(error),
        retryable: false
      });
    }
  }

  return { tradeDate, processedCount: processed.length, skippedCount: skipped.length, processed, skipped };
}
