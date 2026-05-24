from __future__ import annotations

import json
import logging
import operator
import re
import time
from importlib.metadata import PackageNotFoundError, version

from openai import BadRequestError, OpenAI

from .profile_store import ActiveProfile, load_active_profile
from .rate_limiter import estimate_tokens, llm_rate_limiter
from .schemas import DebateRequest, DynamicFilter, RankingRule

logger = logging.getLogger(__name__)

ROLE_DELAY_SECONDS = 60.0
OPERATOR_MAP = {
    ">": operator.gt,
    "<": operator.lt,
    ">=": operator.ge,
    "<=": operator.le,
    "=": operator.eq,
    "!=": operator.ne,
}
ALLOWED_FIELDS = {
    "close",
    "open",
    "high",
    "low",
    "volume",
    "SMA_20",
    "SMA_50",
    "RSI_14",
    "RVOL_10",
    "MOMENTUM_5",
    "MOMENTUM_20",
    "RELATIVE_STRENGTH_20",
    "MACRO_TREND",
    "DAILY_TURNOVER_IDR",
}
ALLOWED_OPERATORS = [">", "<", ">=", "<=", "=", "!="]
MANDATORY_MIN_CLOSE = 60.0
MANDATORY_MIN_DAILY_TURNOVER_IDR = 10_000_000_000.0
BANNED_TERMS = [
    "short-bias",
    "short bias",
    "put option",
    "put-option",
    "sell short",
    "shorting",
]
NEGATION_HINTS = ["avoid", "no ", "not ", "never", "without", "forbid", "prohibit", "long-only", "long only"]

class DebateEngineError(Exception):
    def __init__(self, code: str, detail: str, context: dict | None = None) -> None:
        super().__init__(detail)
        self.code = code
        self.detail = detail
        self.context = context or {}


def installed_tradingagents_version() -> str:
    try:
        return version("tradingagents")
    except PackageNotFoundError:
        return "not-installed"


def _provider_client(profile: ActiveProfile) -> OpenAI:
    if not profile.api_key:
        raise RuntimeError("active_provider_profile_missing_api_key")
    return OpenAI(api_key=profile.api_key, base_url=profile.api_base)


def _call_json_role(
    client: OpenAI, profile: ActiveProfile, role_name: str, system_prompt: str, payload: dict, max_output_tokens: int
) -> tuple[dict, dict]:
    compact_payload = json.dumps(payload, separators=(",", ":"), ensure_ascii=True)
    user_prompt = f"Input JSON:\n{compact_payload}\nReturn JSON only."
    token_budget = min(profile.max_tokens, max_output_tokens)
    llm_rate_limiter.acquire(estimate_tokens(system_prompt + user_prompt, token_budget))
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    try:
        response = client.chat.completions.create(
            model=profile.model,
            temperature=profile.temperature,
            max_tokens=token_budget,
            response_format={"type": "json_object"},
            messages=messages,
        )
        content = response.choices[0].message.content or ""
        parsed = json.loads(content)
        if not isinstance(parsed, dict):
            raise DebateEngineError("agent_response_not_object", "Agent response is not a JSON object", {"role": role_name})
        trace = {
            "role": role_name,
            "response_mode": "json_object",
            "response_id": str(getattr(response, "id", "")),
            "raw_excerpt": content[:800],
        }
        return parsed, trace
    except BadRequestError as exc:
        # Some providers/models reject strict JSON mode even with valid prompts.
        # Retry once without response_format, then enforce JSON parse locally.
        if "json_validate_failed" not in str(exc):
            raise
        logger.warning("json_mode_rejected_retry_plain_completion error=%s", str(exc))

    response = client.chat.completions.create(
        model=profile.model,
        temperature=profile.temperature,
        max_tokens=token_budget,
        messages=messages,
    )
    content = (response.choices[0].message.content or "").strip()
    if "```" in content:
        parts = [part.strip() for part in content.split("```") if part.strip()]
        content = next((part for part in parts if part.startswith("{") and part.endswith("}")), content)
        content = content.removeprefix("json").strip()
    start = content.find("{")
    end = content.rfind("}")
    if start >= 0 and end >= start:
        content = content[start : end + 1]
    try:
        parsed = json.loads(content)
    except Exception as exc:
        raise DebateEngineError(
            "agent_json_parse_failed",
            str(exc),
            {
                "role": role_name,
                "response_mode": "plain_completion",
                "response_id": str(getattr(response, "id", "")),
                "raw_excerpt": content[:1200],
            },
        ) from exc
    if not isinstance(parsed, dict):
        raise DebateEngineError("agent_response_not_object", "Agent response is not a JSON object", {"role": role_name, "raw_excerpt": content[:800]})
    trace = {
        "role": role_name,
        "response_mode": "plain_completion",
        "response_id": str(getattr(response, "id", "")),
        "raw_excerpt": content[:800],
    }
    return parsed, trace


def _normalize_dynamic_filters(value: object) -> list[DynamicFilter]:
    if not isinstance(value, list):
        raise RuntimeError("dynamic_filters_not_array")
    normalized: list[DynamicFilter] = []
    for item in value:
        if not isinstance(item, dict):
            raise RuntimeError("dynamic_filter_item_not_object")
        field = str(item.get("field", "")).strip()
        op = str(item.get("operator", "")).strip()
        raw_value = item.get("value")
        if field not in ALLOWED_FIELDS:
            raise RuntimeError(f"dynamic_filter_field_not_allowed:{field}")
        if op not in OPERATOR_MAP:
            raise RuntimeError(f"dynamic_filter_operator_not_allowed:{op}")
        if isinstance(raw_value, str):
            rhs_field = raw_value.strip()
            if rhs_field not in ALLOWED_FIELDS:
                raise RuntimeError(f"dynamic_filter_rhs_field_not_allowed:{rhs_field}")
            normalized.append(DynamicFilter(field=field, operator=op, value=rhs_field))
            continue
        try:
            num_value = float(raw_value)
        except Exception as exc:
            raise RuntimeError("dynamic_filter_value_not_number_or_field") from exc
        normalized.append(DynamicFilter(field=field, operator=op, value=num_value))
    if not normalized:
        raise RuntimeError("dynamic_filters_empty")
    return normalized


def _normalize_ranking_rules(value: object) -> list[RankingRule]:
    if not isinstance(value, list):
        raise RuntimeError("ranking_rules_not_array")
    normalized: list[RankingRule] = []
    for item in value:
        if not isinstance(item, dict):
            raise RuntimeError("ranking_rule_item_not_object")
        field = str(item.get("field", "")).strip()
        direction = str(item.get("direction", "")).strip()
        raw_weight = item.get("weight")
        try:
            weight = float(raw_weight)
        except Exception as exc:
            raise RuntimeError("ranking_rule_weight_not_number") from exc
        if field not in ALLOWED_FIELDS:
            raise RuntimeError(f"ranking_rule_field_not_allowed:{field}")
        if direction not in {"asc", "desc"}:
            raise RuntimeError(f"ranking_rule_direction_not_allowed:{direction}")
        if weight <= 0:
            raise RuntimeError("ranking_rule_weight_nonpositive")
        normalized.append(RankingRule(field=field, direction=direction, weight=weight))
    if not normalized:
        raise RuntimeError("ranking_rules_empty")
    return normalized


def _contains_banned_term(text: str) -> str | None:
    lowered = text.lower()
    for term in BANNED_TERMS:
        for match in re.finditer(re.escape(term), lowered):
            window_start = max(0, match.start() - 24)
            window = lowered[window_start : match.start()]
            if any(hint in window for hint in NEGATION_HINTS):
                continue
            return term
    return None


def _apply_filters_and_rank(payload: DebateRequest, filters: list[DynamicFilter], rules: list[RankingRule]) -> list[str]:
    rows = [row.model_dump() for row in payload.universe_snapshot]
    # Hard mandatory gate for IDX long-only watchlist quality.
    rows = [
        row
        for row in rows
        if float(row.get("close", 0)) > MANDATORY_MIN_CLOSE
        and float(row.get("DAILY_TURNOVER_IDR", 0)) > MANDATORY_MIN_DAILY_TURNOVER_IDR
    ]
    if len(rows) == 0:
        raise RuntimeError("mandatory_quality_filters_empty")

    for f in filters:
        fn = OPERATOR_MAP[f.operator]
        filtered_rows = []
        for row in rows:
            lhs = row.get(f.field)
            if not isinstance(lhs, (int, float)):
                raise RuntimeError(f"universe_field_non_numeric:{f.field}")
            if isinstance(f.value, str):
                rhs = row.get(f.value)
                if not isinstance(rhs, (int, float)):
                    raise RuntimeError(f"universe_rhs_field_non_numeric:{f.value}")
                rhs_value = float(rhs)
            else:
                rhs_value = float(f.value)
            if fn(float(lhs), rhs_value):
                filtered_rows.append(row)
        rows = filtered_rows
    if len(rows) == 0:
        raise RuntimeError("filtered_symbols_empty")
    if len(rows) <= payload.max_results:
        return [str(row["symbol"]) for row in rows]

    weight_sum = sum(rule.weight for rule in rules)
    scored: list[tuple[float, str]] = []
    for row in rows:
        score = 0.0
        for rule in rules:
            v = row.get(rule.field)
            if not isinstance(v, (int, float)):
                raise RuntimeError(f"ranking_field_non_numeric:{rule.field}")
            signed = float(v) if rule.direction == "desc" else -float(v)
            score += signed * (rule.weight / weight_sum)
        scored.append((score, str(row["symbol"])))
    scored.sort(key=lambda item: item[0], reverse=True)
    return [symbol for _, symbol in scored[: payload.max_results]]


def run_weekly_multi_agent_strategy(payload: DebateRequest, profile: ActiveProfile | None = None) -> dict:
    if profile is None:
        profile = load_active_profile()
    client = _provider_client(profile)
    market_context = payload.market_context.model_dump()

    provider_trace: list[dict] = []
    try:
        macro_report, macro_trace = _call_json_role(
            client, profile, "macro_economist",
            (
                "You are a Macro Economist for the Indonesia Stock Exchange (IDX). "
                "Market policy is STRICT LONG-ONLY. If the market is bearish, your ONLY strategic options are 'Defensive/Cash' or 'Bottom Fishing'. "
                "Do NOT suggest short-selling or put options. "
                "Analyze the market context and return JSON {macro_regime, bias, signals, risk_notes}. "
                "Keep all string values highly concise (maximum 2 sentences per key)."
            ),
            {"market_context": market_context}, 1000
        )
        provider_trace.append(macro_trace)
        time.sleep(ROLE_DELAY_SECONDS)

        # --- 2. SECTOR ANALYST ---
        sector_report, sector_trace = _call_json_role(
            client, profile, "sector_analyst",
            (
                "You are a Sector Analyst for the Indonesia Stock Exchange (IDX). "
                "Market policy is STRICT LONG-ONLY. Focus on finding sectors with money flow and relative strength. "
                "Analyze sector performance and return JSON {leading_sectors, lagging_sectors, bias, signals}. "
                "Keep all string values highly concise (maximum 2 sentences per key)."
            ),
            {"market_context": market_context}, 1000
        )
        provider_trace.append(sector_trace)
        time.sleep(ROLE_DELAY_SECONDS)

        # --- 3. RISK MANAGER ---
        risk_report, risk_trace = _call_json_role(
            client, profile, "risk_manager",
            (
                "You are a Risk Manager for the Indonesia Stock Exchange (IDX). "
                "Market policy is STRICT LONG-ONLY. Your primary focus is protecting capital from 'value traps' and liquidity wipeouts. "
                "Analyze the risk state and return JSON {risk_mode, exposure_guidance, hard_constraints, risk_notes}. "
                "Ensure constraints mandate high IDR turnover/liquidity. Keep all string values highly concise (max 2 sentences per key)."
            ),
            {"market_context": market_context}, 1000
        )
        provider_trace.append(risk_trace)
        time.sleep(ROLE_DELAY_SECONDS)

        # --- 4. META AGENT (SYNTHESIS) ---
        # Karena agen 1-3 sudah diperintahkan "concise", kita tidak perlu lagi memotong string pakai Python.
        meta_context = {
            "market_context": market_context,
            "macro_report": macro_report, 
            "sector_report": sector_report,
            "risk_report": risk_report
        }

        meta_report, meta_trace = _call_json_role(
            client, profile, "meta_agent",
            (
                "You are the Meta-Agent Portfolio Strategist. Decide final weekly screening rules using previous reports. "
                "STRICT CONTRACT: Return exactly one JSON object with exactly 4 top-level keys: "
                "market_regime, rationale, dynamic_filters, ranking_rules. "
                "Do not output markdown. Do not output prose outside JSON. "
                "You operate on the IDX with a STRICT LONG-ONLY policy. Do NOT suggest shorting strategies. "
                f"Allowed dynamic filter fields only: {sorted(ALLOWED_FIELDS)}. "
                f"Allowed operators only: {ALLOWED_OPERATORS}. "
                f"Allowed ranking rule fields only: {sorted(ALLOWED_FIELDS)}. "
                "Allowed ranking rule direction only: ['asc','desc']. "
                "Do not invent derived field names like price_above_sma20. "
                f"Mandatory filters ALWAYS assumed by engine: close > {MANDATORY_MIN_CLOSE} and DAILY_TURNOVER_IDR > {int(MANDATORY_MIN_DAILY_TURNOVER_IDR)}. "
                "dynamic_filters must be a non-empty array of {field,operator,value}. "
                "value may be a number OR one allowed field name string (for cross-field compare). "
                "ranking_rules must be a non-empty array of {field,direction,weight} and weight must be > 0. "
                "rationale must be <= 280 ASCII chars. "
                "VALID EXAMPLE JSON: "
                "{\"market_regime\":\"defensive_long_only\",\"rationale\":\"IHSG below SMA20/50 with weak MOMENTUM_20; keep selective long-only filters.\","
                "\"dynamic_filters\":[{\"field\":\"close\",\"operator\":\"<\",\"value\":\"SMA_20\"},{\"field\":\"MOMENTUM_20\",\"operator\":\"<\",\"value\":0}],"
                "\"ranking_rules\":[{\"field\":\"MOMENTUM_20\",\"direction\":\"asc\",\"weight\":0.6},{\"field\":\"RSI_14\",\"direction\":\"asc\",\"weight\":0.4}]}"
            ),
            meta_context, 1800
        )
        provider_trace.append(meta_trace)
    except DebateEngineError as exc:
        exc.context = {
            **exc.context,
            "provider": profile.provider,
            "model": profile.model,
            "provider_trace": provider_trace,
        }
        raise
    except Exception as exc:
        raise DebateEngineError(
            "provider_call_failed",
            str(exc),
            {
                "provider": profile.provider,
                "model": profile.model,
                "provider_trace": provider_trace,
            },
        ) from exc

    try:
        macro_text = json.dumps(macro_report, ensure_ascii=True)
        sector_text = json.dumps(sector_report, ensure_ascii=True)
        risk_text = json.dumps(risk_report, ensure_ascii=True)
        meta_text = json.dumps(meta_report, ensure_ascii=True)
        for role_name, text in [
            ("macro_economist", macro_text),
            ("sector_analyst", sector_text),
            ("risk_manager", risk_text),
            ("meta_agent", meta_text),
        ]:
            bad = _contains_banned_term(text)
            if bad:
                raise RuntimeError(f"banned_term_detected:{role_name}:{bad}")
        filters = _normalize_dynamic_filters(meta_report.get("dynamic_filters"))
        rules = _normalize_ranking_rules(meta_report.get("ranking_rules"))
        selected_symbols = _apply_filters_and_rank(payload, filters, rules)
    except Exception as exc:
        raise DebateEngineError(
            "strategy_validation_failed",
            str(exc),
            {
                "provider": profile.provider,
                "model": profile.model,
                "meta_report_excerpt": json.dumps(meta_report, ensure_ascii=True)[:1200],
                "provider_trace": provider_trace,
            },
        ) from exc

    return {
        "selected_symbols": selected_symbols,
        "dynamic_filters": [f.model_dump() for f in filters],
        "ranking_rules": [r.model_dump() for r in rules],
        "market_regime": str(meta_report.get("market_regime", "unknown")),
        "rationale": str(meta_report.get("rationale", "")),
        "agent_reports": {
            "macro_economist": {k: str(v) for k, v in macro_report.items()},
            "sector_analyst": {k: str(v) for k, v in sector_report.items()},
            "risk_manager": {k: str(v) for k, v in risk_report.items()},
        },
        "engine_meta": {
            "mode": "multi_agent_sequential",
            "provider": profile.provider,
            "model": profile.model,
            "tradingagents_version": installed_tradingagents_version(),
            "provider_trace_count": str(len(provider_trace)),
        },
        "provider_trace": provider_trace,
    }
