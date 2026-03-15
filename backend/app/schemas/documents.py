from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from backend.app.db.models import DocumentStatus


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    filename: str
    content_type: str
    status: DocumentStatus
    retry_count: int
    failure_reason: str | None
    created_at: datetime
    updated_at: datetime


class DocumentUploadResponse(BaseModel):
    id: UUID
    status: DocumentStatus
