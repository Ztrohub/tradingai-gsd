# Phase 02 Code Review

Date: 2026-05-22  
Depth: standard  
Scope: Phase 2 changed source files

## Findings

### Warning (Fixed)
1. Watchlist target-size configuration is never used by the weekly pipeline.
- Evidence: [pipeline.service.ts](C:\WKWK\asiatekoracle\projects\ai-trade\src\modules\data\pipeline.service.ts:16) hardcodes `10` when calling `buildWeeklyWatchlist(...)`.
- Related config: [data.routes.ts](C:\WKWK\asiatekoracle\projects\ai-trade\src\modules\data\data.routes.ts:9) stores editable `watchlistTargetSize`.
- Impact: UI/API allows editing target size, but run behavior ignores it; operator-facing config is misleading and DATA-02 behavior is inconsistent.
- Recommendation: Read target size from persisted config and pass that value into weekly pipeline.

2. Watchlist configuration is process-memory only and resets on restart.
- Evidence: [data.routes.ts](C:\WKWK\asiatekoracle\projects\ai-trade\src\modules\data\data.routes.ts:9) stores state in `let watchlistTargetSize = 10`.
- Impact: Docker restart resets config to default, causing non-deterministic operations across runs and drift vs operator expectations.
- Recommendation: Persist config in Postgres (new table or extension of existing config table) and load on startup.

3. Daily pipeline can report success with zero symbols when no watchlist exists.
- Evidence: [pipeline.service.ts](C:\WKWK\asiatekoracle\projects\ai-trade\src\modules\data\pipeline.service.ts:21) fetches symbols and then loops without guard; empty list returns success at line 67.
- Impact: Operational false-positive: run is marked `succeeded` even though no market/sentiment data was fetched.
- Recommendation: Fail fast or mark run as skipped-with-reason when watchlist is empty.

### Info (Open)
1. Phase 2 tests are mostly shape/export checks, not behavior checks.
- Evidence: [pipeline.integration.test.ts](C:\WKWK\asiatekoracle\projects\ai-trade\tests\data\pipeline.integration.test.ts:4) only asserts exported function types.
- Impact: Regressions in scoring/fallback/persistence logic may pass CI undetected.
- Recommendation: Add behavior tests for:
  - fallback primary->backup path,
  - empty-watchlist handling,
  - weekly ranking + target-size enforcement,
  - persistence writes (market/indicator/sentiment/error rows).

## Summary
- Critical: 0
- Warning: 0 (3 fixed)
- Info: 1
