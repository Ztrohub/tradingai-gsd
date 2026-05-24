# Summary

## Outcome

Scaffold `ai-engine` selesai: Python FastAPI service terpisah, vendor-embedded dependency TradingAgents, dan siap terhubung dengan Node environment saat ini.

## Changes

- Added new Python service at `ai-engine/`:
  - `app/main.py` (`/health`, `/v1/watchlist/debate`)
  - strict schemas in `app/schemas.py`
  - env/config in `app/settings.py`
  - provider-backed adapter in `app/tradingagents_adapter.py`
  - package config in `pyproject.toml`
  - container image in `Dockerfile`
- Embedded TradingAgents dependency via pinned git tag:
  - `tradingagents @ git+https://github.com/TauricResearch/TradingAgents.git@v0.2.5`
- Wired Docker compose:
  - added `ai-engine` service on port `8080`
  - added `AI_ENGINE_URL` into `node-control-plane` env
- Updated env and docs:
  - `.env.example`
  - `README.md`
  - `ai-engine/README.md`
  - `.gitignore`
  - `src/config/env.ts` (optional `AI_ENGINE_URL`)

## Verification

- `npm run build`
- `npm run test`
- `python -m compileall ai-engine/app`
