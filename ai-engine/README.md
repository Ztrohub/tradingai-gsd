# AI Engine (TradingAgents Embedded)

Python service scaffold for watchlist debate, designed to run beside the Node control plane.

## What is included

- FastAPI HTTP service
- `POST /v1/watchlist/debate` endpoint with strict JSON schema
- Embedded TradingAgents dependency (pinned to `v0.2.5`)
- Provider-backed LLM calls using the active profile from `provider_profiles` in Postgres
- Fallback decision path if provider call fails

## Local run (without Docker)

```bash
cd ai-engine
python -m venv .venv
. .venv/Scripts/activate
pip install --upgrade pip
pip install .
uvicorn app.main:app --host 0.0.0.0 --port 8080
```

## Health check

```bash
curl http://localhost:8080/health
```
