from __future__ import annotations

from fastapi import FastAPI, HTTPException

from .profile_store import load_active_profile
from .schemas import DebateRequest, DebateResponse
from .tradingagents_adapter import DebateEngineError, installed_tradingagents_version, run_weekly_multi_agent_strategy

app = FastAPI(title="ai-engine", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    provider = "unknown"
    model = "unknown"
    try:
        profile = load_active_profile()
        provider = profile.provider
        model = profile.model
    except Exception:
        pass
    return {
        "status": "ok",
        "provider": provider,
        "model": model,
        "tradingagents_version": installed_tradingagents_version(),
        "rate_limit_profile": "30_rpm_1000_rpd_8000_tpm_200000_tpd",
    }


@app.post("/v1/watchlist/debate", response_model=DebateResponse)
def debate_watchlist(payload: DebateRequest) -> DebateResponse:
    profile = load_active_profile()
    try:
        strategy = run_weekly_multi_agent_strategy(payload, profile)
    except DebateEngineError as exc:
        raise HTTPException(
            status_code=500,
            detail={
                "code": exc.code,
                "message": exc.detail,
                "context": exc.context,
            },
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail={
                "code": "weekly_debate_failed",
                "message": str(exc),
            },
        ) from exc
    return DebateResponse(
        run_id=payload.run_id,
        as_of_date=payload.as_of_date,
        selected_symbols=strategy["selected_symbols"],
        dynamic_filters=strategy["dynamic_filters"],
        ranking_rules=strategy["ranking_rules"],
        market_regime=strategy["market_regime"],
        rationale=strategy["rationale"],
        agent_reports=strategy["agent_reports"],
        engine_meta=strategy["engine_meta"],
    )
