from __future__ import annotations

import math
import time
from uuid import UUID

from sqlmodel import Session, select

from backend.app.db.models import EmbeddingChunk, KnowledgeMode, QuizSession
from backend.app.services.embedding import EmbeddingService
from backend.app.services.llm import LLMService
from backend.app.services.metrics import retrieval_latency_seconds


def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    dot = sum(a * b for a, b in zip(vec_a, vec_b, strict=False))
    norm_a = math.sqrt(sum(a * a for a in vec_a)) or 1.0
    norm_b = math.sqrt(sum(b * b for b in vec_b)) or 1.0
    return dot / (norm_a * norm_b)


class RetrieverService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.embedding_service = EmbeddingService()
        self.llm_service = LLMService()

    def retrieve_for_session(self, quiz_session: QuizSession, query: str, limit: int = 4) -> str:
        started = time.perf_counter()
        try:
            if quiz_session.knowledge_mode == KnowledgeMode.DOCUMENT and quiz_session.document_id:
                return self._retrieve_document_context(
                    quiz_session.user_id,
                    quiz_session.document_id,
                    query,
                    limit=limit,
                )
            return self._retrieve_prompt_context(quiz_session)
        finally:
            retrieval_latency_seconds.observe(time.perf_counter() - started)

    def _retrieve_document_context(
        self,
        user_id: UUID,
        document_id: UUID,
        query: str,
        limit: int = 4,
    ) -> str:
        query_embedding = self.embedding_service.embed_query(query)
        rows = self.session.exec(
            select(EmbeddingChunk).where(
                EmbeddingChunk.user_id == user_id,
                EmbeddingChunk.document_id == document_id,
            )
        ).all()
        ranked = sorted(
            rows,
            key=lambda row: cosine_similarity(query_embedding, row.embedding),
            reverse=True,
        )[:limit]
        lines = [
            f"[doc:{document_id} chunk:{item.chunk_index}] {item.content[:400]}"
            for item in ranked
        ]
        return "\n".join(lines)

    def _retrieve_prompt_context(self, quiz_session: QuizSession) -> str:
        if quiz_session.seed_context:
            return quiz_session.seed_context
        topic = quiz_session.topic or "general topic"
        seed_context = self.llm_service.build_seed_context(topic)
        quiz_session.seed_context = seed_context
        self.session.add(quiz_session)
        self.session.commit()
        self.session.refresh(quiz_session)
        return seed_context
