<!-- GSD:project-start source:PROJECT.md -->
## Project

AI Trade IDX is a personal autonomous paper-trading system for Indonesia stocks (LQ45) that runs on a fixed schedule and outputs strict daily actions per stock: BUY, HOLD, SELL, or IDLE. The system combines multi-agent AI debate, technical indicators, and local-news sentiment analysis, then enforces risk veto rules before any simulated execution. It is designed for low infrastructure cost using Dockerized services and mostly free-tier data/model providers.

**Core Value:** Generate profitable paper-trading decisions for LQ45 with disciplined risk controls and repeatable daily operation.

### Constraints

- **Runtime**: Dockerized services - reproducible local deployment and near-zero ops overhead.
- **Web Stack**: Node.js required for UI/control plane.
- **Market Scope**: LQ45 only for v1 to constrain complexity and data cost.
- **Schedule**: Weekly (Sunday) and weekday 09:00 only; no intraday loops.
- **Data Cost**: Prefer free-tier or no-cost providers for price/news/sentiment inputs.
- **Execution Safety**: Paper trading only with hard risk veto before execution.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Objective
## Recommended Core Stack
- Repo: https://github.com/tauricresearch/tradingagents
- Why: native analyst/researcher/trader/risk debate pattern, persistent decision memory hooks, Docker support.
- Fit: close match to required strict decision output and multi-agent discussion.
- Repo: https://github.com/mementum/backtrader
- Why: mature simulation primitives (market/limit/stop/bracket semantics), ideal for deterministic paper ledger.
- Fit: supports explicit stop-loss/take-profit modeling for daily scheduled runs.
- Repo: https://github.com/AI4Finance-Foundation/FinRL
- Why: reusable RL training/evaluation building blocks.
- Fit: adapt reward and state features to risk-management policy, persist compact memory to SQLite.
- Repos: https://github.com/twopirllc/pandas-ta, https://github.com/TA-Lib/ta-lib-python
- Why: avoids hand-rolling indicator math and reduces implementation risk.
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
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
