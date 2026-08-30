import os
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
    # Free-tier model on OpenRouter. Change here or override via THEORY_LLM_MODEL env var.
    # "openai/gpt-oss-120b:free" was deprecated; using Meta Llama 3.3 70B instead.
    theory_llm_model: str = "meta-llama/llama-3.3-70b-instruct:free"

    # CORS
    cors_origins: str = "http://localhost:3000"

    # JWT Security Configuration
    jwt_secret_key: str = "change_this_to_a_secure_random_string_in_production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 15
    jwt_refresh_token_expire_days: int = 7

    # ── LangSmith observability ───────────────────────────────────────────────
    # Set LANGCHAIN_API_KEY to enable tracing. All other fields have sensible
    # defaults and are optional.
    langchain_api_key: str | None = None
    langchain_tracing_v2: str = "false"
    langchain_project: str = "treble-ai"
    langchain_endpoint: str = "https://api.smith.langchain.com"


def get_settings() -> Settings:
    return Settings()


settings = get_settings()


def configure_langsmith(s: Settings | None = None) -> None:
    """
    Push LangSmith config into os.environ so LangChain picks it up automatically.
    Call once at app startup (main.py lifespan). Safe to call when the key is absent
    — tracing stays off and no error is raised.
    """
    s = s or settings
    if s.langchain_api_key:
        os.environ.setdefault("LANGCHAIN_API_KEY",      s.langchain_api_key)
        os.environ.setdefault("LANGCHAIN_TRACING_V2",   "true")
        os.environ.setdefault("LANGCHAIN_PROJECT",      s.langchain_project)
        os.environ.setdefault("LANGCHAIN_ENDPOINT",     s.langchain_endpoint)
        print(f"[LangSmith] Tracing enabled → project: {s.langchain_project}")
