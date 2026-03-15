from datetime import UTC, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import JSON, Column, DateTime, Index, String, UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel

from backend.app.db.types import EmbeddingVector


def utcnow() -> datetime:
    return datetime.now(UTC)


class DocumentStatus(StrEnum):
    QUEUED = "queued"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class KnowledgeMode(StrEnum):
    PROMPT = "prompt"
    DOCUMENT = "document"


class SessionStatus(StrEnum):
    ACTIVE = "active"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(sa_column=Column(String(320), unique=True, nullable=False, index=True))
    password_hash: str = Field(sa_column=Column(String(255), nullable=False))
    created_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False, default=utcnow),
    )
    updated_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow),
    )

    documents: list["Document"] = Relationship(back_populates="user")
    sessions: list["QuizSession"] = Relationship(back_populates="user")
    turns: list["TranscriptTurn"] = Relationship(back_populates="user")


class Document(SQLModel, table=True):
    __tablename__ = "documents"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", nullable=False, index=True)
    filename: str = Field(sa_column=Column(String(512), nullable=False))
    content_type: str = Field(sa_column=Column(String(128), nullable=False))
    storage_path: str = Field(sa_column=Column(String(1024), nullable=False))
    status: DocumentStatus = Field(default=DocumentStatus.QUEUED, index=True)
    retry_count: int = Field(default=0, nullable=False)
    failure_reason: str | None = Field(default=None, sa_column=Column(String(2048), nullable=True))
    created_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False, default=utcnow),
    )
    updated_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow),
    )

    user: User | None = Relationship(back_populates="documents")
    embeddings: list["EmbeddingChunk"] = Relationship(back_populates="document")

    __table_args__ = (
        Index("ix_documents_user_created_at", "user_id", "created_at"),
    )


class EmbeddingChunk(SQLModel, table=True):
    __tablename__ = "embeddings"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", nullable=False, index=True)
    document_id: UUID = Field(foreign_key="documents.id", nullable=False, index=True)
    chunk_index: int = Field(nullable=False)
    content: str = Field(sa_column=Column(String, nullable=False))
    embedding: list[float] = Field(
        sa_column=Column(EmbeddingVector(1536), nullable=False),
    )
    created_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False, default=utcnow),
    )

    document: Document | None = Relationship(back_populates="embeddings")

    __table_args__ = (
        UniqueConstraint("document_id", "chunk_index", name="uq_embedding_document_chunk_index"),
    )


class QuizSession(SQLModel, table=True):
    __tablename__ = "quiz_sessions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", nullable=False, index=True)
    document_id: UUID | None = Field(default=None, foreign_key="documents.id", index=True)
    knowledge_mode: KnowledgeMode = Field(nullable=False)
    topic: str | None = Field(default=None, sa_column=Column(String(512), nullable=True))
    status: SessionStatus = Field(default=SessionStatus.ACTIVE, index=True)
    mastery_map: dict[str, float] = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    current_question: str | None = Field(default=None, sa_column=Column(String, nullable=True))
    seed_context: str | None = Field(default=None, sa_column=Column(String, nullable=True))
    turns_completed: int = Field(default=0, nullable=False)
    last_score: float | None = Field(default=None, nullable=True)
    created_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False, default=utcnow),
    )
    updated_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow),
    )

    user: User | None = Relationship(back_populates="sessions")
    turns: list["TranscriptTurn"] = Relationship(back_populates="session")

    __table_args__ = (
        Index("ix_quiz_sessions_user_status", "user_id", "status"),
    )


class TranscriptTurn(SQLModel, table=True):
    __tablename__ = "transcript"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    session_id: UUID = Field(foreign_key="quiz_sessions.id", nullable=False, index=True)
    user_id: UUID = Field(foreign_key="users.id", nullable=False, index=True)
    turn_index: int = Field(nullable=False)
    question: str = Field(sa_column=Column(String, nullable=False))
    answer: str = Field(sa_column=Column(String, nullable=False))
    score: float = Field(nullable=False)
    rationale: str = Field(sa_column=Column(String, nullable=False))
    hint: str | None = Field(default=None, sa_column=Column(String, nullable=True))
    next_question: str = Field(sa_column=Column(String, nullable=False))
    created_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False, default=utcnow),
    )

    session: QuizSession | None = Relationship(back_populates="turns")
    user: User | None = Relationship(back_populates="turns")

    __table_args__ = (
        Index("ix_transcript_session_created_at", "session_id", "created_at"),
        Index("ix_transcript_user_created_at", "user_id", "created_at"),
        UniqueConstraint("session_id", "turn_index", name="uq_transcript_session_turn"),
    )


TABLE_MODELS: list[type[SQLModel]] = [
    User,
    Document,
    EmbeddingChunk,
    QuizSession,
    TranscriptTurn,
]


def ensure_json_serializable(value: dict[str, Any]) -> dict[str, Any]:
    return value
