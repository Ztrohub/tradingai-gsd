# FEATURES Research - AI Trade IDX

## Table Stakes (must-have for v1)

### Data Ingestion
- LQ45 constituents source and periodic refresh
- Daily OHLCV ingest (EOD or delayed intraday acceptable)
- Daily local/news sentiment ingest tied to watchlist symbols

### Weekly Workflow (Sunday)
- Screen/filter LQ45 to candidate watchlist (5-10 symbols)
- Persist watchlist with run metadata and rationale

### Daily Workflow (Weekday 09:00)
- Load current watchlist
- Compute indicators + sentiment summary
- Multi-agent debate and decision synthesis
- Strict per-symbol action output: BUY/HOLD/SELL/IDLE + structured reasons

### Risk & Paper Execution
- Pre-trade veto checks (position sizing, max open positions, stop/take rules)
- Paper fill simulation and position ledger updates
- Deterministic stop-loss/take-profit logic consistent with next-day accounting rule

### UI / Ops
- Edit AI config and risk config
- Edit schedule config and run manual jobs
- Manage watchlist
- View transaction history, current positions, P/L, and run logs
- Inspect data snapshots for debugging

## Differentiators (v1.5+)
- Adaptive risk RL policy tuning per regime
- Agent performance scoring and weighted voting
- Scenario replay and counterfactual analysis
- Strategy A/B testing by regime

## Anti-Features for v1
- Live broker integration
- Intraday continuous loop
- Multi-user auth/roles

---
*Updated: 2026-05-21*
