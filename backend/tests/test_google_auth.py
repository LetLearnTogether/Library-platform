import pytest
from fastapi import HTTPException
from google.auth.exceptions import TransportError

import app.routers.auth as auth_router
import app.services.google_auth as google_auth
from app.services.google_auth import VerifiedGoogleIdentity
from conftest import login


NONCE = "a" * 64


def google_login(api, credential="test-google-credential", nonce=NONCE):
    return api.post(
        "/api/v1/auth/google",
        json={"credential": credential, "nonce": nonce},
    )


def identity_verifier(subject, email, name):
    def verify_identity(credential, nonce):
        assert credential == "test-google-credential"
        assert nonce == NONCE
        return VerifiedGoogleIdentity(subject=subject, email=email, name=name)

    return verify_identity


def test_google_token_verification_checks_audience_issuer_nonce_and_email(monkeypatch):
    monkeypatch.setattr(google_auth, "GOOGLE_CLIENT_ID", "web-client-id")
    claims = {
        "aud": "web-client-id",
        "email": "Student@Example.com",
        "email_verified": True,
        "iss": "https://accounts.google.com",
        "name": "Student Example",
        "nonce": NONCE,
        "sub": "google-user-123",
    }

    def verify_token(credential, request, audience):
        assert credential == "signed-google-token"
        assert request is not None
        assert audience == "web-client-id"
        return claims

    monkeypatch.setattr(google_auth.id_token, "verify_oauth2_token", verify_token)
    identity = google_auth.verify_google_identity("signed-google-token", NONCE)

    assert identity == VerifiedGoogleIdentity(
        subject="google-user-123",
        email="student@example.com",
        name="Student Example",
    )


@pytest.mark.parametrize(
    "claim, value",
    [
        ("iss", "https://attacker.example"),
        ("aud", "another-client-id"),
        ("nonce", "b" * 64),
        ("email_verified", False),
    ],
)
def test_google_token_verification_rejects_untrusted_claims(monkeypatch, claim, value):
    monkeypatch.setattr(google_auth, "GOOGLE_CLIENT_ID", "web-client-id")
    claims = {
        "aud": "web-client-id",
        "email": "student@example.com",
        "email_verified": True,
        "iss": "https://accounts.google.com",
        "nonce": NONCE,
        "sub": "google-user-123",
    }
    claims[claim] = value
    def return_claims(credential, request, audience):
        assert credential == "signed-google-token"
        assert request is not None
        assert audience == "web-client-id"
        return claims

    monkeypatch.setattr(google_auth.id_token, "verify_oauth2_token", return_claims)

    with pytest.raises(HTTPException) as error:
        google_auth.verify_google_identity("signed-google-token", NONCE)

    assert error.value.status_code == 401


def test_google_token_verification_reports_missing_configuration_and_network_failures(monkeypatch):
    monkeypatch.setattr(google_auth, "GOOGLE_CLIENT_ID", "")
    with pytest.raises(HTTPException) as missing_configuration:
        google_auth.verify_google_identity("signed-google-token", NONCE)
    assert missing_configuration.value.status_code == 503

    monkeypatch.setattr(google_auth, "GOOGLE_CLIENT_ID", "web-client-id")

    def fail_verification(credential, request, audience):
        assert credential == "signed-google-token"
        assert request is not None
        assert audience == "web-client-id"
        raise TransportError("network unavailable")

    monkeypatch.setattr(google_auth.id_token, "verify_oauth2_token", fail_verification)
    with pytest.raises(HTTPException) as network_error:
        google_auth.verify_google_identity("signed-google-token", NONCE)
    assert network_error.value.status_code == 503


def test_google_login_creates_and_reuses_a_student_account(api, monkeypatch):
    monkeypatch.setattr(
        auth_router,
        "verify_google_identity",
        identity_verifier("google-user-123", "new-student@gmail.com", "New Student"),
    )

    first = google_login(api)
    assert first.status_code == 200, first.text
    first_user = api.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {first.json()['access_token']}"},
    ).json()
    assert first_user["email"] == "new-student@gmail.com"
    assert first_user["name"] == "New Student"
    assert first_user["role"] == "Student"

    second = google_login(api)
    second_user = api.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {second.json()['access_token']}"},
    ).json()
    assert second_user["id"] == first_user["id"]

    password_login = api.post(
        "/api/v1/auth/login",
        json={"email": "new-student@gmail.com", "password": "any-password"},
    )
    assert password_login.status_code == 401


def test_google_login_links_verified_email_to_existing_password_account(api, monkeypatch):
    monkeypatch.setattr(
        auth_router,
        "verify_google_identity",
        identity_verifier("google-student-account", "student@example.com", "Student"),
    )

    response = google_login(api)
    assert response.status_code == 200, response.text
    google_user = api.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {response.json()['access_token']}"},
    ).json()

    password_user = api.post(
        "/api/v1/auth/login",
        json={"email": "student@example.com", "password": "password-123"},
    )
    assert password_user.status_code == 200
    existing_user = api.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {password_user.json()['access_token']}"},
    ).json()
    assert existing_user["id"] == google_user["id"]


def test_google_login_rejects_conflicting_google_account_and_obeys_registration_setting(api, monkeypatch):
    monkeypatch.setattr(
        auth_router,
        "verify_google_identity",
        identity_verifier("google-account-one", "linked@example.com", "Linked Student"),
    )
    assert google_login(api).status_code == 200

    monkeypatch.setattr(
        auth_router,
        "verify_google_identity",
        identity_verifier("google-account-two", "linked@example.com", "Linked Student"),
    )
    assert google_login(api).status_code == 409

    admin_headers = login(api, "admin@example.com")
    paused = api.patch(
        "/api/v1/settings",
        headers=admin_headers,
        json={"registration_enabled": False},
    )
    assert paused.status_code == 200

    monkeypatch.setattr(
        auth_router,
        "verify_google_identity",
        identity_verifier("google-account-three", "another-student@example.com", "Another Student"),
    )
    blocked = google_login(api)
    assert blocked.status_code == 403
