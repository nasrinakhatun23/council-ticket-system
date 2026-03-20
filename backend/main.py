from fastapi import FastAPI
from database import Base, engine
from routes import ticket_routes, auth_routes
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from auth import SESSION_SECRET_KEY
from sqlalchemy import text

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


ensure_legacy_schema()

app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET_KEY)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ticket_routes.router)
app.include_router(auth_routes.router)