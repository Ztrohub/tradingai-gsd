# SUMMARY Research - AI Trade IDX

## Stack Recommendation
- Node.js control plane (UI/API/scheduler) + Python AI engine.
- Reuse TradingAgents patterns for multi-agent debate.
- Use Backtrader-style simulation for paper execution semantics.
- Use Postgres as main DB, SQLite for local RL risk memory.

## Open-Source Reuse Plan
- Primary: TradingAgents (agent roles and debate flow).
- Secondary: Backtrader primitives (order/risk simulation model).
- Supporting: FinRL components for risk-learning experiments.

## API Provider Direction (Free-Tier Friendly)
1. Market data baseline: yfinance (.JK symbols) for prototyping and low-cost operation.
2. Backup market data: Alpha Vantage or Twelve Data adapters (subject to quota/coverage checks).
3. News/sentiment baseline: GDELT + curated Indonesian news RSS adapters.
4. Optional paid upgrade path later: premium IDX-focused API if data quality or latency becomes blocker.

## Why This Matches Goals
- Keeps infra cost near zero.
- Supports deterministic scheduled operation (Sunday + weekday 09:00).
- Preserves strict risk-veto workflow and structured BUY/HOLD/SELL/IDLE outputs.
- Leaves room for RL-based risk adaptation without destabilizing v1 action pipeline.

## Immediate Next Technical Milestones
1. Build data adapter layer (LQ45 universe, OHLCV, news).
2. Define strict decision schema + validator.
3. Implement paper-ledger and stop/take event rules.
4. Integrate multi-agent loop and risk veto.
5. Expose full controls/observability in Node web UI.

---
*Updated: 2026-05-21*
