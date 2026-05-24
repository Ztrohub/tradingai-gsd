# Phase 2: Data Layer & Watchlist Pipeline - Research

**Date:** 2026-05-22
**Status:** Complete

## Objective
Define implementation-ready direction for reliable LQ45 universe ingestion, weekly watchlist generation, and daily price/indicator/news-sentiment data pulls that satisfy DATA-01..DATA-04.

## Inputs Reviewed
- `.planning/phases/02-data-layer-watchlist-pipeline/02-CONTEXT.md`
- `.planning/phases/02-data-layer-watchlist-pipeline/02-UI-SPEC.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/research/STACK.md`
- `src/modules/queue/cron.ts`
- `src/modules/queue/worker.ts`
- `src/modules/runs/runs.service.ts`
- `src/db/schema.sql`

## Standard Stack (Phase 2)
- Runtime/orchestration: Node control-plane service
- Scheduling/execution: existing `node-cron` + BullMQ worker flow
- Market/news adapters: Node provider clients with primary+backup fallback
- Indicator computation: local computation first, provider fallback second
- System of record: Postgres for universe/watchlist/snapshot/sentiment rows

## Architectural Responsibility Map
| Capability | Tier | Notes |
|---|---|---|
| LQ45 universe source ingestion and validation | Node data module | Start from static canonical file, strict validation, snapshot fallback |
| Weekly watchlist scoring and selection | Node pipeline service | Deterministic rank from liquidity+trend+structure |
| Daily data snapshot pull (ohlcv+indicators) | Node adapter + compute service | Primary provider then backup provider |
| Daily news/sentiment attachment | Node news adapter pipeline | Symbol keyword filtering and per-day persistence |

## Locked Decisions Applied
- D-01..D-04: Static canonical source + immediate composition update + last snapshot fallback + strict symbol validation.
- D-05..D-08: Rule-based weekly scoring; default size 10 editable in UI; tie-break liquidity; missing data excluded then backfilled.
- D-09..D-12: Primary+backup provider strategy, local indicator-first strategy, news aggregator filtering, skip symbol/day on dual failure.

## Data Model Additions (Phase 2)
- `lq45_universe_snapshots` (effective date, source version, symbol set hash, payload)
- `lq45_universe_symbols` (snapshot_id, symbol)
- `watchlists` (run_id, week_start, target_size, status)
- `watchlist_symbols` (watchlist_id, symbol, rank, score, selection_reason)
- `market_data_daily` (trade_date, symbol, provider, ohlcv fields, fetch_status)
- `indicator_daily` (trade_date, symbol, indicator name/value)
- `sentiment_daily` (trade_date, symbol, provider, headline_count, sentiment_score)
- `data_fetch_errors` (run_id, symbol, data_type, provider, error_code, retryable)

## API/Job Surface (Phase 2)
- Weekly pipeline (scheduled/manual): `universe refresh -> score -> select watchlist`
- Daily pipeline (scheduled/manual): `watchlist read -> market+indicator pull -> sentiment pull`
- Operator APIs:
  - `GET /api/watchlist/current`
  - `GET /api/watchlist/history`
  - `GET /api/data/daily/:date`
  - `GET/PUT /api/config/watchlist` (target count and scoring knobs)

## Pitfalls and Guards
- Universe drift risk from static source: persist snapshot metadata and refresh audits.
- Missing data causing unstable selection: hard-exclude incomplete symbols before ranking; deterministic backfill.
- Provider throttling: bounded retries, provider fallback, and symbol-level skip instead of run crash.
- Non-deterministic scores: persist component scores and ranking trace for auditability.

## Validation Architecture
- Unit tests: symbol validation, scoring function determinism, fallback routing, missing-data exclusion.
- Integration tests: weekly pipeline writes watchlist(5-10), daily pipeline writes market/indicator/sentiment rows.
- Contract tests: provider response normalization for primary and backup adapters.
- Smoke checks: scheduled/manual weekly and daily runs update run status and persistence paths.

## Output for Planner
Plan should be one execution wave focused on backend data pipeline + minimal API/UI configuration surface required by DATA-01..DATA-04.
