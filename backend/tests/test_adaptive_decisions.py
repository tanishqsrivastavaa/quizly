from __future__ import annotations

from sqlmodel import Session

from backend.app.agents.quiz_agent import QuizGraphRunner
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
