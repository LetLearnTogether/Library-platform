import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import Request, Response
from sqlalchemy.orm import Session

from app.core.config import (
    CSRF_COOKIE_NAME,
    SESSION_COOKIE_NAME,
    SESSION_COOKIE_SECURE,
    SESSION_IDLE_TIMEOUT_DAYS,
    SESSION_MAX_LIFETIME_DAYS,
)
from app.models import User, UserSession

SESSION_COOKIE_SAMESITE = "lax"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def hash_session_secret(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def issue_session(db: Session, user: User, request: Request, response: Response) -> tuple[UserSession, str]:
    now = utc_now()
    session_secret = secrets.token_urlsafe(32)
    csrf_token = secrets.token_urlsafe(32)
    idle_timeout = timedelta(days=SESSION_IDLE_TIMEOUT_DAYS)
    max_expires_at = now + timedelta(days=SESSION_MAX_LIFETIME_DAYS)
    session = UserSession(
        id=str(uuid.uuid4()),
        user_id=user.id,
        token_hash=hash_session_secret(session_secret),
        csrf_token_hash=hash_session_secret(csrf_token),
        device_name=(request.headers.get("user-agent") or "Unknown device").strip()[:255] or "Unknown device",
        created_at=now,
        last_used_at=now,
        expires_at=min(now + idle_timeout, max_expires_at),
        max_expires_at=max_expires_at,
    )

    previous_secret = request.cookies.get(SESSION_COOKIE_NAME)
    if previous_secret:
        previous = db.query(UserSession).filter(
            UserSession.token_hash == hash_session_secret(previous_secret),
            UserSession.revoked_at.is_(None),
        ).first()
        if previous is not None:
            previous.revoked_at = now

    db.add(session)
    db.commit()
    db.refresh(session)
    set_session_cookie(response, session_secret, session.expires_at)
    set_csrf_cookie(
        response,
        csrf_token,
        min(SESSION_IDLE_TIMEOUT_DAYS * 24 * 60 * 60, int((max_expires_at - now).total_seconds())),
    )
    return session, csrf_token


def set_session_cookie(response: Response, session_secret: str, expires_at: datetime) -> None:
    max_age = max(0, int((as_utc(expires_at) - utc_now()).total_seconds()))
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_secret,
        max_age=max_age,
        expires=max_age,
        path="/",
        secure=SESSION_COOKIE_SECURE,
        httponly=True,
        samesite=SESSION_COOKIE_SAMESITE,
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
        secure=SESSION_COOKIE_SECURE,
        httponly=True,
        samesite=SESSION_COOKIE_SAMESITE,
    )
    response.delete_cookie(
        key=CSRF_COOKIE_NAME,
        path="/",
        secure=SESSION_COOKIE_SECURE,
        httponly=False,
        samesite=SESSION_COOKIE_SAMESITE,
    )


def set_csrf_cookie(response: Response, csrf_token: str, max_age: int | None = None) -> None:
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=csrf_token,
        max_age=SESSION_IDLE_TIMEOUT_DAYS * 24 * 60 * 60 if max_age is None else max_age,
        path="/",
        secure=SESSION_COOKIE_SECURE,
        httponly=False,
        samesite=SESSION_COOKIE_SAMESITE,
    )


def rotate_csrf_token(session: UserSession, response: Response) -> str:
    csrf_token = secrets.token_urlsafe(32)
    session.csrf_token_hash = hash_session_secret(csrf_token)
    remaining = max(0, int((as_utc(session.max_expires_at) - utc_now()).total_seconds()))
    set_csrf_cookie(response, csrf_token, min(SESSION_IDLE_TIMEOUT_DAYS * 24 * 60 * 60, remaining))
    return csrf_token


def load_session(
    db: Session,
    request: Request,
    response: Response,
) -> tuple[UserSession, User] | None:
    secret = request.cookies.get(SESSION_COOKIE_NAME)
    if not secret:
        return None

    session = db.query(UserSession).filter(
        UserSession.token_hash == hash_session_secret(secret),
        UserSession.revoked_at.is_(None),
    ).first()
    now = utc_now()
    if (
        session is None
        or as_utc(session.expires_at) <= now
        or as_utc(session.max_expires_at) <= now
    ):
        clear_session_cookie(response)
        return None

    user = db.get(User, session.user_id)
    if user is None:
        session.revoked_at = now
        db.commit()
        clear_session_cookie(response)
        return None

    request.state.auth_session = session
    request.state.csrf_token_hash = session.csrf_token_hash
    return session, user


def refresh_session(
    db: Session,
    session: UserSession,
    request: Request,
    response: Response,
) -> None:
    now = utc_now()
    session.last_used_at = now
    session.expires_at = min(now + timedelta(days=SESSION_IDLE_TIMEOUT_DAYS), as_utc(session.max_expires_at))
    db.commit()
    db.refresh(session)
    secret = request.cookies.get(SESSION_COOKIE_NAME)
    if secret:
        set_session_cookie(response, secret, session.expires_at)
    csrf_token = request.cookies.get(CSRF_COOKIE_NAME)
    if csrf_token and secrets.compare_digest(hash_session_secret(csrf_token), session.csrf_token_hash):
        remaining = max(0, int((as_utc(session.max_expires_at) - now).total_seconds()))
        set_csrf_cookie(
            response,
            csrf_token,
            min(SESSION_IDLE_TIMEOUT_DAYS * 24 * 60 * 60, remaining),
        )
