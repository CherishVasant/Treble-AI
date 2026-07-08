from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent
_ENV_FILE = _BACKEND_DIR / ".env"

# Ensure backend/.env is loaded even when the process cwd is not the backend folder.
load_dotenv(_ENV_FILE, override=False)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # SQLAlchemy URL. Example:
    #   postgresql+psycopg://username:password@localhost:5432/treble
    database_url: str | None = None

    # LangChain / OpenAI (swap model when you pick a provider)
    openai_api_key: str | None = None
    openrouter_api_key: str | None = None
    theory_llm_model: str = "openai/gpt-oss-120b:free"

    # CORS
    cors_origins: str = "http://localhost:3000"

    # JWT Security Configuration
    jwt_secret_key: str = "change_this_to_a_secure_random_string_in_production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 15
    jwt_refresh_token_expire_days: int = 7


def get_settings() -> Settings:
    return Settings()


settings = get_settings()
