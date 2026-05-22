# Phase 2: Data Layer & Watchlist Pipeline - Context

**Gathered:** 2026-05-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver reliable LQ45 universe ingestion plus weekly watchlist generation and daily data adapters for price/indicators/news-sentiment inputs used by downstream decisioning.

</domain>

<decisions>
## Implementation Decisions

### Universe Source and Refresh
- **D-01:** Start with a static manual LQ45 symbol list in repository as the canonical universe source for v1.
- **D-02:** Apply composition changes immediately on refresh.
- **D-03:** If canonical source is unavailable, use the last successful universe snapshot.
- **D-04:** Use strict symbol validation: whitelist ticker format, dedupe, and reject empty payloads.

### Weekly Watchlist Selection
- **D-05:** Use rule-based scoring with liquidity, trend, and chart structure as primary factors.
- **D-06:** Default weekly watchlist target is 10 symbols and must be editable via UI.
- **D-07:** Tie-break by higher liquidity.
- **D-08:** Exclude missing-data symbols from weekly scoring and backfill from next-ranked symbols.

### Daily Data Providers
- **D-09:** Use primary + backup provider strategy for daily OHLCV market data.
- **D-10:** Indicator strategy is hybrid: local computation primary, provider indicator fallback.
- **D-11:** News/sentiment strategy uses an aggregator with per-symbol keyword filtering.
- **D-12:** If both providers fail for a symbol/day, skip that symbol for that day.

### the agent's Discretion
- No discretionary implementation areas were delegated; decisions were explicitly selected.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope and Requirements Contract
- `.planning/ROADMAP.md` - Phase 2 goal, mapped requirements (DATA-01..DATA-04), and success criteria.
- `.planning/REQUIREMENTS.md` - Requirement definitions and project-level scope boundaries.
- `.planning/PROJECT.md` - Core constraints (LQ45-only, schedule model, cost and safety expectations).

### Prior Locked Operational Decisions
- `.planning/phases/01-foundation-control-plane/01-CONTEXT.md` - Scheduling, run admission, and control-plane constraints that Phase 2 must integrate with.

### Existing Implementation Contracts
- `src/modules/queue/cron.ts` - Current daily/weekly scheduler execution path and timezone/overlap behavior.
- `src/modules/queue/worker.ts` - Queue execution model and retry/backoff behavior.
- `src/modules/runs/runs.service.ts` - Run lifecycle hooks for daily/weekly triggers and status transitions.
- `src/db/schema.sql` - Existing persistence baseline and extension point for Phase 2 data tables.

### Architecture Direction
- `.planning/research/STACK.md` - Candidate data/indicator tooling and system-of-record direction.
- `.planning/research/ARCHITECTURE.md` - Planned Node control-plane and Python AI engine interaction boundaries.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/modules/queue/cron.ts`: cron scheduling and overlap-skip admission logic can trigger Phase 2 weekly and daily data jobs.
- `src/modules/queue/worker.ts`: BullMQ queue + retry/backoff provides execution scaffold for watchlist/data pipelines.
- `src/modules/runs/runs.service.ts`: run creation/status updates and error handling can host Phase 2 pipeline orchestration outcomes.
- `src/db/schema.sql`: existing Postgres schema pattern (typed tables + status/error records) is reusable for market/watchlist/sentiment persistence.

### Established Patterns
- Node service owns orchestration with BullMQ and node-cron under Asia/Jakarta scheduling.
- Run lifecycle is persisted and observable (`queued -> running -> succeeded|failed|skipped_overlap|canceled`).
- Input validation is Zod-first in service layer before repository writes.

### Integration Points
- Weekly run path: scheduled/manual weekly trigger should invoke universe refresh + watchlist selection and persist resulting symbols.
- Daily run path: scheduled/manual daily trigger should fetch OHLCV/indicators/news sentiment for current watchlist symbols.
- UI/API extension points: existing control-plane routes and app shell can surface watchlist defaults and data-source status later in this phase.

</code_context>

<specifics>
## Specific Ideas

- Weekly watchlist scoring must explicitly combine liquidity, trend, and chart-structure factors.
- Watchlist target count defaults to 10 but remains operator-editable via UI.
- Missing-input handling was finalized as exclusion + backfill during weekly selection.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 2-Data Layer & Watchlist Pipeline*
*Context gathered: 2026-05-22*
