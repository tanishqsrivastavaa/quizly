# Quizly (Frontend + Backend)

This repository contains:
- `frontend`: React + TypeScript + Vite app
- `backend`: FastAPI + SQLModel + Alembic API

## Prerequisites

- Node.js 20+ and npm
- Python 3.13
- `uv` (Python package manager)

Install `uv` if you do not have it:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

## 1) Configure environment variables

Create a root `.env` file at `./.env` with at least:

```env
DATABASE_URI=postgresql+psycopg://USER:PASSWORD@HOST:5432/DB_NAME
GROQ_API_KEY=your_groq_api_key
OPENAI_API_KEY=your_openai_api_key
```

Create/update frontend env at `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

## 2) Install dependencies

Backend dependencies:

```bash
uv sync --project backend
```

Frontend dependencies:

```bash
npm install --prefix frontend
```

## 3) Run database migrations

From the repository root:

```bash
uv run --project backend alembic -c backend/alembic.ini upgrade head
```

## 4) Start backend

From the repository root:

```bash
uv run --project backend uvicorn backend.app.main:app --reload
```

Backend will run at `http://localhost:8000`.

## 5) Start frontend

In a new terminal:

```bash
npm run dev --prefix frontend
```

Frontend will run at `http://localhost:5173`.

## Quick health checks

- Backend health: `http://localhost:8000/v1/health`
- Backend ready check: `http://localhost:8000/v1/ready`
- Frontend: `http://localhost:5173`

## Useful commands

```bash
# Backend tests
uv run --project backend pytest

# Frontend build
npm run build --prefix frontend
```
