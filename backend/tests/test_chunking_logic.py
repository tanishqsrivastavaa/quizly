from __future__ import annotations

from backend.app.services.ingestion import semantic_chunk_text


def test_semantic_chunk_text_splits_large_text():
    text = " ".join(["concept"] * 2000)
    chunks = semantic_chunk_text(text, max_chars=200, overlap=20)
    assert len(chunks) > 5
    assert all(chunk for chunk in chunks)
    assert all(len(chunk) <= 220 for chunk in chunks)
