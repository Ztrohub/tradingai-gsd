import { createWatchlist, type RankedSymbol } from "./watchlist.repository.js";
import { fetchBackupMarketHistory } from "./providers/market-backup.client.js";
import { fetchPrimaryMarketHistory } from "./providers/market-primary.client.js";
import type { UniverseSnapshotRow, WeeklyMarketContext } from "./providers/ai-engine.client.js";

type MarketBar = {
  tradeDate: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type CandidateType = "retrieval_candidate" | "reject";

type FeatureSnapshot = {
  vector: number[];
  lastOpen: number;
  lastHigh: number;
  lastLow: number;
  lastClose: number;
  lastVolume: number;
  latestTradeDate: string;
  sma20: number;
  sma50: number;
  rsi14: number;
  rvol10: number;
  turnover20: number;
  momentum5: number;
  momentum20: number;
  avgRange20: number;
  upConsistency20: number;
  closeLocation20: number;
  supportDistance20: number;
  distanceToSma20: number;
  distanceToSma50: number;
  benchmarkClose: number;
  benchmarkSma20: number;
  benchmarkSma50: number;
  benchmarkMomentum20: number;
  macroTrend: number;
  relativeStrength20: number;
};

type AnalogRecord = {
  symbol: string;
  anchorDate: string;
  vector: number[];
  forward5Return: number;
  forward10Return: number;
  maxDrawdown10: number;
  snapshot: FeatureSnapshot;
};

export type CandidateRaw = {
  symbol: string;
  candidateType: CandidateType;
  priority: number;
  rejectionReason: string | null;
  analogEdgeRaw: number;
  convictionRaw: number;
  downsideProtectionRaw: number;
  macroAlignmentRaw: number;
  liquidityRaw: number;
  complete: boolean;
  analogCount: number;
  avgSimilarity: number;
  expected5Return: number;
  expected10Return: number;
  positiveRate10: number;
  downsideMean10: number;
  feature: FeatureSnapshot;
  topMatches: Array<{
    symbol: string;
    anchorDate: string;
    similarity: number;
    forward5Return: number;
    forward10Return: number;
    maxDrawdown10: number;
    rsi14: number;
    rvol10: number;
    distanceToSma20: number;
    relativeStrength20: number;
  }>;
};

type Candidate = {
  symbol: string;
  candidateType: CandidateType;
  priority: number;
  analogEdge: number;
  conviction: number;
  downsideProtection: number;
  macroAlignment: number;
  liquidity: number;
  score: number;
  complete: boolean;
  scoreDetail: Record<string, unknown>;
};

const BENCHMARK_SYMBOL = "^JKSE";
const LOOKBACK_DAYS = 365;
const WINDOW_BARS = 80;
const MIN_FEATURE_BARS = 60;
const MIN_HISTORY_BARS = 140;
const FORWARD_DAYS = 10;
const TOP_ANALOGS = 12;
const MIN_ANALOGS = 8;

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeTo100(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 1;
  if (max <= min) return 50;
  return clamp(1 + ((value - min) / (max - min)) * 99, 1, 100);
}

function computeRsi(closes: number[], period = 14): number {
  if (closes.length <= period) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i += 1) {
    const delta = closes[i] - closes[i - 1];
    if (delta >= 0) gains += delta;
    else losses -= delta;
  }
  if (losses === 0) return 100;
  const rs = gains / Math.max(losses, 1e-6);
  return 100 - 100 / (1 + rs);
}

function computeMacroTrend(close: number, sma20: number, sma50: number, momentum20: number): number {
  let score = 0;
  if (close >= sma20) score += 1;
  if (sma20 >= sma50) score += 1;
  if (momentum20 >= 0) score += 1;
  return score / 3;
}

function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length !== right.length || left.length === 0) return 0;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let i = 0; i < left.length; i += 1) {
    dot += left[i] * right[i];
    leftNorm += left[i] * left[i];
    rightNorm += right[i] * right[i];
  }
  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dot / Math.sqrt(leftNorm * rightNorm);
}

function emptyFeatureSnapshot(symbol = ""): FeatureSnapshot {
  void symbol;
  return {
    vector: [],
    lastOpen: 0,
    lastHigh: 0,
    lastLow: 0,
    lastClose: 0,
    lastVolume: 0,
    latestTradeDate: "",
    sma20: 0,
    sma50: 0,
    rsi14: 50,
    rvol10: 0,
    turnover20: 0,
    momentum5: 0,
    momentum20: 0,
    avgRange20: 0,
    upConsistency20: 0,
    closeLocation20: 0,
    supportDistance20: 0,
    distanceToSma20: 0,
    distanceToSma50: 0,
    benchmarkClose: 0,
    benchmarkSma20: 0,
    benchmarkSma50: 0,
    benchmarkMomentum20: 0,
    macroTrend: 0,
    relativeStrength20: 0
  };
}

function emptyCandidateRaw(symbol: string, reason: string): CandidateRaw {
  return {
    symbol,
    candidateType: "reject",
    priority: 0,
    rejectionReason: reason,
    analogEdgeRaw: 0,
    convictionRaw: 0,
    downsideProtectionRaw: 0,
    macroAlignmentRaw: 0,
    liquidityRaw: 0,
    complete: false,
    analogCount: 0,
    avgSimilarity: 0,
    expected5Return: 0,
    expected10Return: 0,
    positiveRate10: 0,
    downsideMean10: 0,
    feature: emptyFeatureSnapshot(symbol),
    topMatches: []
  };
}

type BenchmarkContext = {
  history: MarketBar[];
  indexByDate: Map<string, number>;
};

function createBenchmarkContext(history: MarketBar[]): BenchmarkContext {
  return {
    history,
    indexByDate: new Map(history.map((bar, index) => [bar.tradeDate, index]))
  };
}

function benchmarkWindowForDate(context: BenchmarkContext, tradeDate: string): MarketBar[] {
  const direct = context.indexByDate.get(tradeDate);
  if (direct !== undefined) {
    return context.history.slice(Math.max(0, direct - WINDOW_BARS + 1), direct + 1);
  }

  let fallbackIndex = -1;
  for (let i = 0; i < context.history.length; i += 1) {
    if (context.history[i].tradeDate <= tradeDate) fallbackIndex = i;
    else break;
  }
  if (fallbackIndex < 0) return [];
  return context.history.slice(Math.max(0, fallbackIndex - WINDOW_BARS + 1), fallbackIndex + 1);
}

function extractFeatureSnapshot(window: MarketBar[], benchmarkWindow: MarketBar[]): FeatureSnapshot | null {
  if (window.length < MIN_FEATURE_BARS || benchmarkWindow.length < MIN_FEATURE_BARS) {
    return null;
  }

  const latest = window[window.length - 1];
  const tail10 = window.slice(-10);
  const tail20 = window.slice(-20);
  const tail50 = window.slice(-50);
  const closes = window.map((bar) => bar.close);
  const close5Ago = tail10[tail10.length - 6]?.close ?? 0;
  const close20Ago = tail20[0]?.close ?? 0;

  if (latest.close <= 0 || close5Ago <= 0 || close20Ago <= 0) {
    return null;
  }

  const sma20 = average(tail20.map((bar) => bar.close));
  const sma50 = average(tail50.map((bar) => bar.close));
  const rsi14 = computeRsi(closes, 14);
  const previousVolume10 = average(tail10.slice(0, -1).map((bar) => bar.volume));
  const rvol10 = previousVolume10 > 0 ? latest.volume / previousVolume10 : 0;
  const turnover20 = average(tail20.map((bar) => bar.close * bar.volume));
  const momentum5 = latest.close / close5Ago - 1;
  const momentum20 = latest.close / close20Ago - 1;
  const avgRange20 = average(tail20.map((bar) => (bar.close > 0 ? (bar.high - bar.low) / bar.close : 0)));

  let upMoves = 0;
  for (let i = 1; i < tail20.length; i += 1) {
    if (tail20[i].close >= tail20[i - 1].close) upMoves += 1;
  }
  const upConsistency20 = upMoves / Math.max(1, tail20.length - 1);

  const support20 = Math.min(...tail20.map((bar) => bar.low));
  const resistance20 = Math.max(...tail20.map((bar) => bar.high));
  const range20 = Math.max(resistance20 - support20, 1e-6);
  const closeLocation20 = clamp((latest.close - support20) / range20, 0, 1);
  const supportDistance20 = latest.close > 0 ? Math.max(0, latest.close - support20) / latest.close : 0;
  const distanceToSma20 = sma20 > 0 ? latest.close / sma20 - 1 : 0;
  const distanceToSma50 = sma50 > 0 ? latest.close / sma50 - 1 : 0;

  const benchmarkLatest = benchmarkWindow[benchmarkWindow.length - 1];
  const benchmarkTail20 = benchmarkWindow.slice(-20);
  const benchmarkTail50 = benchmarkWindow.slice(-50);
  const benchmarkSma20 = average(benchmarkTail20.map((bar) => bar.close));
  const benchmarkSma50 = average(benchmarkTail50.map((bar) => bar.close));
  const benchmarkClose20Ago = benchmarkTail20[0]?.close ?? 0;
  const benchmarkMomentum20 = benchmarkClose20Ago > 0 ? benchmarkLatest.close / benchmarkClose20Ago - 1 : 0;
  const macroTrend = computeMacroTrend(benchmarkLatest.close, benchmarkSma20, benchmarkSma50, benchmarkMomentum20);
  const relativeStrength20 = momentum20 - benchmarkMomentum20;

  const vector = [
    clamp((rsi14 - 50) / 25, -2, 2),
    clamp((rvol10 - 1) / 1.5, -2, 2),
    clamp(distanceToSma20 * 12, -2, 2),
    clamp(distanceToSma50 * 12, -2, 2),
    clamp(momentum5 * 20, -2, 2),
    clamp(momentum20 * 12, -2, 2),
    clamp((closeLocation20 - 0.5) * 2, -1, 1),
    clamp((upConsistency20 - 0.5) * 2.5, -1.5, 1.5),
    clamp(relativeStrength20 * 12, -2, 2),
    clamp((macroTrend - 0.5) * 2, -1, 1),
    clamp(avgRange20 * 20, 0, 2)
  ];

  return {
    vector,
    lastOpen: latest.open,
    lastHigh: latest.high,
    lastLow: latest.low,
    lastClose: latest.close,
    lastVolume: latest.volume,
    latestTradeDate: latest.tradeDate,
    sma20,
    sma50,
    rsi14,
    rvol10,
    turnover20,
    momentum5,
    momentum20,
    avgRange20,
    upConsistency20,
    closeLocation20,
    supportDistance20,
    distanceToSma20,
    distanceToSma50,
    benchmarkClose: benchmarkLatest.close,
    benchmarkSma20,
    benchmarkSma50,
    benchmarkMomentum20,
    macroTrend,
    relativeStrength20
  };
}

export function extractFeatureSnapshotFromHistory(symbol: string, history: MarketBar[], benchmarkHistory: MarketBar[]): FeatureSnapshot | null {
  void symbol;
  if (history.length < WINDOW_BARS || benchmarkHistory.length < WINDOW_BARS) return null;
  return extractFeatureSnapshot(history.slice(-WINDOW_BARS), benchmarkHistory.slice(-WINDOW_BARS));
}

function summarizeMatches(matches: Array<AnalogRecord & { similarity: number }>) {
  if (matches.length === 0) {
    return {
      analogCount: 0,
      avgSimilarity: 0,
      expected5Return: 0,
      expected10Return: 0,
      positiveRate10: 0,
      downsideMean10: 0
    };
  }

  const weights = matches.map((match) => Math.max(match.similarity, 0) ** 3);
  const weightSum = weights.reduce((sum, value) => sum + value, 0) || matches.length;
  let expected5Return = 0;
  let expected10Return = 0;
  let positiveRate10 = 0;
  let downsideMean10 = 0;
  let avgSimilarity = 0;

  for (let i = 0; i < matches.length; i += 1) {
    const weight = weights[i] || 1;
    const match = matches[i];
    expected5Return += match.forward5Return * weight;
    expected10Return += match.forward10Return * weight;
    positiveRate10 += (match.forward10Return > 0 ? 1 : 0) * weight;
    downsideMean10 += match.maxDrawdown10 * weight;
    avgSimilarity += match.similarity * weight;
  }

  return {
    analogCount: matches.length,
    avgSimilarity: avgSimilarity / weightSum,
    expected5Return: expected5Return / weightSum,
    expected10Return: expected10Return / weightSum,
    positiveRate10: positiveRate10 / weightSum,
    downsideMean10: downsideMean10 / weightSum
  };
}

function buildHistoricalCorpus(
  historiesBySymbol: Map<string, MarketBar[]>,
  benchmarkContext: BenchmarkContext
): AnalogRecord[] {
  const corpus: AnalogRecord[] = [];

  for (const [symbol, history] of historiesBySymbol.entries()) {
    if (history.length < MIN_HISTORY_BARS) continue;

    for (let anchor = WINDOW_BARS - 1; anchor <= history.length - FORWARD_DAYS - 1; anchor += 1) {
      const anchorDate = history[anchor].tradeDate;
      const window = history.slice(anchor - WINDOW_BARS + 1, anchor + 1);
      const benchmarkWindow = benchmarkWindowForDate(benchmarkContext, anchorDate);
      const snapshot = extractFeatureSnapshot(window, benchmarkWindow);
      if (!snapshot) continue;

      const futureWindow = history.slice(anchor + 1, anchor + FORWARD_DAYS + 1);
      const close5Forward = history[anchor + 5]?.close ?? history[anchor].close;
      const close10Forward = history[anchor + 10]?.close ?? history[anchor].close;
      const maxDrawdown10 = Math.min(...futureWindow.map((bar) => bar.low)) / history[anchor].close - 1;

      corpus.push({
        symbol,
        anchorDate,
        vector: snapshot.vector,
        forward5Return: close5Forward / history[anchor].close - 1,
        forward10Return: close10Forward / history[anchor].close - 1,
        maxDrawdown10,
        snapshot
      });
    }
  }

  return corpus;
}

export function analyzeCandidateFromHistory(
  symbol: string,
  history: MarketBar[],
  benchmarkHistory: MarketBar[],
  corpus: AnalogRecord[]
): CandidateRaw {
  if (history.length < MIN_HISTORY_BARS) {
    return emptyCandidateRaw(symbol, "insufficient_history");
  }

  const feature = extractFeatureSnapshotFromHistory(symbol, history, benchmarkHistory);
  if (!feature) {
    return emptyCandidateRaw(symbol, "feature_extraction_failed");
  }

  const latestDate = history[history.length - 1].tradeDate;
  const matches = corpus
    .filter((record) => !(record.symbol === symbol && record.anchorDate === latestDate))
    .map((record) => ({ ...record, similarity: cosineSimilarity(feature.vector, record.vector) }))
    .filter((record) => Number.isFinite(record.similarity) && record.similarity > 0.15)
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, TOP_ANALOGS);

  const summary = summarizeMatches(matches);
  const analogEdgeRaw =
    summary.expected10Return * 0.55 +
    summary.expected5Return * 0.2 +
    summary.positiveRate10 * 0.15 +
    feature.relativeStrength20 * 0.1 -
    Math.abs(Math.min(0, summary.downsideMean10)) * 0.35;
  const convictionRaw = summary.avgSimilarity * 0.6 + summary.positiveRate10 * 0.4;
  const downsideProtectionRaw = 1 + Math.max(-1, summary.downsideMean10);
  const macroAlignmentRaw = feature.macroTrend * 0.65 + clamp(feature.relativeStrength20 * 4 + 0.5, 0, 1) * 0.35;
  const liquidityRaw = Math.log10(Math.max(1, feature.turnover20));

  let rejectionReason: string | null = null;
  if (summary.analogCount < MIN_ANALOGS) rejectionReason = "insufficient_analogs";
  else if (summary.expected10Return <= 0) rejectionReason = "negative_analog_expectancy";
  else if (summary.positiveRate10 < 0.5) rejectionReason = "weak_analog_win_rate";
  else if (summary.downsideMean10 <= -0.08) rejectionReason = "analog_drawdown_too_high";

  const complete = rejectionReason === null;
  const candidateType: CandidateType = complete ? "retrieval_candidate" : "reject";

  return {
    symbol,
    candidateType,
    priority: complete ? 1 : 0,
    rejectionReason,
    analogEdgeRaw,
    convictionRaw,
    downsideProtectionRaw,
    macroAlignmentRaw,
    liquidityRaw,
    complete,
    analogCount: summary.analogCount,
    avgSimilarity: summary.avgSimilarity,
    expected5Return: summary.expected5Return,
    expected10Return: summary.expected10Return,
    positiveRate10: summary.positiveRate10,
    downsideMean10: summary.downsideMean10,
    feature,
    topMatches: matches.slice(0, 5).map((match) => ({
      symbol: match.symbol,
      anchorDate: match.anchorDate,
      similarity: Number(match.similarity.toFixed(6)),
      forward5Return: Number(match.forward5Return.toFixed(6)),
      forward10Return: Number(match.forward10Return.toFixed(6)),
      maxDrawdown10: Number(match.maxDrawdown10.toFixed(6)),
      rsi14: Number(match.snapshot.rsi14.toFixed(4)),
      rvol10: Number(match.snapshot.rvol10.toFixed(4)),
      distanceToSma20: Number(match.snapshot.distanceToSma20.toFixed(6)),
      relativeStrength20: Number(match.snapshot.relativeStrength20.toFixed(6))
    }))
  };
}

async function fetchHistoryWithFallback(symbol: string) {
  try {
    return await fetchPrimaryMarketHistory(symbol, LOOKBACK_DAYS);
  } catch {
    return await fetchBackupMarketHistory(symbol, LOOKBACK_DAYS);
  }
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const safeConcurrency = Math.max(1, Math.min(concurrency, Math.max(1, items.length)));
  const results = new Array<R>(items.length);
  let index = 0;

  const workers = Array.from({ length: safeConcurrency }, async () => {
    while (true) {
      const current = index;
      if (current >= items.length) return;
      index += 1;
      results[current] = await fn(items[current], current);
    }
  });

  await Promise.all(workers);
  return results;
}

async function generateCandidates(symbols: string[]): Promise<Candidate[]> {
  if (symbols.length === 0) return [];

  const benchmarkHistory = await fetchHistoryWithFallback(BENCHMARK_SYMBOL);
  const benchmarkContext = createBenchmarkContext(benchmarkHistory);

  const histories = await mapWithConcurrency(symbols, 5, async (symbol) => ({
    symbol,
    history: await fetchHistoryWithFallback(symbol)
  }));

  const historiesBySymbol = new Map(histories.map((entry) => [entry.symbol, entry.history]));
  const corpus = buildHistoricalCorpus(historiesBySymbol, benchmarkContext);
  const raw = histories.map(({ symbol, history }) =>
    analyzeCandidateFromHistory(symbol, history, benchmarkWindowForDate(benchmarkContext, history[history.length - 1]?.tradeDate ?? ""), corpus)
  );

  return scoreCandidatesFromRaw(raw);
}

export function scoreCandidatesFromRaw(raw: CandidateRaw[]): Candidate[] {
  const eligibleRaw = raw.filter((item) => item.complete);
  if (eligibleRaw.length === 0) {
    return raw.map((item) => ({
      symbol: item.symbol,
      candidateType: "reject",
      priority: 0,
      analogEdge: 1,
      conviction: 1,
      downsideProtection: 1,
      macroAlignment: 1,
      liquidity: 1,
      score: 0,
      complete: false,
      scoreDetail: {
        candidate_type: item.candidateType,
        rejection_reason: item.rejectionReason,
        fetch_status: "no_complete_candidates",
        analog_count: item.analogCount
      }
    }));
  }

  const analogEdgeValues = eligibleRaw.map((item) => item.analogEdgeRaw);
  const convictionValues = eligibleRaw.map((item) => item.convictionRaw);
  const downsideValues = eligibleRaw.map((item) => item.downsideProtectionRaw);
  const macroValues = eligibleRaw.map((item) => item.macroAlignmentRaw);
  const liquidityValues = eligibleRaw.map((item) => item.liquidityRaw);

  const analogEdgeMin = Math.min(...analogEdgeValues);
  const analogEdgeMax = Math.max(...analogEdgeValues);
  const convictionMin = Math.min(...convictionValues);
  const convictionMax = Math.max(...convictionValues);
  const downsideMin = Math.min(...downsideValues);
  const downsideMax = Math.max(...downsideValues);
  const macroMin = Math.min(...macroValues);
  const macroMax = Math.max(...macroValues);
  const liquidityMin = Math.min(...liquidityValues);
  const liquidityMax = Math.max(...liquidityValues);

  return raw.map((item) => {
    const analogEdge = Number(normalizeTo100(item.analogEdgeRaw, analogEdgeMin, analogEdgeMax).toFixed(4));
    const conviction = Number(normalizeTo100(item.convictionRaw, convictionMin, convictionMax).toFixed(4));
    const downsideProtection = Number(normalizeTo100(item.downsideProtectionRaw, downsideMin, downsideMax).toFixed(4));
    const macroAlignment = Number(normalizeTo100(item.macroAlignmentRaw, macroMin, macroMax).toFixed(4));
    const liquidity = Number(normalizeTo100(item.liquidityRaw, liquidityMin, liquidityMax).toFixed(4));

    const score =
      item.candidateType === "retrieval_candidate"
        ? analogEdge * 0.55 + conviction * 0.2 + downsideProtection * 0.15 + macroAlignment * 0.05 + liquidity * 0.05
        : 0;

    return {
      symbol: item.symbol,
      candidateType: item.candidateType,
      priority: item.priority,
      analogEdge,
      conviction,
      downsideProtection,
      macroAlignment,
      liquidity,
      score: Number(score.toFixed(4)),
      complete: item.complete,
      scoreDetail: {
        candidate_type: item.candidateType,
        rejection_reason: item.rejectionReason,
        analog_count: item.analogCount,
        avg_similarity: Number(item.avgSimilarity.toFixed(6)),
        expected_5d_return: Number(item.expected5Return.toFixed(6)),
        expected_10d_return: Number(item.expected10Return.toFixed(6)),
        positive_rate_10d: Number(item.positiveRate10.toFixed(6)),
        downside_mean_10d: Number(item.downsideMean10.toFixed(6)),
        analog_edge_score: analogEdge,
        conviction_score: conviction,
        downside_protection_score: downsideProtection,
        macro_alignment_score: macroAlignment,
        liquidity_score: liquidity,
        retrieval_score: Number(score.toFixed(4)),
        last_open: Number(item.feature.lastOpen.toFixed(4)),
        last_high: Number(item.feature.lastHigh.toFixed(4)),
        last_low: Number(item.feature.lastLow.toFixed(4)),
        last_close: Number(item.feature.lastClose.toFixed(4)),
        last_volume: Math.round(item.feature.lastVolume),
        sma20: Number(item.feature.sma20.toFixed(4)),
        sma50: Number(item.feature.sma50.toFixed(4)),
        rsi14: Number(item.feature.rsi14.toFixed(4)),
        rvol10: Number(item.feature.rvol10.toFixed(4)),
        momentum5: Number(item.feature.momentum5.toFixed(6)),
        momentum20: Number(item.feature.momentum20.toFixed(6)),
        avg_range20: Number(item.feature.avgRange20.toFixed(6)),
        up_consistency20: Number(item.feature.upConsistency20.toFixed(6)),
        close_location20: Number(item.feature.closeLocation20.toFixed(6)),
        support_distance20: Number(item.feature.supportDistance20.toFixed(6)),
        distance_to_sma20: Number(item.feature.distanceToSma20.toFixed(6)),
        distance_to_sma50: Number(item.feature.distanceToSma50.toFixed(6)),
        benchmark_close: Number(item.feature.benchmarkClose.toFixed(4)),
        benchmark_sma20: Number(item.feature.benchmarkSma20.toFixed(4)),
        benchmark_sma50: Number(item.feature.benchmarkSma50.toFixed(4)),
        benchmark_momentum20: Number(item.feature.benchmarkMomentum20.toFixed(6)),
        macro_trend: Number(item.feature.macroTrend.toFixed(6)),
        relative_strength20: Number(item.feature.relativeStrength20.toFixed(6)),
        as_of_date: item.feature.latestTradeDate,
        retrieved_analogs: item.topMatches,
        debate_input: {
          symbol: item.symbol,
          as_of_date: item.feature.latestTradeDate,
          latest_bar: {
            open: Number(item.feature.lastOpen.toFixed(4)),
            high: Number(item.feature.lastHigh.toFixed(4)),
            low: Number(item.feature.lastLow.toFixed(4)),
            close: Number(item.feature.lastClose.toFixed(4)),
            volume: Math.round(item.feature.lastVolume)
          },
          technical_snapshot: {
            rsi14: Number(item.feature.rsi14.toFixed(4)),
            rvol10: Number(item.feature.rvol10.toFixed(4)),
            momentum5: Number(item.feature.momentum5.toFixed(6)),
            momentum20: Number(item.feature.momentum20.toFixed(6)),
            distance_to_sma20: Number(item.feature.distanceToSma20.toFixed(6)),
            distance_to_sma50: Number(item.feature.distanceToSma50.toFixed(6)),
            close_location20: Number(item.feature.closeLocation20.toFixed(6)),
            support_distance20: Number(item.feature.supportDistance20.toFixed(6)),
            relative_strength20: Number(item.feature.relativeStrength20.toFixed(6))
          },
          benchmark_snapshot: {
            close: Number(item.feature.benchmarkClose.toFixed(4)),
            sma20: Number(item.feature.benchmarkSma20.toFixed(4)),
            sma50: Number(item.feature.benchmarkSma50.toFixed(4)),
            momentum20: Number(item.feature.benchmarkMomentum20.toFixed(6)),
            macro_trend: Number(item.feature.macroTrend.toFixed(6))
          },
          retrieval_summary: {
            analog_count: item.analogCount,
            avg_similarity: Number(item.avgSimilarity.toFixed(6)),
            expected_5d_return: Number(item.expected5Return.toFixed(6)),
            expected_10d_return: Number(item.expected10Return.toFixed(6)),
            positive_rate_10d: Number(item.positiveRate10.toFixed(6)),
            downside_mean_10d: Number(item.downsideMean10.toFixed(6))
          },
          retrieved_analogs: item.topMatches
        }
      }
    };
  });
}

export function compareCandidates(left: { candidate: Candidate; score: number }, right: { candidate: Candidate; score: number }) {
  if (right.candidate.priority !== left.candidate.priority) {
    return right.candidate.priority - left.candidate.priority;
  }
  if (right.score !== left.score) {
    return right.score - left.score;
  }
  if (right.candidate.analogEdge !== left.candidate.analogEdge) {
    return right.candidate.analogEdge - left.candidate.analogEdge;
  }
  if (right.candidate.conviction !== left.candidate.conviction) {
    return right.candidate.conviction - left.candidate.conviction;
  }
  if (right.candidate.downsideProtection !== left.candidate.downsideProtection) {
    return right.candidate.downsideProtection - left.candidate.downsideProtection;
  }
  return left.candidate.symbol.localeCompare(right.candidate.symbol);
}

export async function buildWeeklyFilterDataset(symbols: string[]): Promise<{
  asOfDate: string;
  marketContext: WeeklyMarketContext;
  universeSnapshot: UniverseSnapshotRow[];
}> {
  if (symbols.length === 0) {
    throw new Error("universe_empty");
  }

  const benchmarkHistory = await fetchHistoryWithFallback(BENCHMARK_SYMBOL);
  if (benchmarkHistory.length < WINDOW_BARS) {
    throw new Error("benchmark_history_insufficient");
  }
  const benchmarkContext = createBenchmarkContext(benchmarkHistory);
  const benchmarkWindow = benchmarkHistory.slice(-WINDOW_BARS);
  const benchmarkSnapshot = extractFeatureSnapshot(benchmarkWindow, benchmarkWindow);
  if (!benchmarkSnapshot) {
    throw new Error("benchmark_feature_unavailable");
  }

  const histories = await mapWithConcurrency(symbols, 5, async (symbol) => ({
    symbol,
    history: await fetchHistoryWithFallback(symbol)
  }));

  const rows: UniverseSnapshotRow[] = [];
  for (const { symbol, history } of histories) {
    if (history.length < WINDOW_BARS) continue;
    const latestDate = history[history.length - 1]?.tradeDate ?? "";
    if (!latestDate) continue;
    const benchmarkForDate = benchmarkWindowForDate(benchmarkContext, latestDate);
    const feature = extractFeatureSnapshotFromHistory(symbol, history, benchmarkForDate);
    if (!feature) continue;
    rows.push({
      symbol,
      close: Number(feature.lastClose.toFixed(6)),
      open: Number(feature.lastOpen.toFixed(6)),
      high: Number(feature.lastHigh.toFixed(6)),
      low: Number(feature.lastLow.toFixed(6)),
      volume: Math.round(feature.lastVolume),
      SMA_20: Number(feature.sma20.toFixed(6)),
      SMA_50: Number(feature.sma50.toFixed(6)),
      RSI_14: Number(feature.rsi14.toFixed(6)),
      RVOL_10: Number(feature.rvol10.toFixed(6)),
      MOMENTUM_5: Number(feature.momentum5.toFixed(6)),
      MOMENTUM_20: Number(feature.momentum20.toFixed(6)),
      RELATIVE_STRENGTH_20: Number(feature.relativeStrength20.toFixed(6)),
      MACRO_TREND: Number(feature.macroTrend.toFixed(6)),
      DAILY_TURNOVER_IDR: Number((feature.lastClose * feature.lastVolume).toFixed(2))
    });
  }

  if (rows.length === 0) {
    throw new Error("universe_snapshot_empty");
  }

  const asOfDate = rows
    .map((row) => row.symbol)
    .length
    ? histories
        .map((item) => item.history[item.history.length - 1]?.tradeDate ?? "")
        .filter((x) => x)
        .sort()
        .at(-1) ?? new Date().toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const avgRsi = average(rows.map((row) => row.RSI_14));
  const avgMomentum20 = average(rows.map((row) => row.MOMENTUM_20));
  const pctAboveSma20 = rows.filter((row) => row.close >= row.SMA_20).length / rows.length;
  const pctAboveSma50 = rows.filter((row) => row.close >= row.SMA_50).length / rows.length;
  const sectorPerformance = [
    {
      sector: "LQ45",
      avg_momentum_20: Number(avgMomentum20.toFixed(6)),
      avg_relative_strength_20: Number(average(rows.map((row) => row.RELATIVE_STRENGTH_20)).toFixed(6)),
      constituents: rows.length
    }
  ];

  return {
    asOfDate,
    marketContext: {
      benchmark: {
        symbol: BENCHMARK_SYMBOL,
        close: Number(benchmarkSnapshot.lastClose.toFixed(6)),
        sma20: Number(benchmarkSnapshot.sma20.toFixed(6)),
        sma50: Number(benchmarkSnapshot.sma50.toFixed(6)),
        momentum20: Number(benchmarkSnapshot.momentum20.toFixed(6)),
        macro_trend: Number(benchmarkSnapshot.macroTrend.toFixed(6))
      },
      sector_performance: sectorPerformance,
      universe_stats: {
        symbols: rows.length,
        avg_rsi14: Number(avgRsi.toFixed(6)),
        avg_momentum20: Number(avgMomentum20.toFixed(6)),
        pct_above_sma20: Number(pctAboveSma20.toFixed(6)),
        pct_above_sma50: Number(pctAboveSma50.toFixed(6))
      }
    },
    universeSnapshot: rows
  };
}

export async function buildWeeklyWatchlist(runId: number, universeSymbols: string[], targetSize = 10) {
  const boundedTargetSize = Math.max(5, Math.min(10, targetSize));
  const candidates = await generateCandidates(universeSymbols);
  const eligible = candidates.filter((candidate) => candidate.complete);
  if (eligible.length < Math.min(5, boundedTargetSize)) {
    throw new Error("weekly_candidates_insufficient");
  }

  const ranked = eligible
    .map((candidate) => ({ candidate, score: candidate.score }))
    .sort(compareCandidates)
    .slice(0, Math.min(boundedTargetSize, eligible.length))
    .map<RankedSymbol>((entry, idx) => ({
      symbol: entry.candidate.symbol,
      rank: idx + 1,
      score: Number(entry.score.toFixed(4)),
      scoreDetail: entry.candidate.scoreDetail
    }));

  await createWatchlist(runId, ranked.length, ranked);
  return ranked;
}
