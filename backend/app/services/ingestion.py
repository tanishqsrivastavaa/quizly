from __future__ import annotations

import logging
import re
import time
from pathlib import Path
from typing import Iterable
from uuid import UUID

import fitz
from sqlmodel import Session, delete, select

from backend.app.core.config import get_settings
from backend.app.db.models import Document, DocumentStatus, EmbeddingChunk
from backend.app.db.session import engine
from backend.app.services.embedding import EmbeddingService
from backend.app.services.metrics import ingestion_failures_total, ingestion_latency_seconds

logger = logging.getLogger(__name__)


def normalize_text(text: str) -> str:
    collapsed = re.sub(r"\s+", " ", text).strip()
    return collapsed


def semantic_chunk_text(text: str, max_chars: int = 1200, overlap: int = 180) -> list[str]:
    if not text:
        return []
    chunks: list[str] = []
    cursor = 0
    while cursor < len(text):
        end = min(len(text), cursor + max_chars)
        chunk = text[cursor:end]
        if end < len(text):
            split_at = max(chunk.rfind(". "), chunk.rfind("\n"))
            if split_at > max_chars // 2:
                end = cursor + split_at + 1
                chunk = text[cursor:end]
        chunks.append(chunk.strip())
        if end >= len(text):
            cursor = end
        else:
            cursor = max(cursor + 1, end - overlap)
    return [item for item in chunks if item]


class IngestionService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.settings = get_settings()
        self.embedding_service = EmbeddingService()

    def ingest_document(self, document: Document) -> None:
        started = time.perf_counter()
        try:
            document.status = DocumentStatus.PROCESSING
            document.failure_reason = None
            self.session.add(document)
            self.session.commit()
            self.session.refresh(document)
            logger.info("ingestion_status_changed", extra={"event": "processing", "document_id": str(document.id)})

            last_error = ""
            for attempt in range(1, self.settings.ingestion_retry_attempts + 1):
                try:
                    chunks = self._parse_chunks(Path(document.storage_path))
                    embeddings = self.embedding_service.embed_texts(chunks)

                    self.session.exec(delete(EmbeddingChunk).where(EmbeddingChunk.document_id == document.id))
                    for index, (chunk, vector) in enumerate(zip(chunks, embeddings, strict=True)):
                        self.session.add(
                            EmbeddingChunk(
                                user_id=document.user_id,
                                document_id=document.id,
                                chunk_index=index,
                                content=chunk,
                                embedding=vector,
                            )
                        )

                    document.status = DocumentStatus.READY
                    document.retry_count = attempt - 1
                    document.failure_reason = None
                    self.session.add(document)
                    self.session.commit()
                    logger.info("ingestion_status_changed", extra={"event": "ready", "document_id": str(document.id)})
                    return
                except Exception as exc:  # noqa: BLE001
                    last_error = str(exc)
                    document.retry_count = attempt
                    document.status = DocumentStatus.PROCESSING
                    document.failure_reason = last_error
                    self.session.add(document)
                    self.session.commit()
                    logger.warning(
                        "ingestion_attempt_failed",
                        extra={
                            "document_id": str(document.id),
                            "attempt": attempt,
                            "error": last_error,
                        },
                    )

            document.status = DocumentStatus.FAILED
            document.failure_reason = last_error or "Unknown ingestion failure."
            self.session.add(document)
            self.session.commit()
            ingestion_failures_total.inc()
            logger.error("ingestion_status_changed", extra={"event": "failed", "document_id": str(document.id)})
            raise RuntimeError(document.failure_reason)
        finally:
            ingestion_latency_seconds.observe(time.perf_counter() - started)

    def _parse_chunks(self, path: Path) -> list[str]:
        text = self._extract_pdf_text(path)
        normalized = normalize_text(text)
        chunks = semantic_chunk_text(normalized)
        if not chunks:
            raise ValueError("No textual content was extracted from the document.")
        return chunks

    @staticmethod
    def _extract_pdf_text(path: Path) -> str:
        if path.suffix.lower() != ".pdf":
            raise ValueError("Only PDF ingestion is supported in v1.")

        with fitz.open(path) as document:
            pages: Iterable[str] = (page.get_text("text") for page in document)
            return "\n".join(pages)


def run_ingestion_job(document_id: UUID, user_id: UUID) -> None:
    with Session(engine) as session:
        document = session.exec(
            select(Document).where(Document.id == document_id, Document.user_id == user_id)
        ).first()
        if document is None:
            raise ValueError("Document not found for ingestion.")
        IngestionService(session).ingest_document(document)
