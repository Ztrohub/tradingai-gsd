# Roadmap: AI Trade IDX

## Overview

- Project mode: mvp
- Total phases: 5
- v1 requirements mapped: 26/26

### Phase 1: Foundation & Control Plane
**Goal:** Establish Dockerized Node control plane, Postgres schema baseline, scheduling controls, and operational visibility.
**Mode:** mvp
**Requirements:** PLAT-01, PLAT-02, PLAT-03, PLAT-04, ARCH-01, ARCH-02, ARCH-03
**Success Criteria**:
1. Docker Compose starts all baseline services successfully in one command.
2. Web UI/API can manage provider config and schedule settings.
3. Manual run trigger endpoints exist for weekly and daily pipelines.
4. Run logs and job status are queryable from UI/API.

### Phase 2: Data Layer & Watchlist Pipeline
**Goal:** Build reliable LQ45 market/news data adapters and weekly watchlist generation pipeline.
**Mode:** mvp
**Requirements:** DATA-01, DATA-02, DATA-03, DATA-04
**Success Criteria**:
1. LQ45 universe can be ingested, validated, and refreshed.
2. Weekly Sunday job selects and stores 5-10 watchlist symbols.
3. Daily data pull retrieves required price/indicator inputs for watchlist.
4. Daily sentiment ingest attaches symbol-linked news signals.

### Phase 3: Multi-Agent Decision Engine
**Goal:** Produce strict structured BUY/HOLD/SELL/IDLE decisions with explainable rationale per symbol.
**Mode:** mvp
**Requirements:** AGNT-01, AGNT-02, AGNT-03, AGNT-04
**Success Criteria**:
1. Sequential per-symbol multi-agent loop runs without schema breakage.
2. Every watchlist symbol yields exactly one valid action.
3. Rationale output includes technical, sentiment, and risk summaries.
4. Invalid model output is automatically rejected/retried and never executed directly.

### Phase 4: Risk Veto + RL Memory
**Goal:** Enforce hard risk controls and integrate RL-based local memory to reduce repeated mistakes.
**Mode:** mvp
**Requirements:** RISK-01, RISK-02, RISK-03, RISK-04, RISK-05, RISK-06, RISK-07
**Success Criteria**:
1. Risk configuration can be edited in UI and applied at runtime.
2. Risk veto can block or transform unsafe actions before execution.
3. Stop-loss/take-profit lifecycle is fully tracked and auditable.
4. RL memory in SQLite is read/write integrated into daily risk decision context.
5. Stop-loss hit accounting rule matches defined next-day realization behavior.

### Phase 5: Paper Trading Ledger, Portfolio Views, and P/L Validation
**Goal:** Complete paper execution, accounting, and portfolio observability needed to evaluate profit objective.
**Mode:** mvp
**Requirements:** PAPR-01, PAPR-02, PAPR-03, PAPR-04
**Success Criteria**:
1. Paper trades update cash, positions, and transaction history deterministically.
2. Portfolio and transaction views are available in web interface.
3. Realized/unrealized P/L is computed and persisted per run.
4. User can inspect run-to-run portfolio evolution and decision outcomes.

## Phase Order Rationale
1. Build safe operational base first.
2. Ensure dependable inputs before decision intelligence.
3. Add intelligence, then enforce safety veto.
4. Close with accounting and observability to measure profit target.

## Exit to Execution
After roadmap approval, start with:
- `$gsd-discuss-phase 1`
- or direct planning with `$gsd-plan-phase 1`
