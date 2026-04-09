# ---------- build stage ----------
FROM python:3.13-slim AS builder

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Install dependencies first (layer caching)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

# Copy the rest of the source
COPY . .
RUN uv sync --frozen --no-dev

# ---------- runtime stage ----------
FROM python:3.13-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app
COPY --from=builder /app /app

# Render may override the Docker CMD and invoke /app/.venv/bin/uvicorn directly.
# This shim keeps that path valid and routes execution through uv.
RUN mkdir -p /app/.venv/bin \
    && printf '#!/bin/sh\nexec uv run --frozen uvicorn "$@"\n' > /app/.venv/bin/uvicorn \
    && chmod +x /app/.venv/bin/uvicorn

ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uv", "run", "--frozen", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
