from __future__ import annotations

import base64
import hashlib
import hmac
import os
from datetime import UTC, datetime, timedelta
from typing import Any

from jose import JWTError, jwt
from pydantic import BaseModel

from backend.app.core.config import get_settings

PBKDF2_ALG = "sha256"
PBKDF2_ITERATIONS = 390_000
SALT_BYTES = 16


class TokenPayload(BaseModel):
    sub: str
    typ: str
    exp: int


def hash_password(password: str) -> str:
    salt = os.urandom(SALT_BYTES)
    digest = hashlib.pbkdf2_hmac(PBKDF2_ALG, password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return (
        f"pbkdf2_{PBKDF2_ALG}${PBKDF2_ITERATIONS}$"
        f"{base64.urlsafe_b64encode(salt).decode()}$"
        f"{base64.urlsafe_b64encode(digest).decode()}"
    )


def verify_password(password: str, password_hash: str) -> bool:
    try:
        scheme, iterations, salt_b64, digest_b64 = password_hash.split("$", 3)
    except ValueError:
        return False
    if not scheme.startswith("pbkdf2_"):
        return False
    salt = base64.urlsafe_b64decode(salt_b64.encode("utf-8"))
    expected = base64.urlsafe_b64decode(digest_b64.encode("utf-8"))
    actual = hashlib.pbkdf2_hmac(PBKDF2_ALG, password.encode("utf-8"), salt, int(iterations))
    return hmac.compare_digest(actual, expected)


def _create_token(subject: str, token_type: str, expires_delta: timedelta) -> str:
    settings = get_settings()
    expires_at = datetime.now(UTC) + expires_delta
    payload: dict[str, Any] = {
        "sub": subject,
        "typ": token_type,
        "exp": int(expires_at.timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(subject: str) -> str:
    settings = get_settings()
    return _create_token(subject, "access", timedelta(minutes=settings.access_token_expire_minutes))


def create_refresh_token(subject: str) -> str:
    settings = get_settings()
    return _create_token(subject, "refresh", timedelta(minutes=settings.refresh_token_expire_minutes))


def decode_token(token: str) -> TokenPayload:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return TokenPayload(**payload)
    except JWTError as exc:
        raise ValueError("Invalid or expired token.") from exc
