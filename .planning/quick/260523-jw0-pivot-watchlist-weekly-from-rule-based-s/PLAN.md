# Plan

Pivot weekly watchlist selection away from static rule-based scoring into a retrieval-first pipeline:

- fetch historical OHLCV for all LQ45 symbols plus IHSG benchmark
- extract technical feature vectors from rolling windows
- run similarity search against historical analog windows and summarize forward outcomes
- rank watchlist candidates from analog expectancy instead of fixed indicator thresholds
- persist retrieval metadata and a debate-ready JSON payload for the future TradingAgents-style multi-agent engine
- keep existing UI/API watchlist surfaces working by retaining base market metrics in `score_detail`
- add unit tests proving analog edge outranks pure liquidity
