import secrets
from collections.abc import Callable
from urllib.parse import urlsplit

from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import CORS_ORIGINS, CSRF_COOKIE_NAME, PUBLIC_FRONTEND_URL
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models import User
from app.services.sessions import hash_session_secret, load_session, refresh_session

bearer_scheme = HTTPBearer(auto_error=False)
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def _request_origin(request: Request) -> str | None:
    origin = request.headers.get("origin")
    if not origin:
        return None
    parsed = urlsplit(origin)
    if not parsed.scheme or not parsed.netloc or parsed.path not in ("", "/") or parsed.query or parsed.fragment:
        return None
    return f"{parsed.scheme.lower()}://{parsed.netloc.lower()}"


def verify_request_origin(request: Request) -> None:
    origin = _request_origin(request)
    allowed_origins = {PUBLIC_FRONTEND_URL.rstrip("/").lower()}
    allowed_origins.update(value.rstrip("/").lower() for value in CORS_ORIGINS)
    if origin is None or origin not in allowed_origins:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This request origin is not allowed.")


def _require_session_csrf(request: Request) -> None:
    if request.method.upper() in SAFE_METHODS:
        return
    verify_request_origin(request)
    csrf_token = request.headers.get("x-csrf-token", "")
    csrf_cookie = request.cookies.get(CSRF_COOKIE_NAME)
    csrf_hash = getattr(request.state, "csrf_token_hash", "")
    if (
        not csrf_token
        or not csrf_cookie
        or not csrf_hash
        or not secrets.compare_digest(csrf_token, csrf_cookie)
        or not secrets.compare_digest(hash_session_secret(csrf_token), csrf_hash)
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="A valid CSRF token is required.")


def get_optional_current_user(
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    session_identity = load_session(db, request, response)
    if session_identity is not None:
        _require_session_csrf(request)
        refresh_session(db, session_identity[0], request, response)
        return session_identity[1]

    if credentials is None:
        return None
    try:
        user_id = decode_access_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="The account for this token no longer exists.")
    return user


def get_current_user(
    user: User | None = Depends(get_optional_current_user),
) -> User:
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication is required.")
    return user


def require_roles(*roles: str) -> Callable:
    def role_dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to perform this action.")
        return user

    return role_dependency
