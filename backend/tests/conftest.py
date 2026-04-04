from __future__ import annotations

import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel

TEST_DB_PATH = Path("backend/tests/test_quizly.db")
os.environ["DATABASE_URI"] = f"sqlite:///{TEST_DB_PATH}"
os.environ["GROQ_API_KEY"] = "test-groq-key"
os.environ["OPENAI_API_KEY"] = "test-openai-key"
os.environ["MOCK_PROVIDERS"] = "true"
os.environ["AUTO_CREATE_TABLES"] = "true"
os.environ["JWT_SECRET_KEY"] = "test-secret"
os.environ["MAX_REQUESTS_PER_MINUTE"] = "1000"

from backend.app.core.config import get_settings  # noqa: E402

get_settings.cache_clear()

from backend.app.db.session import engine  # noqa: E402
from backend.app.main import create_app  # noqa: E402


@pytest.fixture(autouse=True)
def reset_database():
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    yield
    SQLModel.metadata.drop_all(engine)


@pytest.fixture()
def client() -> TestClient:
    app = create_app()
    return TestClient(app)


@pytest.fixture()
def auth_headers(client: TestClient) -> dict[str, str]:
    client.post("/v1/auth/register", json={"email": "user@example.com", "password": "password123"})
    login = client.post("/v1/auth/login", json={"email": "user@example.com", "password": "password123"})
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
