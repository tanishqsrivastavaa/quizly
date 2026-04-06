from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from backend.app.db.models import KnowledgeMode, SessionStatus


class QuizSessionCreateRequest(BaseModel):
    knowledge_mode: KnowledgeMode
    topic: str | None = None
    document_id: UUID | None = None

    @model_validator(mode="after")
    def validate_mode(self):
        if self.knowledge_mode == KnowledgeMode.DOCUMENT and self.document_id is None:
            raise ValueError("document_id is required for document mode.")
        if self.knowledge_mode == KnowledgeMode.PROMPT and not self.topic:
            raise ValueError("topic is required for prompt mode.")
        return self


class QuizSessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    knowledge_mode: KnowledgeMode
    document_id: UUID | None
    topic: str | None
    status: SessionStatus
    turns_completed: int
    last_score: float | None
    current_question: str | None
    created_at: datetime
    updated_at: datetime


class QuizSessionCreateResponse(BaseModel):
    session: QuizSessionRead
    first_question: str


class QuizAnswerRequest(BaseModel):
    answer: str = Field(min_length=1, max_length=4000)


class QuizTurnResponse(BaseModel):
    session_id: UUID
    score: float
    rationale: str
    hint: str | None
    next_question: str
    completed: bool
    session_updated: QuizSessionRead


class TranscriptRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    turn_index: int
    question: str
    answer: str
    score: float
    rationale: str
    hint: str | None
    next_question: str
    created_at: datetime
