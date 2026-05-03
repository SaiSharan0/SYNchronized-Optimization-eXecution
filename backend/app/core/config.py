import secrets
from typing import List

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "SYNOX"
    DEBUG: bool = False
    SECRET_KEY: str = secrets.token_urlsafe(32)

    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/synox"

    JWT_SECRET_KEY: str = Field(
        default_factory=lambda: secrets.token_urlsafe(32),
        validation_alias=AliasChoices("JWT_SECRET_KEY", "JWT_SECRET"),
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""

    PRO_USER_EMAILS: List[str] = []
    ADMIN_USER_EMAILS: List[str] = []

    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 5 * 1024 * 1024

    @field_validator("ALLOWED_ORIGINS", "PRO_USER_EMAILS", "ADMIN_USER_EMAILS", mode="before")
    @classmethod
    def parse_list(cls, value):
        if isinstance(value, str):
            import json

            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return [str(item).strip() for item in parsed if str(item).strip()]
            except Exception:
                pass
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


settings = Settings()
