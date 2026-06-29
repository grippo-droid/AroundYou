from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    MONGO_URI: str
    DB_NAME: str
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week
    COOKIE_NAME: str = "access_token"
    COOKIE_SECURE: bool = False
    DOMAIN: str = "localhost"
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: List[str] = ["http://localhost:8080", "http://localhost:5173"]

    # ── Admin ─────────────────────────────────────────────────────────────────
    # Set a strong secret in .env; anyone with this key can create an admin account
    ADMIN_SECRET_KEY: str = "aroundyou-admin-secret"

    # ── SMS / OTP ──────────────────────────────────────────────────────────────
    # Set to "msg91" or "twilio" for production; "console" prints OTP to server log
    SMS_PROVIDER: str = "console"

    # MSG91 (preferred for India) — https://msg91.com
    MSG91_API_KEY: str = ""
    MSG91_TEMPLATE_ID: str = ""
    MSG91_SENDER_ID: str = "NRME"

    # Twilio — https://twilio.com
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""

    # ── Cloudinary (image uploads) ─────────────────────────────────────────────
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
