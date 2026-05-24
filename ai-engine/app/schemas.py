from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class BenchmarkContext(BaseModel):
    symbol: str
    close: float
    sma20: float
    sma50: float
    momentum20: float
    macro_trend: float


class SectorPerformance(BaseModel):
    sector: str
    avg_momentum_20: float
    avg_relative_strength_20: float
    constituents: int


class UniverseStats(BaseModel):
    symbols: int
    avg_rsi14: float
    avg_momentum20: float
    pct_above_sma20: float
    pct_above_sma50: float


class MarketContext(BaseModel):
    benchmark: BenchmarkContext
    sector_performance: list[SectorPerformance] = Field(default_factory=list)
    universe_stats: UniverseStats


class UniverseSnapshotRow(BaseModel):
    symbol: str
    close: float
    open: float
    high: float
    low: float
    volume: float
    SMA_20: float
    SMA_50: float
    RSI_14: float
    RVOL_10: float
    MOMENTUM_5: float
    MOMENTUM_20: float
    RELATIVE_STRENGTH_20: float
    MACRO_TREND: float
    DAILY_TURNOVER_IDR: float


class DynamicFilter(BaseModel):
    field: str
    operator: Literal[">", "<", ">=", "<=", "=", "!="]
    value: float | str


class RankingRule(BaseModel):
    field: str
    direction: Literal["asc", "desc"]
    weight: float = Field(gt=0)


class DebateRequest(BaseModel):
    run_id: int
    as_of_date: date
    market_context: MarketContext
    universe_snapshot: list[UniverseSnapshotRow]
    max_results: int = Field(ge=1, le=45)


class DebateResponse(BaseModel):
    run_id: int
    as_of_date: date
    selected_symbols: list[str]
    dynamic_filters: list[DynamicFilter]
    ranking_rules: list[RankingRule]
    market_regime: str
    rationale: str
    agent_reports: dict[str, dict[str, str]]
    engine_meta: dict[str, str]
