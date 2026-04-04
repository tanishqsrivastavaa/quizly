from backend.app.modules.auth import router as auth_router
from backend.app.modules.documents import router as documents_router
from backend.app.modules.quiz import router as quiz_router

__all__ = ["auth_router", "documents_router", "quiz_router"]
