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

WORKDIR /app
COPY --from=builder /app/.venv /app/.venv
COPY . /app

# Render may override the Docker CMD and invoke /app/.venv/bin/uvicorn directly.
# Keep that path valid without invoking uv at runtime.
RUN mkdir -p /app/.venv/bin \
    && ln -sfn /app /app/backend \
    && printf '#!/bin/sh\nexec /app/.venv/bin/python -m uvicorn "$@"\n' > /app/.venv/bin/uvicorn \
    && chmod +x /app/.venv/bin/uvicorn

ENV PYTHONUNBUFFERED=1
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

CMD ["/app/.venv/bin/python", "-m", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
