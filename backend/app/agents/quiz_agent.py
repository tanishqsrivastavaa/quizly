from __future__ import annotations

import re
from typing import TypedDict
from uuid import UUID

from langgraph.graph import END, StateGraph
from sqlmodel import Session, select

from backend.app.db.models import QuizSession, SessionStatus, TranscriptTurn
from backend.app.services.llm import LLMService
from backend.app.services.metrics import (
    quiz_score_distribution,
    session_completion_total,
)
from backend.app.services.retrieval import RetrieverService


class QuizState(TypedDict, total=False):
    session_id: str
    question: str
    answer: str
    context: str
    score: float
    rationale: str
    hint: str | None
    next_question: str
    completed: bool
    difficulty: str


class QuizGraphRunner:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.retriever = RetrieverService(session)
        self.llm = LLMService()
        self.graph = self._build_graph()

    def _build_graph(self):
        workflow = StateGraph(QuizState)
        workflow.add_node("retrieve_context", self.retrieve_context)
        workflow.add_node("evaluate_answer", self.evaluate_answer)
        workflow.add_node("adaptive_decision", self.adaptive_decision)
        workflow.add_node("generate_question", self.generate_question)
        workflow.add_node("persist_turn", self.persist_turn)
        workflow.add_node("mastery_check", self.mastery_check)

        workflow.set_entry_point("retrieve_context")
        workflow.add_edge("retrieve_context", "evaluate_answer")
        workflow.add_edge("evaluate_answer", "adaptive_decision")
        workflow.add_edge("adaptive_decision", "generate_question")
        workflow.add_edge("generate_question", "persist_turn")
        workflow.add_edge("persist_turn", "mastery_check")
        workflow.add_edge("mastery_check", END)
        return workflow.compile()

    def initial_question(self, quiz_session: QuizSession) -> str:
        context = self.retriever.retrieve_for_session(
            quiz_session, quiz_session.topic or "overview"
        )
        question = self._generate_non_repeating_question(
            quiz_session=quiz_session,
            context=context,
            difficulty="medium",
        )
        quiz_session.current_question = question
        self.session.add(quiz_session)
        self.session.commit()
        self.session.refresh(quiz_session)
        return question

    def run_turn(self, quiz_session: QuizSession, answer: str) -> dict:
        state: QuizState = {
            "session_id": str(quiz_session.id),
            "question": quiz_session.current_question
            or "Explain the topic fundamentals.",
            "answer": answer,
            "difficulty": "medium",
        }
        result = self.graph.invoke(state)

        score = float(result["score"])
        quiz_session.last_score = score
        quiz_session.current_question = result["next_question"]
        quiz_session.turns_completed += 1
        quiz_session.mastery_map = self._updated_mastery(
            quiz_session.mastery_map, score
        )
        quiz_session.status = (
            SessionStatus.COMPLETED if result["completed"] else SessionStatus.ACTIVE
        )
        self.session.add(quiz_session)
        self.session.commit()
        self.session.refresh(quiz_session)

        quiz_score_distribution.observe(score)
        if quiz_session.status == SessionStatus.COMPLETED:
            session_completion_total.inc()

        from backend.app.schemas.quiz import QuizSessionRead

        return {
            "session_id": quiz_session.id,
            "score": score,
            "rationale": result["rationale"],
            "hint": result.get("hint"),
            "next_question": result["next_question"],
            "completed": result["completed"],
            "session_updated": QuizSessionRead.model_validate(quiz_session),
        }

    def retrieve_context(self, state: QuizState) -> QuizState:
        quiz_session = self._load_session(state["session_id"])
        query = state.get("question") or quiz_session.topic or ""
        context = self.retriever.retrieve_for_session(quiz_session, query)
        return {"context": context}

    def evaluate_answer(self, state: QuizState) -> QuizState:
        evaluated = self.llm.evaluate_answer(
            question=state["question"],
            answer=state["answer"],
            context=state["context"],
        )
        return {
            "score": evaluated["score"],
            "rationale": evaluated["rationale"],
            "hint": evaluated.get("hint"),
        }

    def adaptive_decision(self, state: QuizState) -> QuizState:
        score = state["score"]
        if score < 0.5:
            hint = (
                state.get("hint")
                or "Break the concept into smaller parts and define key terms."
            )
            return {"difficulty": "easy", "hint": hint}
        if score <= 0.8:
            return {"difficulty": "medium"}
        return {"difficulty": "hard"}

    def generate_question(self, state: QuizState) -> QuizState:
        quiz_session = self._load_session(state["session_id"])
        next_question = self._generate_non_repeating_question(
            quiz_session=quiz_session,
            context=state["context"],
            difficulty=state.get("difficulty", "medium"),
        )
        return {"next_question": next_question}

    def persist_turn(self, state: QuizState) -> QuizState:
        quiz_session = self._load_session(state["session_id"])
        turn = TranscriptTurn(
            session_id=quiz_session.id,
            user_id=quiz_session.user_id,
            turn_index=quiz_session.turns_completed + 1,
            question=state["question"],
            answer=state["answer"],
            score=state["score"],
            rationale=state["rationale"],
            hint=state.get("hint"),
            next_question=state["next_question"],
        )
        self.session.add(turn)
        self.session.commit()
        return {}

    def mastery_check(self, state: QuizState) -> QuizState:
        quiz_session = self._load_session(state["session_id"])
        mastery_values = list((quiz_session.mastery_map or {}).values())
        enough_turns = quiz_session.turns_completed + 1 >= 4
        mastery_threshold = (
            mastery_values and (sum(mastery_values) / len(mastery_values)) >= 0.8
        )
        return {"completed": bool(enough_turns and mastery_threshold)}

    def _load_session(self, session_id: str) -> QuizSession:
        quiz_session = self.session.get(QuizSession, UUID(session_id))
        if quiz_session is None:
            raise ValueError("Quiz session not found.")
        return quiz_session

    @staticmethod
    def _updated_mastery(
        mastery_map: dict[str, float], score: float
    ) -> dict[str, float]:
        current = dict(mastery_map or {})
        key = "overall"
        previous = current.get(key, 0.0)
        current[key] = round((previous + score) / 2 if previous else score, 2)
        return current

    def _generate_non_repeating_question(
        self, quiz_session: QuizSession, context: str, difficulty: str
    ) -> str:
        topic = quiz_session.topic or "the document topic"
        previous_questions = self._previous_questions(quiz_session)
        recent_feedback = self._recent_feedback(quiz_session)

        candidate = ""
        for _ in range(4):
            candidate = self.llm.generate_question(
                topic=topic,
                context=context,
                difficulty=difficulty,
                asked_questions=previous_questions,
                recent_feedback=recent_feedback,
            )
            if not self._is_repeated_question(candidate, previous_questions):
                return candidate
        return candidate

    def _previous_questions(self, quiz_session: QuizSession) -> list[str]:
        turns = self.session.exec(
            select(TranscriptTurn)
            .where(TranscriptTurn.session_id == quiz_session.id)
            .order_by(TranscriptTurn.turn_index)
        ).all()
        questions = [turn.question for turn in turns if turn.question]
        if quiz_session.current_question:
            questions.append(quiz_session.current_question)
        return questions

    def _recent_feedback(
        self, quiz_session: QuizSession
    ) -> list[dict[str, str | float]]:
        turns = self.session.exec(
            select(TranscriptTurn)
            .where(TranscriptTurn.session_id == quiz_session.id)
            .order_by(TranscriptTurn.turn_index.desc())
            .limit(4)
        ).all()
        turns.reverse()
        return [{"question": turn.question, "score": turn.score} for turn in turns]

    @staticmethod
    def _is_repeated_question(candidate: str, previous_questions: list[str]) -> bool:
        normalized_candidate = QuizGraphRunner._normalize_question(candidate)
        if not normalized_candidate:
            return True
        for previous in previous_questions[-8:]:
            normalized_previous = QuizGraphRunner._normalize_question(previous)
            if normalized_candidate == normalized_previous:
                return True
            overlap = set(normalized_candidate.split()).intersection(
                normalized_previous.split()
            )
            similarity = len(overlap) / max(
                1,
                len(
                    set(normalized_candidate.split()).union(normalized_previous.split())
                ),
            )
            if similarity >= 0.82:
                return True
        return False

    @staticmethod
    def _normalize_question(value: str) -> str:
        cleaned = re.sub(r"[^a-z0-9\s]", "", value.lower())
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        stop_words = {
            "what",
            "which",
            "how",
            "why",
            "is",
            "the",
            "a",
            "an",
            "in",
            "of",
            "to",
            "and",
            "does",
            "do",
            "used",
            "term",
            "describe",
        }
        tokens = [token for token in cleaned.split() if token not in stop_words]
        return " ".join(tokens)
