# Summary

## Outcome

Weekly watchlist selection now uses historical similarity retrieval instead of fixed rule-based screening.

## Changes

- Replaced the weekly watchlist engine in `src/modules/data/watchlist.service.ts`.
- Added benchmark-aware technical feature extraction using live OHLCV plus IHSG macro regime context.
- Added historical analog corpus construction and cosine similarity retrieval.
- Ranked symbols by analog expectancy, conviction, downside protection, macro alignment, and only a small liquidity component.
- Persisted debate-ready JSON payloads in `score_detail.debate_input` for future multi-agent consumption.
- Enabled Yahoo benchmark index fetch support for `^JKSE`.
- Updated architecture research doc to reflect the retrieval-first weekly flow.
- Added unit tests for feature extraction and non-liquidity-dominated ranking behavior.

## Verification

- `npm run build`
- `npm run test`
