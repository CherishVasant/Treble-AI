from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from config import settings


class Base(DeclarativeBase):
    pass


# Translate standard PostgreSQL connection protocols to use the psycopg driver.
db_url = settings.database_url
if not db_url:
    raise RuntimeError("DATABASE_URL is not configured. Add it to backend/.env and restart the server.")

if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+psycopg://", 1)
elif db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)

# Auto-append SSL mode for remote connections if not already specified.
if "localhost" not in db_url and "127.0.0.1" not in db_url:
    if "sslmode=" not in db_url:
        if "?" in db_url:
            db_url += "&sslmode=require"
        else:
            db_url += "?sslmode=require"

engine = create_engine(
    db_url,
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_use_lifo=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

