from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    ai_engine_host: str = Field(default="0.0.0.0", alias="AI_ENGINE_HOST")
    ai_engine_port: int = Field(default=8080, alias="AI_ENGINE_PORT")
    database_url: str = Field(alias="DATABASE_URL")


settings = Settings()
