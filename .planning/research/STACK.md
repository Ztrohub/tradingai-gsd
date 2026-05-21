# STACK Research - AI Trade IDX

## Objective
Select reusable OSS components to accelerate delivery of an autonomous LQ45 paper-trading system.

## Recommended Core Stack

1. Multi-agent orchestration: TradingAgents (Python)
- Repo: https://github.com/tauricresearch/tradingagents
- Why: native analyst/researcher/trader/risk debate pattern, persistent decision memory hooks, Docker support.
- Fit: close match to required strict decision output and multi-agent discussion.

2. Paper trading and order simulation: Backtrader (Python)
- Repo: https://github.com/mementum/backtrader
- Why: mature simulation primitives (market/limit/stop/bracket semantics), ideal for deterministic paper ledger.
- Fit: supports explicit stop-loss/take-profit modeling for daily scheduled runs.

3. Risk-learning / RL component: FinRL patterns + custom risk environment
- Repo: https://github.com/AI4Finance-Foundation/FinRL
- Why: reusable RL training/evaluation building blocks.
- Fit: adapt reward and state features to risk-management policy, persist compact memory to SQLite.

4. Technical indicators: pandas-ta and/or TA-Lib
- Repos: https://github.com/twopirllc/pandas-ta, https://github.com/TA-Lib/ta-lib-python
- Why: avoids hand-rolling indicator math and reduces implementation risk.

5. Web control plane: Node.js + queue/scheduler
- BullMQ: https://github.com/taskforcesh/bullmq
- node-cron: https://github.com/node-cron/node-cron
- Why: consistent job scheduling, retries, observability, manual trigger from web UI.

## System of Record
- Postgres: configs, watchlist, runs, decisions, positions, transactions, audit logs.
- SQLite: local lightweight RL/risk memory store keyed by symbol and run date.

## Implementation Notes
- Use Node as orchestrator and UI API.
- Run Python AI engine as separate Docker service exposed via internal HTTP/gRPC.
- Prefer schema-validated contracts between Node and Python (Pydantic/Zod JSON schema).

---
*Updated: 2026-05-21*
