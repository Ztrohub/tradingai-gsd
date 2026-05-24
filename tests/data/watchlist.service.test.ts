import { describe, expect, it } from "vitest";
import { buildWeeklyWatchlist, compareCandidates, extractFeatureSnapshotFromHistory, scoreCandidatesFromRaw, type CandidateRaw } from "../../src/modules/data/watchlist.service.js";

type MarketBar = {
  tradeDate: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

function createHistory(length: number, priceAt: (index: number) => number, volumeAt: (index: number) => number): MarketBar[] {
  const start = new Date("2025-01-01T00:00:00.000Z");
  return Array.from({ length }, (_, index) => {
    const close = priceAt(index);
    const priorClose = index > 0 ? priceAt(index - 1) : close;
    const open = (priorClose + close) / 2;
    const spread = Math.max(close * 0.01, 1);
    const low = Math.max(1, Math.min(open, close) - spread);
    const high = Math.max(open, close) + spread;
    const tradeDate = new Date(start.getTime() + index * 86_400_000).toISOString().slice(0, 10);
    return {
      tradeDate,
      open,
      high,
      low,
      close,
      volume: volumeAt(index)
    };
  });
}

function benchmarkHistory() {
  return createHistory(
    160,
    (index) => 7000 + index * 4,
    () => 1_500_000_000
  );
}

function retrievalRaw(input: Partial<CandidateRaw> & { symbol: string; analogEdgeRaw: number; convictionRaw: number; downsideProtectionRaw: number; macroAlignmentRaw: number; liquidityRaw: number }): CandidateRaw {
  const feature = {
    vector: [0.2, 0.1, 0.05],
    lastOpen: 100,
    lastHigh: 102,
    lastLow: 99,
    lastClose: 101,
    lastVolume: 1_000_000,
    latestTradeDate: "2026-05-23",
    sma20: 98,
    sma50: 95,
    rsi14: 58,
    rvol10: 1.2,
    turnover20: 100_000_000,
    momentum5: 0.02,
    momentum20: 0.05,
    avgRange20: 0.02,
    upConsistency20: 0.65,
    closeLocation20: 0.8,
    supportDistance20: 0.03,
    distanceToSma20: 0.03,
    distanceToSma50: 0.06,
    benchmarkClose: 7200,
    benchmarkSma20: 7150,
    benchmarkSma50: 7050,
    benchmarkMomentum20: 0.01,
    macroTrend: 0.8,
    relativeStrength20: 0.04
  };

  return {
    symbol: input.symbol,
    candidateType: input.candidateType ?? "retrieval_candidate",
    priority: input.priority ?? (input.candidateType === "reject" ? 0 : 1),
    rejectionReason: input.rejectionReason ?? null,
    analogEdgeRaw: input.analogEdgeRaw,
    convictionRaw: input.convictionRaw,
    downsideProtectionRaw: input.downsideProtectionRaw,
    macroAlignmentRaw: input.macroAlignmentRaw,
    liquidityRaw: input.liquidityRaw,
    complete: input.complete ?? input.candidateType !== "reject",
    analogCount: input.analogCount ?? 12,
    avgSimilarity: input.avgSimilarity ?? 0.8,
    expected5Return: input.expected5Return ?? 0.02,
    expected10Return: input.expected10Return ?? 0.04,
    positiveRate10: input.positiveRate10 ?? 0.7,
    downsideMean10: input.downsideMean10 ?? -0.03,
    feature: input.feature ?? feature,
    topMatches: input.topMatches ?? []
  };
}

describe("watchlist service", () => {
  it("exports weekly builder", () => {
    expect(typeof buildWeeklyWatchlist).toBe("function");
  });

  it("extracts a finite feature snapshot from real-like history", () => {
    const symbolHistory = createHistory(
      160,
      (index) => 100 + index * 0.6 + Math.sin(index / 4),
      (index) => 2_000_000 + index * 5_000
    );

    const snapshot = extractFeatureSnapshotFromHistory("BBCA", symbolHistory, benchmarkHistory());
    expect(snapshot).not.toBeNull();
    expect(snapshot?.vector.length).toBeGreaterThan(5);
    expect(snapshot?.rsi14).toBeGreaterThan(0);
    expect(snapshot?.rvol10).toBeGreaterThan(0);
    expect(snapshot?.macroTrend).toBeGreaterThanOrEqual(0);
    expect(snapshot?.macroTrend).toBeLessThanOrEqual(1);
  });

  it("does not let higher liquidity outrank better analog expectancy", () => {
    const ranked = scoreCandidatesFromRaw([
      retrievalRaw({
        symbol: "LIKUID",
        analogEdgeRaw: 0.02,
        convictionRaw: 0.55,
        downsideProtectionRaw: 0.9,
        macroAlignmentRaw: 0.45,
        liquidityRaw: 13,
        expected10Return: 0.01,
        positiveRate10: 0.52
      }),
      retrievalRaw({
        symbol: "EDGE",
        analogEdgeRaw: 0.14,
        convictionRaw: 0.82,
        downsideProtectionRaw: 0.97,
        macroAlignmentRaw: 0.76,
        liquidityRaw: 10,
        expected10Return: 0.07,
        positiveRate10: 0.71
      })
    ]);

    const sorted = ranked.map((candidate) => ({ candidate, score: candidate.score })).sort(compareCandidates);
    expect(sorted[0].candidate.symbol).toBe("EDGE");
    expect(sorted[1].candidate.symbol).toBe("LIKUID");
  });

  it("keeps rejected analog traps out of the eligible ranking pool", () => {
    const ranked = scoreCandidatesFromRaw([
      retrievalRaw({
        symbol: "TRAP",
        candidateType: "reject",
        complete: false,
        rejectionReason: "negative_analog_expectancy",
        analogEdgeRaw: -0.08,
        convictionRaw: 0.4,
        downsideProtectionRaw: 0.75,
        macroAlignmentRaw: 0.35,
        liquidityRaw: 14,
        expected10Return: -0.04,
        positiveRate10: 0.3
      }),
      retrievalRaw({
        symbol: "VALID",
        analogEdgeRaw: 0.11,
        convictionRaw: 0.79,
        downsideProtectionRaw: 0.96,
        macroAlignmentRaw: 0.7,
        liquidityRaw: 9
      })
    ]);

    const eligible = ranked.filter((candidate) => candidate.complete);
    expect(eligible).toHaveLength(1);
    expect(eligible[0].symbol).toBe("VALID");
  });
});
