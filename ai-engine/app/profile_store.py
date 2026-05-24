from __future__ import annotations

from dataclasses import dataclass

import psycopg

from .settings import settings


@dataclass
class ActiveProfile:
    provider: str
    model: str
    api_base: str
    api_key: str
    temperature: float
    max_tokens: int


def load_active_profile() -> ActiveProfile:
    with psycopg.connect(settings.database_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select provider, model, api_base, api_key, temperature, max_tokens
                from provider_profiles
                where is_active=true
                order by id desc
                limit 1
                """
            )
            row = cur.fetchone()

    if not row:
        raise RuntimeError("active_provider_profile_not_found")

    provider, model, api_base, api_key, temperature, max_tokens = row
    return ActiveProfile(
        provider=str(provider),
        model=str(model),
        api_base=str(api_base),
        api_key=str(api_key),
        temperature=float(temperature),
        max_tokens=int(max_tokens),
    )
