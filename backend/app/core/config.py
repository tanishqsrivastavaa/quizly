from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    app_name: str = "Quizly Backend"
    app_env: str = "development"
    debug: bool = False
    api_v1_prefix: str = "/v1"
    auto_create_tables: bool = True

    database_uri: str = Field(alias="DATABASE_URI")
    groq_api_key: str = Field(alias="GROQ_API_KEY")
    openai_api_key: str = Field(alias="OPENAI_API_KEY")

    groq_model: str = "llama-3.3-70b-versatile"
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536

    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_minutes: int = 60 * 24 * 7

    max_upload_size_mb: int = 20
    max_requests_per_minute: int = 120
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://quizly-nu.vercel.app",
    ]

    ingestion_retry_attempts: int = 3
    storage_dir: Path = Path("backend/storage")

    mock_providers: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
