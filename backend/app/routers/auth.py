import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import CSRF_COOKIE_NAME
from app.core.dependencies import get_current_user, get_optional_current_user, verify_request_origin
from app.core.security import hash_password, verify_password
from app.models import User, UserSession
from app.schemas.api import (
    AuthSessionResponse,
    GoogleLoginRequest,
    LoginRequest,
    RegisterRequest,
    UserSessionResponse,
)
from app.services.api import commit_or_conflict, require_platform_settings
from app.services.google_auth import verify_google_identity
from app.services.sessions import clear_session_cookie, hash_session_secret, issue_session, rotate_csrf_token, utc_now

router = APIRouter(prefix="/auth", tags=["Authentication"])
_dummy_password_hash = hash_password("timing-protection-password")


@router.post("/register", response_model=AuthSessionResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    _origin: None = Depends(verify_request_origin),
):
    settings = require_platform_settings(db)
    if not settings.registration_enabled:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Public registration is currently paused.")
    email = str(payload.email).lower()
    if db.query(User).filter(func.lower(User.email) == email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists.")
    user = User(name=payload.name.strip(), email=email, password_hash=hash_password(payload.password), role="Student")
    db.add(user)
    commit_or_conflict(db, "An account with this email already exists.")
    db.refresh(user)
    _, csrf_token = issue_session(db, user, request, response)
    return AuthSessionResponse(authenticated=True, user=user, csrf_token=csrf_token)


@router.post("/login", response_model=AuthSessionResponse)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    _origin: None = Depends(verify_request_origin),
):
    user = db.query(User).filter(func.lower(User.email) == str(payload.email).lower()).first()
    password_hash = user.password_hash if user and user.password_hash else _dummy_password_hash
    password_valid = verify_password(payload.password, password_hash)
    if user is None or not password_valid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email or password is incorrect.")
    _, csrf_token = issue_session(db, user, request, response)
    return AuthSessionResponse(authenticated=True, user=user, csrf_token=csrf_token)


@router.post("/google", response_model=AuthSessionResponse)
def google_login(
    payload: GoogleLoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    _origin: None = Depends(verify_request_origin),
):
    identity = verify_google_identity(payload.credential, payload.nonce)
    user = db.query(User).filter(User.google_subject == identity.subject).first()

    if user is None:
        user = db.query(User).filter(func.lower(User.email) == identity.email).first()
        if user is not None:
            if user.google_subject is not None and user.google_subject != identity.subject:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This email is already linked to a different Google account.",
                )
            user.google_subject = identity.subject
        else:
            settings = require_platform_settings(db)
            if not settings.registration_enabled:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Public registration is currently paused.",
                )
            user = User(
                name=identity.name,
                email=identity.email,
                password_hash=None,
                google_subject=identity.subject,
                role="Student",
            )
            db.add(user)

        commit_or_conflict(db, "This Google account could not be linked to a user.")
        db.refresh(user)

    _, csrf_token = issue_session(db, user, request, response)
    return AuthSessionResponse(authenticated=True, user=user, csrf_token=csrf_token)


@router.get("/me", response_model=AuthSessionResponse)
def me(
    request: Request,
    response: Response,
    user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    session = getattr(request.state, "auth_session", None)
    if user is None:
        return AuthSessionResponse(authenticated=False, user=None, csrf_token=None)
    if session is None:
        return AuthSessionResponse(authenticated=True, user=user, csrf_token=None)

    csrf_token = request.cookies.get(CSRF_COOKIE_NAME)
    if not csrf_token or not secrets.compare_digest(
        hash_session_secret(csrf_token), session.csrf_token_hash
    ):
        csrf_token = rotate_csrf_token(session, response)
        db.commit()
    return AuthSessionResponse(authenticated=True, user=user, csrf_token=csrf_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    request: Request,
    response: Response,
    user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    session = getattr(request.state, "auth_session", None)
    if session is not None:
        session.revoked_at = utc_now()
        db.commit()
    clear_session_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/sessions", response_model=list[UserSessionResponse])
def list_sessions(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_session = getattr(request.state, "auth_session", None)
    now = utc_now()
    sessions = db.query(UserSession).filter(
        UserSession.user_id == user.id,
        UserSession.revoked_at.is_(None),
        UserSession.expires_at > now,
        UserSession.max_expires_at > now,
    ).order_by(UserSession.created_at.desc()).all()
    return [
        UserSessionResponse(
            id=session.id,
            device_name=session.device_name,
            created_at=session.created_at,
            last_used_at=session.last_used_at,
            expires_at=session.expires_at,
            max_expires_at=session.max_expires_at,
            current=current_session is not None and current_session.id == session.id,
        )
        for session in sessions
    ]


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_session(
    session_id: str,
    request: Request,
    response: Response,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(UserSession).filter(
        UserSession.id == session_id,
        UserSession.user_id == user.id,
        UserSession.revoked_at.is_(None),
    ).first()
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="The session was not found.")
    session.revoked_at = utc_now()
    db.commit()
    if getattr(request.state, "auth_session", None) is not None and request.state.auth_session.id == session.id:
        clear_session_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response
