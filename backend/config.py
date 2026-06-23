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

    # SQLAlchemy URL. Examples:
    #   sqlite:///./treble.db
    #   postgresql+psycopg://user:password@localhost:5432/treble
    database_url: str = "sqlite:///./treble.db"

    # LangChain / OpenAI (swap model when you pick a provider)
    openai_api_key: str | None = None
    openrouter_api_key: str | None = None
    theory_llm_model: str = "openai/gpt-oss-120b:free"

    # CORS
    cors_origins: str = "http://localhost:3000"


def get_settings() -> Settings:
    return Settings()


settings = get_settings()
