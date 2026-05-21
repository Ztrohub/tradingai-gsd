# Requirements: AI Trade IDX

**Defined:** 2026-05-21
**Core Value:** Generate profitable paper-trading decisions for LQ45 with disciplined risk controls and repeatable daily operation.

## v1 Requirements

### Platform & Operations

- [ ] **PLAT-01**: User can configure AI model providers (Groq/OpenRouter) and model parameters from web interface.
- [ ] **PLAT-02**: User can configure weekly and daily cron schedules from web interface.
- [ ] **PLAT-03**: User can trigger weekly and daily jobs manually from web interface.
- [ ] **PLAT-04**: System records run logs, status, and errors for each job execution.

### Market Data & Universe

- [ ] **DATA-01**: System can ingest and maintain LQ45 symbol universe.
- [ ] **DATA-02**: Weekly job can select 5-10 watchlist symbols from LQ45 based on configured filters.
- [ ] **DATA-03**: Daily job can fetch price/indicator inputs for all watchlist symbols.
- [ ] **DATA-04**: Daily job can fetch local/news sentiment inputs relevant to watchlist symbols.

### Multi-Agent Decisioning

- [ ] **AGNT-01**: System runs multi-agent sequential analysis loop per watchlist symbol.
- [ ] **AGNT-02**: System outputs exactly one action per symbol: BUY/HOLD/SELL/IDLE.
- [ ] **AGNT-03**: System outputs structured rationale per symbol (technical, sentiment, risk summaries).
- [ ] **AGNT-04**: System enforces strict decision schema validation before execution.

### Risk Management & RL Memory

- [ ] **RISK-01**: User can configure paper capital (default Rp100,000,000) in web interface.
- [ ] **RISK-02**: User can configure max position size per symbol (default 10%) in web interface.
- [ ] **RISK-03**: User can configure max open positions (default 5) in web interface.
- [ ] **RISK-04**: System sets and enforces stop-loss and take-profit for each opened position.
- [ ] **RISK-05**: Risk veto can block or modify agent actions before paper execution.
- [ ] **RISK-06**: System persists RL risk memory in local SQLite and uses it to avoid repeating prior mistakes.
- [ ] **RISK-07**: If stop-loss is hit intraday, next run records realized loss at stop-loss level (not next-day market price).

### Paper Trading Ledger & Analytics

- [ ] **PAPR-01**: System simulates paper orders and updates positions and cash ledger.
- [ ] **PAPR-02**: System stores transaction history and portfolio snapshots in Postgres.
- [ ] **PAPR-03**: User can view watchlist, open positions, transaction history, and P/L from web interface.
- [ ] **PAPR-04**: System computes realized and unrealized P/L per symbol and portfolio total.

### Architecture & Deployment

- [ ] **ARCH-01**: Web/control plane is implemented in Node.js.
- [ ] **ARCH-02**: Main database for app state is Postgres.
- [ ] **ARCH-03**: Entire system runs via Docker Compose with reproducible startup.

## v2 Requirements

### Advanced Intelligence

- **V2AI-01**: Dynamic agent weighting based on historical symbol/regime performance.
- **V2AI-02**: Counterfactual replay for rejected/vetoed trades.
- **V2AI-03**: Multi-strategy ensemble and A/B evaluation mode.

### Expansion

- **V2EX-01**: Support non-LQ45 IDX universe expansion.
- **V2EX-02**: Optional live-broker integration after paper validation.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Live broker order execution | v1 focus is safe validation in paper trading |
| Intraday continuous execution loop | v1 schedule fixed to Sunday + weekday 09:00 |
| Multi-user authentication/authorization | single-operator scope |
| Mobile-native app | web interface sufficient for v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PLAT-01 | Phase 1 | Pending |
| PLAT-02 | Phase 1 | Pending |
| PLAT-03 | Phase 1 | Pending |
| PLAT-04 | Phase 1 | Pending |
| ARCH-01 | Phase 1 | Pending |
| ARCH-02 | Phase 1 | Pending |
| ARCH-03 | Phase 1 | Pending |
| DATA-01 | Phase 2 | Pending |
| DATA-02 | Phase 2 | Pending |
| DATA-03 | Phase 2 | Pending |
| DATA-04 | Phase 2 | Pending |
| AGNT-01 | Phase 3 | Pending |
| AGNT-02 | Phase 3 | Pending |
| AGNT-03 | Phase 3 | Pending |
| AGNT-04 | Phase 3 | Pending |
| RISK-01 | Phase 4 | Pending |
| RISK-02 | Phase 4 | Pending |
| RISK-03 | Phase 4 | Pending |
| RISK-04 | Phase 4 | Pending |
| RISK-05 | Phase 4 | Pending |
| RISK-06 | Phase 4 | Pending |
| RISK-07 | Phase 4 | Pending |
| PAPR-01 | Phase 5 | Pending |
| PAPR-02 | Phase 5 | Pending |
| PAPR-03 | Phase 5 | Pending |
| PAPR-04 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0

---
*Requirements defined: 2026-05-21*
*Last updated: 2026-05-21 after initial definition*
