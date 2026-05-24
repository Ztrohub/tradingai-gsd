# Phase 2: Data Layer & Watchlist Pipeline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-22
**Phase:** 2-Data Layer & Watchlist Pipeline
**Areas discussed:** Universe source, Watchlist selection, Data providers

---

## Universe source

| Option | Description | Selected |
|--------|-------------|----------|
| IDX official publication page/API | Strongest authority, may require brittle parsing. | |
| Reliable market data mirror | Easier integration, needs parity checks with IDX. | |
| Static manual list in repo | Simplest start, higher drift risk. | ✓ |
| You decide | Agent discretion. | |

**User's choice:** Static manual list in repo.
**Notes:**
- Composition changes apply immediately on refresh.
- On source unavailability, use last successful universe snapshot.
- Validation strictness: whitelist format + dedupe + empty-check.

---

## Watchlist selection

| Option | Description | Selected |
|--------|-------------|----------|
| Rule-based scoring | Liquidity + trend/volatility based deterministic rank. | ✓ |
| Pure liquidity ranking | Rank by turnover/volume only. | |
| Manual pick from universe | Operator picks each week from UI. | |
| You decide | Agent discretion. | |

**User's choice:** Rule-based scoring with liquidity, trend, and chart structure.
**Notes:**
- Default watchlist size: 10 symbols, editable via UI.
- Tie-break: higher liquidity.
- Missing-input policy finalized as exclude + backfill from next-ranked (user revised earlier answer).

---

## Data providers

| Option | Description | Selected |
|--------|-------------|----------|
| Primary + backup provider | Resilient under free-tier outages and limits. | ✓ |
| Single provider only | Simpler integration, less resilience. | |
| Local cached EOD dataset only | Lowest runtime cost, stale risk. | |
| You decide | Agent discretion. | |

**User's choice:** Primary + backup providers.
**Notes:**
- Indicator strategy: hybrid (local compute primary, provider fallback).
- Sentiment strategy: aggregator + per-symbol keyword filtering.
- Dual-provider failure policy: skip affected symbol for that day.

---

## the agent's Discretion

No areas were delegated to agent discretion.

## Deferred Ideas

None.
