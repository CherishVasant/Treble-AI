import datetime
from sqlalchemy import JSON, ForeignKey, Integer, String, Text, DateTime
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


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    token_version: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        onupdate=lambda: datetime.datetime.now(datetime.timezone.utc),
        nullable=False,
    )
    last_login: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    theory_chats: Mapped[list["TheoryTutorChat"]] = relationship(
        "TheoryTutorChat", back_populates="user", cascade="all, delete-orphan"
    )
    practice_sessions: Mapped[list["PracticeSession"]] = relationship(
        "PracticeSession", back_populates="user", cascade="all, delete-orphan"
    )


class TheoryTutorChat(Base):
    __tablename__ = "theory_tutor_chats"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        onupdate=lambda: datetime.datetime.now(datetime.timezone.utc),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="theory_chats")
    messages: Mapped[list["TheoryTutorMessage"]] = relationship(
        "TheoryTutorMessage",
        back_populates="chat",
        cascade="all, delete-orphan",
        order_by="TheoryTutorMessage.created_at",
    )


class TheoryTutorMessage(Base):
    __tablename__ = "theory_tutor_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID
    chat_id: Mapped[str] = mapped_column(
        ForeignKey("theory_tutor_chats.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(32), nullable=False)  # 'user' or 'assistant'
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        nullable=False,
    )

    chat: Mapped["TheoryTutorChat"] = relationship("TheoryTutorChat", back_populates="messages")


class PracticeSession(Base):
    __tablename__ = "practice_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID or job_id
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_directory: Mapped[str] = mapped_column(String(512), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        onupdate=lambda: datetime.datetime.now(datetime.timezone.utc),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="practice_sessions")
    chat: Mapped["PracticeChat"] = relationship(
        "PracticeChat", back_populates="session", uselist=False, cascade="all, delete-orphan"
    )
    analysis: Mapped["AnalysisReport"] = relationship(
        "AnalysisReport", back_populates="session", uselist=False, cascade="all, delete-orphan"
    )


class PracticeChat(Base):
    __tablename__ = "practice_chats"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID
    practice_session_id: Mapped[str] = mapped_column(
        ForeignKey("practice_sessions.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        onupdate=lambda: datetime.datetime.now(datetime.timezone.utc),
        nullable=False,
    )

    session: Mapped["PracticeSession"] = relationship("PracticeSession", back_populates="chat")
    messages: Mapped[list["PracticeMessage"]] = relationship(
        "PracticeMessage",
        back_populates="chat",
        cascade="all, delete-orphan",
        order_by="PracticeMessage.created_at",
    )


class PracticeMessage(Base):
    __tablename__ = "practice_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID
    practice_chat_id: Mapped[str] = mapped_column(
        ForeignKey("practice_chats.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(32), nullable=False)  # 'user' or 'assistant'
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        nullable=False,
    )

    chat: Mapped["PracticeChat"] = relationship("PracticeChat", back_populates="messages")


class AnalysisReport(Base):
    __tablename__ = "analysis_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID
    practice_session_id: Mapped[str] = mapped_column(
        ForeignKey("practice_sessions.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    analysis_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        onupdate=lambda: datetime.datetime.now(datetime.timezone.utc),
        nullable=False,
    )

    session: Mapped["PracticeSession"] = relationship("PracticeSession", back_populates="analysis")

