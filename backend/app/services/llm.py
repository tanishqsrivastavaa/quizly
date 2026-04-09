from __future__ import annotations

import hashlib
import json
import re
from typing import Any

from groq import Groq

from backend.app.core.config import get_settings


class LLMService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.client = (
            None
            if self.settings.mock_providers
            else Groq(api_key=self.settings.groq_api_key)
        )

    def generate_question(
        self,
        topic: str,
        context: str,
        difficulty: str,
        asked_questions: list[str] | None = None,
        recent_feedback: list[dict[str, str | float]] | None = None,
    ) -> str:
        asked_questions = asked_questions or []
        recent_feedback = recent_feedback or []
        if self.settings.mock_providers:
            recent_tail = ""
            if asked_questions:
                recent_tail = f" (new angle, avoid: {asked_questions[-1][:40]})"
            return (
                f"[{difficulty.title()}] Explain {topic} using this context:"
                f" {context[:120]}...{recent_tail}"
            )

        history_lines = "\n".join(f"- {question}" for question in asked_questions[-6:])
        feedback_lines = "\n".join(
            f"- score={item['score']}: {item['question']}"
            for item in recent_feedback[-4:]
            if item.get("question")
        )

        prompt = (
            "You are a Socratic quiz tutor.\n"
            "Generate exactly one short question.\n"
            "Do not repeat or paraphrase prior questions.\n"
            "Ask a different concept angle than the previous turn.\n"
            f"Topic: {topic}\n"
            f"Difficulty: {difficulty}\n"
            f"Previous questions to avoid:\n{history_lines or '- none'}\n"
            f"Recent score/question history:\n{feedback_lines or '- none'}\n"
            f"Context:\n{context[:4000]}"
        )
        response = self.client.chat.completions.create(
            model=self.settings.groq_model,
            temperature=0.2,
            max_tokens=180,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content.strip()

    def evaluate_answer(
        self, question: str, answer: str, context: str
    ) -> dict[str, Any]:
        if self.settings.mock_providers:
            return self._heuristic_evaluation(question, answer, context)

        prompt = (
            "You are grading an answer with strict schema output.\n"
            "Return JSON with keys: score (0.0-1.0), rationale, hint.\n"
            "Use score bands: <0.5 weak, 0.5-0.8 medium, >0.8 strong.\n"
            f"Question: {question}\n"
            f"Answer: {answer}\n"
            f"Context: {context[:5000]}"
        )
        response = self.client.chat.completions.create(
            model=self.settings.groq_model,
            temperature=0,
            max_tokens=250,
            messages=[{"role": "user", "content": prompt}],
        )
        content = response.choices[0].message.content
        return self._parse_json_response(content)

    def build_seed_context(self, topic: str) -> str:
        if self.settings.mock_providers:
            return f"Topic notes for {topic}: definitions, core principles, common mistakes, and practical examples."

        prompt = (
            "Create deterministic synthetic study notes.\n"
            "Return concise bullet points covering fundamentals and 3 subtopics.\n"
            f"Topic: {topic}"
        )
        response = self.client.chat.completions.create(
            model=self.settings.groq_model,
            temperature=0,
            max_tokens=350,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content.strip()

    def _parse_json_response(self, content: str) -> dict[str, Any]:
        text = content.strip()
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\n?", "", text)
            text = re.sub(r"\n?```$", "", text)
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            return self._heuristic_evaluation("", text, text)

        score = float(parsed.get("score", 0.0))
        score = min(1.0, max(0.0, score))
        rationale = str(parsed.get("rationale", "No rationale provided."))
        hint = parsed.get("hint")
        return {"score": score, "rationale": rationale, "hint": hint}

    def _heuristic_evaluation(
        self, question: str, answer: str, context: str
    ) -> dict[str, Any]:
        del question
        answer_terms = {term for term in re.findall(r"[a-zA-Z]{3,}", answer.lower())}
        context_terms = {term for term in re.findall(r"[a-zA-Z]{3,}", context.lower())}
        if not answer_terms:
            score = 0.0
        else:
            overlap = len(answer_terms.intersection(context_terms))
            score = min(1.0, overlap / max(1, min(10, len(answer_terms))))

        hashed_hint = hashlib.sha256(answer.encode("utf-8")).hexdigest()[:8]
        hint = (
            f"Focus on key concepts and examples (ref:{hashed_hint})."
            if score < 0.8
            else None
        )
        rationale = "Evaluation based on concept overlap with retrieved context."
        return {"score": round(score, 2), "rationale": rationale, "hint": hint}
