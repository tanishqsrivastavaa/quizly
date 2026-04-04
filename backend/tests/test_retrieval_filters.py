from __future__ import annotations

from sqlmodel import Session

from backend.app.db.models import Document, EmbeddingChunk, User
from backend.app.db.session import engine
from backend.app.services.retrieval import RetrieverService


def test_retrieval_is_user_document_scoped():
    with Session(engine) as session:
        user_a = User(email="a@example.com", password_hash="hash")
        user_b = User(email="b@example.com", password_hash="hash")
        session.add(user_a)
        session.add(user_b)
        session.commit()
        session.refresh(user_a)
        session.refresh(user_b)

        doc_a = Document(
            user_id=user_a.id,
            filename="a.pdf",
            content_type="application/pdf",
            storage_path="/tmp/a.pdf",
            status="ready",
        )
        doc_b = Document(
            user_id=user_b.id,
            filename="b.pdf",
            content_type="application/pdf",
            storage_path="/tmp/b.pdf",
            status="ready",
        )
        session.add(doc_a)
        session.add(doc_b)
        session.commit()
        session.refresh(doc_a)
        session.refresh(doc_b)

        session.add(
            EmbeddingChunk(
                user_id=user_a.id,
                document_id=doc_a.id,
                chunk_index=0,
                content="User A only content",
                embedding=[0.9] * 1536,
            )
        )
        session.add(
            EmbeddingChunk(
                user_id=user_b.id,
                document_id=doc_b.id,
                chunk_index=0,
                content="User B private content",
                embedding=[0.1] * 1536,
            )
        )
        session.commit()

        retriever = RetrieverService(session)
        context = retriever._retrieve_document_context(user_a.id, doc_a.id, "content")
        assert "User A only content" in context
        assert "User B private content" not in context
