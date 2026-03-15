from __future__ import annotations

import hashlib
from typing import Iterable

from openai import OpenAI

from backend.app.core.config import get_settings


class EmbeddingService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.client = None if self.settings.mock_providers else OpenAI(api_key=self.settings.openai_api_key)

    def embed_texts(self, texts: Iterable[str]) -> list[list[float]]:
        payload = list(texts)
        if not payload:
            return []
        if self.settings.mock_providers:
            return [self._mock_embedding(text) for text in payload]

        response = self.client.embeddings.create(
            model=self.settings.embedding_model,
            input=payload,
        )
        return [item.embedding for item in response.data]

    def embed_query(self, query: str) -> list[float]:
        return self.embed_texts([query])[0]

    def _mock_embedding(self, text: str) -> list[float]:
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        out: list[float] = []
        while len(out) < self.settings.embedding_dimensions:
            for byte in digest:
                out.append((byte / 255.0) * 2.0 - 1.0)
                if len(out) >= self.settings.embedding_dimensions:
                    break
            digest = hashlib.sha256(digest).digest()
        return out
