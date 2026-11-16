from datetime import datetime, timedelta, timezone
from http.cookies import SimpleCookie

from fastapi.testclient import TestClient
from starlette.responses import Response

from app.main import app
from app.models import UserSession
from app.services.sessions import as_utc, hash_session_secret
import app.services.sessions as session_service

ORIGIN = "http://localhost:5173"


def password_login(client, email="student@example.com", user_agent="Test Browser"):
    return client.post(
        "/api/v1/auth/login",
        headers={"Origin": ORIGIN, "User-Agent": user_agent},
        json={"email": email, "password": "password-123"},
    )


def test_login_issues_persistent_http_only_cookie_and_me_restores_user(api):
    response = password_login(api)

    assert response.status_code == 200
    body = response.json()
    assert body["authenticated"] is True
    assert body["user"]["email"] == "student@example.com"
    assert body["csrf_token"]
    assert "access_token" not in body

    cookies = response.headers.get_list("set-cookie")
    session_cookie = next(value for value in cookies if value.startswith("lt_session="))
    csrf_cookie = next(value for value in cookies if value.startswith("lt_csrf="))
    assert "httponly" in session_cookie.lower()
    assert "samesite=lax" in session_cookie.lower()
    assert "max-age=" in session_cookie.lower()
    parsed_session_cookie = SimpleCookie()
    parsed_session_cookie.load(session_cookie)
    assert parsed_session_cookie["lt_session"]["expires"]
    assert "httponly" not in csrf_cookie.lower()

    with api.app.state.test_session() as db:
        session = db.query(UserSession).one()
        assert session.device_name == "Test Browser"
        assert session.token_hash == hash_session_secret(next(
            value.split(";", 1)[0].split("=", 1)[1]
            for value in cookies
            if value.startswith("lt_session=")
        ))
        assert "lt_session=" not in session.token_hash
        assert session.expires_at <= session.max_expires_at
        assert timedelta(days=29) < session.expires_at - session.created_at < timedelta(days=31)
        assert timedelta(days=89) < session.max_expires_at - session.created_at < timedelta(days=91)

    restored = api.get("/api/v1/auth/me")
    assert restored.status_code == 200
    assert restored.json()["authenticated"] is True
    assert restored.json()["user"]["id"] == body["user"]["id"]
    assert restored.json()["csrf_token"] == body["csrf_token"]


def test_cookie_mutations_require_matching_csrf_and_allowed_origin(api):
    login = password_login(api, email="admin@example.com")
    csrf_token = login.json()["csrf_token"]
    payload = {"announcement_enabled": True, "announcement_message": "Notice"}

    missing = api.patch("/api/v1/settings", json=payload)
    assert missing.status_code == 403

    wrong_origin = api.patch(
        "/api/v1/settings",
        headers={"Origin": "https://attacker.example", "X-CSRF-Token": csrf_token},
        json=payload,
    )
    assert wrong_origin.status_code == 403

    wrong_token = api.patch(
        "/api/v1/settings",
        headers={"Origin": ORIGIN, "X-CSRF-Token": "invalid"},
        json=payload,
    )
    assert wrong_token.status_code == 403

    accepted = api.patch(
        "/api/v1/settings",
        headers={"Origin": ORIGIN, "X-CSRF-Token": csrf_token},
        json=payload,
    )
    assert accepted.status_code == 200


def test_sessions_can_be_listed_revoked_and_logged_out_per_device(api):
    first_login = password_login(api, user_agent="First Device")
    first_csrf = first_login.json()["csrf_token"]

    with TestClient(app) as second_device:
        second_login = password_login(second_device, user_agent="Second Device")
        second_csrf = second_login.json()["csrf_token"]
        second_session_id = second_device.get("/api/v1/auth/sessions").json()[0]["id"]

        sessions = api.get("/api/v1/auth/sessions").json()
        assert len(sessions) == 2
        assert sum(session["current"] for session in sessions) == 1
        assert {session["device_name"] for session in sessions} == {"First Device", "Second Device"}

        revoked = api.delete(
            f"/api/v1/auth/sessions/{second_session_id}",
            headers={"Origin": ORIGIN, "X-CSRF-Token": first_csrf},
        )
        assert revoked.status_code == 204
        assert second_device.get("/api/v1/auth/me").json()["authenticated"] is False
        assert second_csrf
        assert api.get("/api/v1/auth/me").json()["authenticated"] is True

    logout = api.post(
        "/api/v1/auth/logout",
        headers={"Origin": ORIGIN, "X-CSRF-Token": first_csrf},
    )
    assert logout.status_code == 204
    assert api.get("/api/v1/auth/me").json() == {
        "authenticated": False,
        "user": None,
        "csrf_token": None,
    }
    assert api.get("/api/v1/auth/sessions").status_code == 401


def test_session_activity_slides_idle_expiry_without_passing_absolute_expiry(api):
    assert password_login(api).status_code == 200
    with api.app.state.test_session() as db:
        session = db.query(UserSession).one()
        absolute_expiry = as_utc(session.max_expires_at)
        session.expires_at = datetime.now(timezone.utc) + timedelta(days=5)
        db.commit()
        prior_expiry = as_utc(session.expires_at)

    response = api.get("/api/v1/auth/me")
    assert response.json()["authenticated"] is True
    with api.app.state.test_session() as db:
        session = db.query(UserSession).one()
        assert as_utc(session.expires_at) > prior_expiry
        assert as_utc(session.expires_at) <= as_utc(session.max_expires_at)
        assert as_utc(session.max_expires_at) == absolute_expiry


def test_user_cannot_revoke_another_users_session(api):
    password_login(api, user_agent="Student Device")
    with api.app.state.test_session() as db:
        session_id = db.query(UserSession).one().id

    with TestClient(app) as lecturer_device:
        password_login(lecturer_device, email="lecturer@example.com", user_agent="Lecturer Device")
        csrf_token = lecturer_device.cookies.get("lt_csrf")
        response = lecturer_device.delete(
            f"/api/v1/auth/sessions/{session_id}",
            headers={"Origin": ORIGIN, "X-CSRF-Token": csrf_token},
        )
        assert response.status_code == 404


def test_expired_absolute_session_is_cleared_on_restore(api):
    assert password_login(api).status_code == 200
    with api.app.state.test_session() as db:
        session = db.query(UserSession).one()
        session.max_expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        db.commit()

    response = api.get("/api/v1/auth/me")
    assert response.status_code == 200
    assert response.json()["authenticated"] is False
    assert any(
        value.lower().startswith("lt_session=") and "max-age=0" in value.lower()
        for value in response.headers.get_list("set-cookie")
    ), response.headers.get_list("set-cookie")


def test_expired_idle_session_is_rejected_and_cookie_is_cleared(api):
    assert password_login(api).status_code == 200
    with api.app.state.test_session() as db:
        session = db.query(UserSession).one()
        session.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        db.commit()

    response = api.get("/api/v1/auth/me")
    assert response.status_code == 200
    assert response.json()["authenticated"] is False
    assert any(value.startswith("lt_session=") for value in response.headers.get_list("set-cookie"))


def test_authentication_and_registration_reject_untrusted_origins(api):
    login = api.post(
        "/api/v1/auth/login",
        headers={"Origin": "https://attacker.example"},
        json={"email": "student@example.com", "password": "password-123"},
    )
    assert login.status_code == 403
    assert api.cookies.get("lt_session") is None

    registration = api.post(
        "/api/v1/auth/register",
        headers={"Origin": "https://attacker.example"},
        json={"name": "Attacker", "email": "attacker@example.com", "password": "long-password"},
    )
    assert registration.status_code == 403
    with api.app.state.test_session() as db:
        assert db.query(UserSession).count() == 0


def test_production_session_cookie_uses_host_prefix_secure_and_http_only(monkeypatch):
    monkeypatch.setattr(session_service, "SESSION_COOKIE_SECURE", True)
    monkeypatch.setattr(session_service, "SESSION_COOKIE_NAME", "__Host-lt_session")
    response = Response()

    session_service.set_session_cookie(
        response,
        "unreadable-session-secret",
        datetime.now(timezone.utc) + timedelta(days=30),
    )

    cookie = response.headers.get("set-cookie")
    assert cookie.startswith("__Host-lt_session=")
    assert "secure" in cookie.lower()
    assert "httponly" in cookie.lower()
    assert "samesite=lax" in cookie.lower()
    assert "path=/" in cookie.lower()
    assert "domain=" not in cookie.lower()
