"""Initial schema for Quizly backend."""

from __future__ import annotations

from typing import Sequence

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision = "20260313_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enable pgvector extension first (before creating tables that use it)
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=False)

    op.create_table(
        "documents",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("filename", sa.String(length=512), nullable=False),
        sa.Column("content_type", sa.String(length=128), nullable=False),
        sa.Column("storage_path", sa.String(length=1024), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failure_reason", sa.String(length=2048), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_documents_user_id", "documents", ["user_id"], unique=False)
    op.create_index("ix_documents_status", "documents", ["status"], unique=False)
    op.create_index(
        "ix_documents_user_created_at",
        "documents",
        ["user_id", "created_at"],
        unique=False,
    )

    op.create_table(
        "quiz_sessions",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "document_id", sa.Uuid(), sa.ForeignKey("documents.id"), nullable=True
        ),
        sa.Column("knowledge_mode", sa.String(length=32), nullable=False),
        sa.Column("topic", sa.String(length=512), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("mastery_map", sa.JSON(), nullable=False),
        sa.Column("current_question", sa.Text(), nullable=True),
        sa.Column("seed_context", sa.Text(), nullable=True),
        sa.Column("turns_completed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_score", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_quiz_sessions_user_id", "quiz_sessions", ["user_id"], unique=False
    )
    op.create_index(
        "ix_quiz_sessions_document_id", "quiz_sessions", ["document_id"], unique=False
    )
    op.create_index(
        "ix_quiz_sessions_status", "quiz_sessions", ["status"], unique=False
    )
    op.create_index(
        "ix_quiz_sessions_user_status",
        "quiz_sessions",
        ["user_id", "status"],
        unique=False,
    )

    op.create_table(
        "embeddings",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "document_id", sa.Uuid(), sa.ForeignKey("documents.id"), nullable=False
        ),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("embedding", Vector(1536), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint(
            "document_id", "chunk_index", name="uq_embedding_document_chunk_index"
        ),
    )
    op.create_index("ix_embeddings_user_id", "embeddings", ["user_id"], unique=False)
    op.create_index(
        "ix_embeddings_document_id", "embeddings", ["document_id"], unique=False
    )

    op.create_table(
        "transcript",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column(
            "session_id", sa.Uuid(), sa.ForeignKey("quiz_sessions.id"), nullable=False
        ),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("turn_index", sa.Integer(), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("rationale", sa.Text(), nullable=False),
        sa.Column("hint", sa.Text(), nullable=True),
        sa.Column("next_question", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint(
            "session_id", "turn_index", name="uq_transcript_session_turn"
        ),
    )
    op.create_index(
        "ix_transcript_session_id", "transcript", ["session_id"], unique=False
    )
    op.create_index("ix_transcript_user_id", "transcript", ["user_id"], unique=False)
    op.create_index(
        "ix_transcript_session_created_at",
        "transcript",
        ["session_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_transcript_user_created_at",
        "transcript",
        ["user_id", "created_at"],
        unique=False,
    )

    # Create vector index for embeddings
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_embeddings_embedding_vector "
            "ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)"
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP INDEX IF EXISTS ix_embeddings_embedding_vector")

    op.drop_index("ix_transcript_user_created_at", table_name="transcript")
    op.drop_index("ix_transcript_session_created_at", table_name="transcript")
    op.drop_index("ix_transcript_user_id", table_name="transcript")
    op.drop_index("ix_transcript_session_id", table_name="transcript")
    op.drop_table("transcript")

    op.drop_index("ix_embeddings_document_id", table_name="embeddings")
    op.drop_index("ix_embeddings_user_id", table_name="embeddings")
    op.drop_table("embeddings")

    op.drop_index("ix_quiz_sessions_user_status", table_name="quiz_sessions")
    op.drop_index("ix_quiz_sessions_status", table_name="quiz_sessions")
    op.drop_index("ix_quiz_sessions_document_id", table_name="quiz_sessions")
    op.drop_index("ix_quiz_sessions_user_id", table_name="quiz_sessions")
    op.drop_table("quiz_sessions")

    op.drop_index("ix_documents_user_created_at", table_name="documents")
    op.drop_index("ix_documents_status", table_name="documents")
    op.drop_index("ix_documents_user_id", table_name="documents")
    op.drop_table("documents")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
