import os
import logging
from fastapi import FastAPI
from database import Base, engine
from routes import ticket_routes, auth_routes
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from auth import SESSION_SECRET_KEY
from sqlalchemy import text

DEFAULT_COUNCIL_EMAIL = os.getenv("COUNCIL_EMAIL", "council@gmail.com")
APP_ENV = os.getenv("APP_ENV", "development").strip().lower()

logger = logging.getLogger(__name__)

app = FastAPI()

Base.metadata.create_all(bind=engine)


def ensure_legacy_schema() -> None:
    with engine.begin() as connection:
        if connection.dialect.name != "sqlite":
            return

        result = connection.execute(text("PRAGMA table_info(tickets)"))
        columns = {row[1] for row in result.fetchall()}
        if "location" not in columns:
            connection.execute(text("ALTER TABLE tickets ADD COLUMN location VARCHAR"))
        if "category" not in columns:
            connection.execute(text("ALTER TABLE tickets ADD COLUMN category VARCHAR DEFAULT 'General'"))
            connection.execute(text("UPDATE tickets SET category = 'General' WHERE category IS NULL"))
        if "assigned_council" not in columns:
            connection.execute(text("ALTER TABLE tickets ADD COLUMN assigned_council VARCHAR DEFAULT 'General Council'"))
            connection.execute(text("UPDATE tickets SET assigned_council = 'General Council' WHERE assigned_council IS NULL"))
        if "assigned_council_email" not in columns:
            connection.execute(text("ALTER TABLE tickets ADD COLUMN assigned_council_email VARCHAR"))
        connection.execute(
            text("UPDATE tickets SET assigned_council_email = :email WHERE assigned_council_email IS NULL"),
            {"email": DEFAULT_COUNCIL_EMAIL},
        )
        if "vote_count" not in columns:
            connection.execute(text("ALTER TABLE tickets ADD COLUMN vote_count INTEGER DEFAULT 0"))
        if "created_at" not in columns:
            connection.execute(text("ALTER TABLE tickets ADD COLUMN created_at DATETIME"))
            connection.execute(text("UPDATE tickets SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"))


ensure_legacy_schema()


def validate_production_config() -> None:
    if APP_ENV != "production":
        return

    required_env = [
        "DATABASE_URL",
        "SESSION_SECRET_KEY",
        "CORS_ALLOW_ORIGINS",
        "SMTP_SENDER_EMAIL",
        "SMTP_APP_PASSWORD",
        "COUNCIL_EMAIL",
    ]
    missing = [key for key in required_env if not os.getenv(key, "").strip()]
    if missing:
        raise RuntimeError(f"Missing required production env vars: {', '.join(missing)}")

    if SESSION_SECRET_KEY == "change-this-secret-key":
        raise RuntimeError("SESSION_SECRET_KEY must be changed in production")


validate_production_config()

app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET_KEY)

# Dev allowed origins (localhost on any port)
default_origins = [] if APP_ENV == "production" else [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]
extra_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOW_ORIGINS", "").split(",")
    if origin.strip()
]
allow_origins = default_origins + extra_origins

if APP_ENV == "production" and not allow_origins:
    logger.warning("Production is running with no CORS origins configured")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ticket_routes.router)
app.include_router(auth_routes.router)