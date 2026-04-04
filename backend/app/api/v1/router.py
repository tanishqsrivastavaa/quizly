from __future__ import annotations

from fastapi import APIRouter

from backend.app.api.v1.health import router as health_router
from backend.app.modules.auth.router import router as auth_router
from backend.app.modules.documents.router import router as documents_router
from backend.app.modules.quiz.router import router as quiz_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(documents_router, prefix="/documents", tags=["documents"])
api_router.include_router(quiz_router, prefix="/quiz", tags=["quiz"])
