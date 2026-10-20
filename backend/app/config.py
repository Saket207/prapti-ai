import sys
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


# Project root directory (two levels up from backend/app)
BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

ENV_FILE = BASE_DIR / ".env"


class Settings(BaseSettings):
    """
    Application runtime configuration loaded from environment variables or .env file.
    """
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE) if ENV_FILE.exists() else ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Supabase credentials
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_KEY: str

    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8000

    # Notification & Email
    BREVO_API_KEY: Optional[str] = None
    BREVO_SMTP_LOGIN: Optional[str] = None
    BREVO_SMTP_PASSWORD: Optional[str] = None
    SENDER_EMAIL: Optional[str] = None


settings = Settings()
