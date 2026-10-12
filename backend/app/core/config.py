"""Application configuration using pydantic-settings."""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=True, extra="ignore"
    )

    # App
    APP_NAME: str = "NKRIW.MA"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql://nkriwma:nkriwma_password@localhost:5432/nkriwma"

    # JWT
    SECRET_KEY: str = "your-super-secret-key-change-this-in-production-please-use-a-long-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    # Admin defaults
    ADMIN_EMAIL: str = "admin@nkriw.ma"
    ADMIN_PASSWORD: str = "admin123"

    # File storage
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 5

    # SMTP (bootstrap defaults — overridable by admin in the dashboard)
    SMTP_ENABLED: bool = False
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "NKRIW.MA"
    SMTP_USE_TLS: bool = True   # STARTTLS (port 587)
    SMTP_USE_SSL: bool = False  # Implicit SSL (port 465)

    # Password reset OTP
    RESET_OTP_TTL_MINUTES: int = 10
    RESET_OTP_MAX_ATTEMPTS: int = 5

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
    ]


settings = Settings()