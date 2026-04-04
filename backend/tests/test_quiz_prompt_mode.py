from __future__ import annotations

from fastapi.testclient import TestClient


def test_prompt_mode_quiz_flow(client: TestClient, auth_headers: dict[str, str]):
    create = client.post(
        "/v1/quiz/sessions",
        json={"knowledge_mode": "prompt", "topic": "Linear Algebra"},
        headers=auth_headers,
    )
    assert create.status_code == 201
    payload = create.json()
    session_id = payload["session"]["id"]
    assert payload["first_question"]

    answer_payload = {
        "answer": "definitions core principles common mistakes practical examples linear algebra"
    }
    for _ in range(4):
        turn = client.post(
            f"/v1/quiz/sessions/{session_id}/answer",
            json=answer_payload,
            headers=auth_headers,
        )
        assert turn.status_code == 200
        assert 0.0 <= turn.json()["score"] <= 1.0
        assert turn.json()["next_question"]

    transcript = client.get(f"/v1/quiz/sessions/{session_id}/transcript", headers=auth_headers)
    assert transcript.status_code == 200
    assert len(transcript.json()) == 4
