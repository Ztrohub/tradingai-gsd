# Summary

## Outcome

Weekly watchlist selection now analyzes the full LQ45 universe with a hybrid trend-first model instead of a liquidity-heavy score.

## Changes

- Replaced placeholder weekly ranking logic in `src/modules/data/watchlist.service.ts`.
- Added candidate classification:
  - `trend_candidate`
  - `reversal_candidate`
  - `reject`
- Added hard gates so bearish/liquid symbols are rejected unless they show confirmed reversal characteristics.
- Prioritized healthy trend candidates ahead of reversal candidates during ranking.
- Kept full-universe analysis before top-10 trimming.
- Added synthetic tests covering:
  - healthy trend candidate
  - bearish liquidity trap rejection
  - confirmed reversal candidate
  - trend candidate ranked ahead of higher-liquidity reversal candidate

## Verification

- `npm run test`
- `npm run build`
