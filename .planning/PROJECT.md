# AI Trade IDX

## What This Is

AI Trade IDX is a personal autonomous paper-trading system for Indonesia stocks (LQ45) that runs on a fixed schedule and outputs strict daily actions per stock: BUY, HOLD, SELL, or IDLE. The system combines multi-agent AI debate, technical indicators, and local-news sentiment analysis, then enforces risk veto rules before any simulated execution. It is designed for low infrastructure cost using Dockerized services and mostly free-tier data/model providers.

## Core Value

Generate profitable paper-trading decisions for LQ45 with disciplined risk controls and repeatable daily operation.

## Requirements

### Validated

(None yet - ship to validate)

### Active

- [ ] Weekly watchlist discovery for 5-10 LQ45 stocks
- [ ] Daily weekday 09:00 analysis and action generation
- [ ] Risk-vetoed paper trading with configurable stop-loss/take-profit and max-open-positions

### Out of Scope

- Live brokerage order execution - v1 is paper trading only
- Intraday multi-run engine - v1 runs once per weekday at 09:00 only

## Context

- Single operator user (no multi-user requirement for v1).
- Universe is LQ45 only.
- Initial paper capital is Rp100,000,000 with default max position size 10%, both editable in web UI.
- Maximum open positions is 5.
- Stop-loss/take-profit is decided at run time; if stop-loss is hit during a day, loss is recorded using stop-loss level on next run (not recalculated from next-day market price).
- Web interface must use Node.js and expose: AI config, cron config, manual runs, watchlist config, transaction history, paper-trading state, and database visibility.
- Main database is Postgres; additional local SQLite memory is allowed for RL/risk learning memory.
- Deployment must be Docker-based.
- AI model providers targeted: Groq and OpenRouter.
- Project can reuse OSS components to shorten development.

## Constraints

- **Runtime**: Dockerized services - reproducible local deployment and near-zero ops overhead.
- **Web Stack**: Node.js required for UI/control plane.
- **Market Scope**: LQ45 only for v1 to constrain complexity and data cost.
- **Schedule**: Weekly (Sunday) and weekday 09:00 only; no intraday loops.
- **Data Cost**: Prefer free-tier or no-cost providers for price/news/sentiment inputs.
- **Execution Safety**: Paper trading only with hard risk veto before execution.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use multi-agent architecture with debate + strict output schema | Matches requirement for explainable structured BUY/HOLD/SELL/IDLE decisions | - Pending |
| Use Node.js as web control plane and Python AI worker service | Node mandatory for UI, Python ecosystem stronger for trading/RL tooling | - Pending |
| Use Postgres as system-of-record + SQLite for local RL/risk memory | Aligns with requested primary DB while keeping cheap local learning state | - Pending |
| Start with LQ45 and paper trading only | Reduces integration risk and allows faster validation of profit objective | - Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-21 after initialization*
