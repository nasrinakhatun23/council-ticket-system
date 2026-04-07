import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env", override=False)
load_dotenv(BASE_DIR / ".env.example", override=False)

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
if not DATABASE_URL:
	raise RuntimeError(
		"DATABASE_URL is required. Set a PostgreSQL URL, for example: "
		"postgresql://user:password@localhost:5432/council_ticket_system"
	)

# Render may provide postgres://; SQLAlchemy expects postgresql://
if DATABASE_URL.startswith("postgres://"):
	DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if not DATABASE_URL.lower().startswith("postgresql://"):
	raise RuntimeError(
		"Only PostgreSQL is supported. DATABASE_URL must start with postgresql://"
	)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()