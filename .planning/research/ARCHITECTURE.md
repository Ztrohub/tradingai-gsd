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
- Technical + sentiment feature assembly
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

## Contract Shape (per symbol)
- symbol
- action: BUY | HOLD | SELL | IDLE
- confidence: 0..1
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
