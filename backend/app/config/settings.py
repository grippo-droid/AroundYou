from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    MONGO_URI: str
    DB_NAME: str = "around_you_db"
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week
    COOKIE_NAME: str = "access_token"
    COOKIE_SECURE: bool = False
    DOMAIN: str = "localhost"
    ENVIRONMENT: str = "development"
    # Python logging level: DEBUG, INFO, WARNING, ERROR, CRITICAL
    LOG_LEVEL: str = "INFO"
    # Comma-separated list of allowed origins, e.g. "https://app.vercel.app,https://www.example.com"
    ALLOWED_ORIGINS: str = "http://localhost:5173"

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

    # ── AI / Semantic Search ─────────────────────────────────────────────────
    # Local embedding model, run with ONNX Runtime (no torch). Files come from
    # the model's Hugging Face repo, pinned to a revision so vectors stay
    # identical to those already stored in Atlas. They're fetched at build
    # time by scripts/download_embedding_model.py (or on first use if missing).
    # EMBEDDING_DIMENSIONS must match the model's output size and the Atlas
    # vector index (scripts/create_vector_search_index.py).
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    EMBEDDING_MODEL_REVISION: str = "1110a243fdf4706b3f48f1d95db1a4f5529b4d41"
    # Relative paths resolve against backend/.
    EMBEDDING_MODEL_DIR: str = "models/all-MiniLM-L6-v2"
    EMBEDDING_DIMENSIONS: int = 384

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    @property
    def COOKIE_SAMESITE(self) -> str:
        return "none" if self.COOKIE_SECURE else "lax"

settings = Settings()
