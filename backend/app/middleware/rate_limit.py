from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi import status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from backend.app.core.config import get_settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._window_seconds = 60

    async def dispatch(self, request, call_next):
        settings = get_settings()
        client = request.client.host if request.client else "unknown"
        now = time.time()
        queue = self._events[client]

        while queue and now - queue[0] > self._window_seconds:
            queue.popleft()

        if len(queue) >= settings.max_requests_per_minute:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Rate limit exceeded. Please retry later."},
            )

        queue.append(now)
        return await call_next(request)
