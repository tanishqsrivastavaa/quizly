from __future__ import annotations

from fastapi.testclient import TestClient


def test_register_login_refresh_me(client: TestClient):
    register = client.post("/v1/auth/register", json={"email": "auth@example.com", "password": "password123"})
    assert register.status_code == 201
    assert register.json()["email"] == "auth@example.com"

    login = client.post("/v1/auth/login", json={"email": "auth@example.com", "password": "password123"})
    assert login.status_code == 200
    tokens = login.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens

    me = client.get("/v1/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert me.status_code == 200
    assert me.json()["email"] == "auth@example.com"

    refresh = client.post("/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert refresh.status_code == 200
    assert "access_token" in refresh.json()
