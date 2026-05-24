# Plan

Scaffold `ai-engine` as a Python service that can connect to the existing Node environment:

- create FastAPI service with health and watchlist debate endpoints
- embed TradingAgents dependency (pinned git tag) for vendor-style integration
- define strict request/response schemas for debate payloads
- implement provider-backed LLM adapter (`openrouter` / `groq` / `openai`)
- add Docker Compose service wiring and environment variables
- update docs and project state artifacts
