import os
from pathlib import Path
from authlib.integrations.starlette_client import OAuth
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env.example", override=False)
load_dotenv(BASE_DIR / ".env", override=True)

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8060/auth/google/callback")
SESSION_SECRET_KEY = os.getenv("SESSION_SECRET_KEY", "change-this-secret-key")
FRONTEND_AUTH_SUCCESS_URL = os.getenv("FRONTEND_AUTH_SUCCESS_URL", "http://localhost:5173/oauth-success")
FRONTEND_AUTH_ERROR_URL = os.getenv("FRONTEND_AUTH_ERROR_URL", "http://localhost:5173/login?oauth=failed")
ADMIN_EMAIL = "nasrinakhatun23@navgurukul.org"


def _is_placeholder(value: str) -> bool:
    normalized = (value or "").strip().lower()
    if not normalized:
        return True
    return normalized.startswith("your_") or "replace_with" in normalized


def is_google_configured() -> bool:
    return not _is_placeholder(GOOGLE_CLIENT_ID) and not _is_placeholder(GOOGLE_CLIENT_SECRET)

oauth = OAuth()

if is_google_configured():
    oauth.register(
        name="google",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )