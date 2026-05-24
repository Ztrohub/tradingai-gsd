# Plan

Finalize ai-engine integration with existing Node runtime:

- ensure ai-engine provider API keys come from root `.env` and expose placeholders in `.env.example`
- make `npm run dev` auto-start ai-engine service
- call ai-engine weekly debate endpoint using retrieval payload produced by watchlist pipeline
- persist debate decisions to Postgres for auditability
