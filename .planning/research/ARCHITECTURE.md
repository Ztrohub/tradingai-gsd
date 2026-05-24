# ARCHITECTURE Research - AI Trade IDX

## Proposed Services

1. web-service (Node.js)
- UI + API
- Scheduler control
- Manual run endpoints
- Config management

2. worker-service (Node.js)
- Job queue consumer (weekly, daily)
- Calls Python AI engine
- Applies orchestration state transitions

3. ai-engine (Python)
- Multi-agent debate runner (TradingAgents-inspired)
- Consumes retrieval-ready technical context JSON from control plane
- Performs multi-agent debate over technical + sentiment + analog history evidence
- Decision formatter
- Risk RL adapter (SQLite memory)

4. db (Postgres)
- Canonical storage: users(single), settings, watchlists, decisions, transactions, positions, runs

5. redis
- Queue backend for BullMQ

## Data Flow (Daily)
1. Scheduler triggers daily run at 09:00 local timezone.
2. Worker loads active watchlist and market/news snapshots.
3. AI engine generates preliminary decisions and confidence/reason payload.
4. Risk module evaluates constraints and may veto/transform actions.
5. Paper execution simulates fills and updates portfolio ledger.
6. Run artifacts and metrics stored in Postgres; RL memory updated in SQLite.

## Data Flow (Weekly Watchlist)
1. Scheduler/manual trigger refreshes LQ45 universe.
2. Worker fetches historical OHLCV for all 45 symbols plus IHSG benchmark.
3. Control plane extracts technical feature vectors from rolling windows:
   - RVOL
   - RSI
   - distance to moving averages
   - momentum / range / structure context
   - macro trend state from IHSG
4. Current symbol vectors are compared against historical vectors to retrieve the most similar prior regimes and their forward outcomes.
5. Control plane persists watchlist selections together with retrieval metadata and a debate-ready JSON payload.
6. AI engine consumes the raw market snapshot + retrieval summary + analog matches for multi-agent debate and emits final watchlist decision JSON.

## Contract Shape (per symbol)
- symbol
- action: BUY | HOLD | SELL | IDLE
- confidence: 0..1
- retrieval_context:
  - technical_snapshot
  - benchmark_snapshot
  - retrieval_summary
  - retrieved_analogs
- rationale:
  - technical_summary
  - sentiment_summary
  - risk_summary
- risk_params:
  - stop_loss_pct
  - take_profit_pct
  - position_size_pct

## Deployment
- Docker Compose for local/prod-lite.
- All services on internal network; expose only Node web-service.

---
*Updated: 2026-05-21*
