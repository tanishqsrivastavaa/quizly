from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlmodel import Session, select

from backend.app.agents.quiz_agent import QuizGraphRunner
from backend.app.core.deps import get_current_user
from backend.app.core.security import decode_token
from backend.app.db.models import Document, DocumentStatus, KnowledgeMode, QuizSession, SessionStatus, TranscriptTurn, User
from backend.app.db.session import engine, get_session
from backend.app.schemas.quiz import (
    QuizAnswerRequest,
    QuizSessionCreateRequest,
    QuizSessionCreateResponse,
    QuizSessionRead,
    QuizTurnResponse,
    TranscriptRead,
)

router = APIRouter()


@router.post("/sessions", response_model=QuizSessionCreateResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: QuizSessionCreateRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> QuizSessionCreateResponse:
    document_id: UUID | None = payload.document_id
    if payload.knowledge_mode == KnowledgeMode.DOCUMENT:
        document = session.exec(
            select(Document).where(Document.id == document_id, Document.user_id == current_user.id)
        ).first()
        if document is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
        if document.status != DocumentStatus.READY:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Document ingestion not completed.")

    quiz_session = QuizSession(
        user_id=current_user.id,
        document_id=document_id,
        knowledge_mode=payload.knowledge_mode,
        topic=payload.topic,
        status=SessionStatus.ACTIVE,
    )
    session.add(quiz_session)
    session.commit()
    session.refresh(quiz_session)

    first_question = QuizGraphRunner(session).initial_question(quiz_session)
    return QuizSessionCreateResponse(
        session=QuizSessionRead.model_validate(quiz_session),
        first_question=first_question,
    )


@router.post("/sessions/{session_id}/answer", response_model=QuizTurnResponse)
def answer_session(
    session_id: UUID,
    payload: QuizAnswerRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> QuizTurnResponse:
    quiz_session = session.exec(
        select(QuizSession).where(QuizSession.id == session_id, QuizSession.user_id == current_user.id)
    ).first()
    if quiz_session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    if quiz_session.status == SessionStatus.COMPLETED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Session already completed.")

    turn = QuizGraphRunner(session).run_turn(quiz_session, payload.answer)
    return QuizTurnResponse(**turn)


@router.get("/sessions/{session_id}", response_model=QuizSessionRead)
def get_quiz_session(
    session_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> QuizSessionRead:
    quiz_session = session.exec(
        select(QuizSession).where(QuizSession.id == session_id, QuizSession.user_id == current_user.id)
    ).first()
    if quiz_session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    return QuizSessionRead.model_validate(quiz_session)


@router.get("/sessions/{session_id}/transcript", response_model=list[TranscriptRead])
def get_transcript(
    session_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[TranscriptRead]:
    quiz_session = session.exec(
        select(QuizSession.id).where(QuizSession.id == session_id, QuizSession.user_id == current_user.id)
    ).first()
    if quiz_session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    turns = session.exec(
        select(TranscriptTurn)
        .where(TranscriptTurn.session_id == session_id, TranscriptTurn.user_id == current_user.id)
        .order_by(TranscriptTurn.turn_index)
    ).all()
    return [TranscriptRead.model_validate(turn) for turn in turns]


@router.websocket("/sessions/{session_id}/ws")
async def session_ws(websocket: WebSocket, session_id: UUID):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401)
        return
    try:
        payload = decode_token(token)
        if payload.typ != "access":
            raise ValueError("Invalid token type.")
        user_id = UUID(payload.sub)
    except Exception:  # noqa: BLE001
        await websocket.close(code=4401)
        return

    await websocket.accept()
    try:
        while True:
            message = await websocket.receive_json()
            answer = str(message.get("answer", "")).strip()
            if not answer:
                await websocket.send_json({"error": "answer is required"})
                continue

            with Session(engine) as session:
                quiz_session = session.exec(
                    select(QuizSession).where(QuizSession.id == session_id, QuizSession.user_id == user_id)
                ).first()
                if quiz_session is None:
                    await websocket.send_json({"error": "session not found"})
                    continue
                result = QuizGraphRunner(session).run_turn(quiz_session, answer)
                await websocket.send_json(
                    {
                        "score": result["score"],
                        "rationale": result["rationale"],
                        "hint": result["hint"],
                        "next_question": result["next_question"],
                        "completed": result["completed"],
                    }
                )
    except WebSocketDisconnect:
        return
