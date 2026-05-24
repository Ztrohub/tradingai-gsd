# AI Trade IDX - Phase 1 Scaffold

## Quick start

1. Copy env:
   - `cp .env.example .env`
2. Install deps:
   - `npm install`
3. Start infra + app:
   - `docker compose up -d`
   - `npm run dev`
4. Health check:
   - `curl http://localhost:3000/health`
   - `curl http://localhost:8080/health`

## Services

- `node-control-plane` on `:3000`
- `ai-engine` (Python, TradingAgents embedded scaffold) on `:8080`

## Dev note

- `npm run dev` now runs `docker compose up -d ai-engine` first, then starts Node.
- Docker Desktop/daemon must be running for that auto-start step.

## Available scripts
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run test`
- `npm run test:integration`
- `npm run smoke:phase1`
