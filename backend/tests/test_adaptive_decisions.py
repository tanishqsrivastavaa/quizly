from __future__ import annotations

from sqlmodel import Session

from backend.app.agents.quiz_agent import QuizGraphRunner
from backend.app.db.models import KnowledgeMode, QuizSession, TranscriptTurn, User
from backend.app.db.session import engine


def test_adaptive_decision_score_bands():
    with Session(engine) as session:
        runner = QuizGraphRunner(session)
        low = runner.adaptive_decision({"score": 0.3})
        medium = runner.adaptive_decision({"score": 0.6})
        high = runner.adaptive_decision({"score": 0.9})

    assert low["difficulty"] == "easy"
    assert medium["difficulty"] == "medium"
    assert high["difficulty"] == "hard"


def test_repeated_question_detection_uses_normalized_similarity():
    candidate = "What term describes the exiled characters in Elden Ring?"
    previous = [
        "What is the term used to describe the exiled characters players control in Elden Ring?"
    ]
    assert QuizGraphRunner._is_repeated_question(candidate, previous)


def test_generation_retries_until_non_repeating_question(monkeypatch):
    with Session(engine) as session:
        user = User(email="repeat-check@example.com", password_hash="hash")
        session.add(user)
        session.commit()
        session.refresh(user)

        quiz_session = QuizSession(
            user_id=user.id,
            knowledge_mode=KnowledgeMode.PROMPT,
            topic="Elden Ring",
            current_question="What is the term used to describe the exiled characters players control in Elden Ring?",
        )
        session.add(quiz_session)
        session.commit()
        session.refresh(quiz_session)

        turn = TranscriptTurn(
            session_id=quiz_session.id,
            user_id=user.id,
            turn_index=1,
            question=quiz_session.current_question,
            answer="Tarnished",
            score=1.0,
            rationale="Correct",
            next_question="placeholder",
        )
        session.add(turn)
        session.commit()

        responses = iter(
            [
                "What is the term used to describe the exiled characters players control in Elden Ring?",
                "Explain how the Erdtree shapes the Tarnished's path to becoming Elden Lord.",
            ]
        )

        runner = QuizGraphRunner(session)

        def fake_generate_question(**_: object) -> str:
            return next(responses)

        monkeypatch.setattr(runner.llm, "generate_question", fake_generate_question)
        question = runner._generate_non_repeating_question(
            quiz_session=quiz_session,
            context="Lore context",
            difficulty="medium",
        )

    assert (
        question
        == "Explain how the Erdtree shapes the Tarnished's path to becoming Elden Lord."
    )
