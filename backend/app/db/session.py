from __future__ import annotations

from sqlmodel import Session, SQLModel, create_engine

from backend.app.core.config import get_settings


def _create_engine():
    settings = get_settings()
    connect_args = {"check_same_thread": False} if settings.database_uri.startswith("sqlite") else {}
    return create_engine(settings.database_uri, pool_pre_ping=True, connect_args=connect_args)


engine = _create_engine()


def get_session():
    with Session(engine) as session:
        yield session


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
