from __future__ import annotations

import logging
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from sqlmodel import Session, select

from backend.app.core.config import get_settings
from backend.app.core.deps import get_current_user
from backend.app.db.models import Document, User
from backend.app.db.session import get_session
from backend.app.schemas.documents import DocumentRead, DocumentUploadResponse
from backend.app.services.ingestion import run_ingestion_job

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DocumentUploadResponse:
    settings = get_settings()
    filename = file.filename or "upload.pdf"
    if (file.content_type or "").lower() not in {"application/pdf"} and not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF uploads are supported.")

    content = await file.read()
    max_size = settings.max_upload_size_mb * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large.")

    document = Document(
        user_id=current_user.id,
        filename=filename,
        content_type=file.content_type or "application/pdf",
        storage_path="",
    )
    session.add(document)
    session.commit()
    session.refresh(document)

    user_dir = settings.storage_dir / str(current_user.id)
    user_dir.mkdir(parents=True, exist_ok=True)
    extension = Path(filename).suffix or ".pdf"
    disk_path = user_dir / f"{document.id}{extension}"
    disk_path.write_bytes(content)

    document.storage_path = str(disk_path)
    session.add(document)
    session.commit()
    session.refresh(document)

    background_tasks.add_task(run_ingestion_job, document.id, current_user.id)
    logger.info(
        "ingestion_queued",
        extra={"event": "queued", "document_id": str(document.id), "user_id": str(current_user.id)},
    )
    return DocumentUploadResponse(id=document.id, status=document.status)


@router.get("/{document_id}", response_model=DocumentRead)
def get_document(
    document_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> DocumentRead:
    document = session.exec(
        select(Document).where(Document.id == document_id, Document.user_id == current_user.id)
    ).first()
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    return DocumentRead.model_validate(document)
