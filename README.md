# Quizly Backend (FastAPI + SQLModel + LangGraph)

Production-ready backend scaffold for adaptive Socratic quizzes with two knowledge modes:
- Prompt-only topic sessions.
- Document-backed sessions (PDF ingestion first).

## Stack
- FastAPI (`/v1` REST + WebSocket).
- SQLModel ORM with Alembic migrations.
- PostgreSQL/NeonDB (`DATABASE_URI`) and pgvector support.
- LangGraph quiz orchestration.
- Groq generation (`llama-3.3-70b-versatile`).
- OpenAI embeddings (`text-embedding-3-small`).
- `uv` for dependency and command execution.

## Required environment variables
- `DATABASE_URI`
- `GROQ_API_KEY`
- `OPENAI_API_KEY`

See `.env.example` for additional optional settings.

## Quick start
```bash
uv sync
uv run alembic -c backend/alembic.ini upgrade head
uv run uvicorn backend.app.main:app --reload
```

## API surface
- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `POST /v1/auth/refresh`
- `GET /v1/auth/me`
- `POST /v1/documents/upload`
- `GET /v1/documents/{id}`
- `POST /v1/quiz/sessions`
- `POST /v1/quiz/sessions/{id}/answer`
- `GET /v1/quiz/sessions/{id}`
- `GET /v1/quiz/sessions/{id}/transcript`
- `WS /v1/quiz/sessions/{id}/ws?token=<access_token>`
