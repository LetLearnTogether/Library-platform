import logging
import os
import secrets
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")
APP_ENV = os.getenv("APP_ENV", "development").lower()

if os.getenv("DATABASE_URL"):
    DATABASE_URL = os.environ["DATABASE_URL"]
elif os.getenv("DB_HOST"):
    from urllib.parse import quote_plus

    user = quote_plus(os.getenv("DB_USER", "root"))
    password = quote_plus(os.getenv("DB_PASSWORD", ""))
    host = os.getenv("DB_HOST", "localhost")
    port = os.getenv("DB_PORT", "3306")
    name = quote_plus(os.getenv("DB_NAME", "letlearn_db"))
    DATABASE_URL = f"mysql+pymysql://{user}:{password}@{host}:{port}/{name}"
else:
    DATABASE_URL = f"sqlite:///{BASE_DIR / 'letlearn.db'}"

_configured_secret = os.getenv("SECRET_KEY", "")
placeholder_markers = ("change", "replace", "super_secret", "your_password")
if not _configured_secret or any(marker in _configured_secret.lower() for marker in placeholder_markers):
    if APP_ENV == "production":
        raise RuntimeError("Production requires a strong SECRET_KEY configured in the environment.")
    SECRET_KEY = secrets.token_urlsafe(48)
    logging.warning("Using an ephemeral development JWT key; set SECRET_KEY in backend/.env for stable tokens.")
else:
    SECRET_KEY = _configured_secret

ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR") or str(BASE_DIR / "uploads")).resolve()
UPLOAD_DIR_CONFIGURED = bool(os.getenv("UPLOAD_DIR"))
MAX_UPLOAD_SIZE_BYTES = int(os.getenv("MAX_UPLOAD_SIZE_BYTES", str(10 * 1024 * 1024)))
PUBLIC_API_BASE_URL = os.getenv("PUBLIC_API_BASE_URL", "http://localhost:8000/api/v1").rstrip("/")
PUBLIC_FRONTEND_URL = os.getenv("PUBLIC_FRONTEND_URL", "http://localhost:5173").rstrip("/")
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip()
]
