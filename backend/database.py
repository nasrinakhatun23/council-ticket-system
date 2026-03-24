import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_SQLITE_PATH = BASE_DIR / "test.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_SQLITE_PATH.as_posix()}")

is_sqlite = DATABASE_URL.startswith("sqlite")
engine_kwargs = {"connect_args": {"check_same_thread": False}} if is_sqlite else {}
engine = create_engine(DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()