"""Create tables and seed reference library headers and static entries."""

import sys
import time
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import Base, engine, SessionLocal
from models import ReferenceEntry, ReferenceSection
from reference_data.registry import REFERENCE_REGISTRY


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


def seed_reference_data(db: Session) -> None:
    print("Seeding reference library category headers and static entries...")
    try:
        # 1. Seed Dynamic Categories (Headers only, no entries)
        for slug, config in REFERENCE_REGISTRY["dynamic"].items():
            section = db.query(ReferenceSection).filter_by(slug=slug).first()
            if not section:
                title = REFERENCE_REGISTRY["descriptions"].get(slug, slug.replace("_", " ").capitalize())
                desc = REFERENCE_REGISTRY["descriptions"].get(slug)
                
                section = ReferenceSection(
                    slug=slug,
                    title=title,
                    description=desc,
                    sort_order=config["sort_order"]
                )
                db.add(section)
                db.flush()
            
        # 2. Seed Static Categories (Headers + Entries)
        for slug, config in REFERENCE_REGISTRY["static"].items():
            section = db.query(ReferenceSection).filter_by(slug=slug).first()
            if not section:
                section = ReferenceSection(
                    slug=slug,
                    title=config["title"],
                    description=config.get("description"),
                    sort_order=config["sort_order"]
                )
                db.add(section)
                db.flush()  # Get section.id for foreign key
                
                for i, ent in enumerate(config["entries"]):
                    db.add(
                        ReferenceEntry(
                            section_id=section.id,
                            title=ent["title"],
                            description=ent.get("description"),
                        )
                    )
                
        db.commit()
        print("Database seeding completed successfully.")
    except Exception as exc:
        db.rollback()
        print(f"Error seeding database: {exc}")
        raise exc


def verify_db_connection() -> None:
    max_retries = 10
    retry_delay = 3
    for attempt in range(1, max_retries + 1):
        print(f"Connecting to PostgreSQL (attempt {attempt}/{max_retries})...")
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
                print("Connected successfully.")
                return
        except Exception as exc:
            print(f"Connection attempt {attempt} failed: {exc}")
            if attempt < max_retries:
                print(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                print("\nDatabase unavailable. Max retries exceeded.")
                print("Cannot start database verification. Stopping immediately.")
                sys.exit(1)


def run_startup_seed() -> None:
    verify_db_connection()

    db_type = "PostgreSQL" if "postgres" in engine.url.drivername or "psycopg" in engine.url.drivername else "Unknown"
    print(f"Database: {db_type}")
    print(f"Host: {engine.url.host or 'local'}")
    print("Pooling: Enabled")

    init_db()
    db = SessionLocal()
    try:
        seed_reference_data(db)
    finally:
        db.close()

if __name__ == "__main__":
    run_startup_seed()
