from sqlalchemy import JSON, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class ReferenceSection(Base):
    __tablename__ = "reference_sections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    entries: Mapped[list["ReferenceEntry"]] = relationship(
        "ReferenceEntry", back_populates="section", order_by="ReferenceEntry.id"
    )


class ReferenceEntry(Base):
    __tablename__ = "reference_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    section_id: Mapped[int] = mapped_column(ForeignKey("reference_sections.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    section: Mapped["ReferenceSection"] = relationship("ReferenceSection", back_populates="entries")


# Future embedding columns can be added here once pgvector is introduced.

