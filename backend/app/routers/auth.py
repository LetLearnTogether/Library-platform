from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.models import User
from app.schemas.api import GoogleLoginRequest, LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.services.api import commit_or_conflict, require_platform_settings
from app.services.google_auth import verify_google_identity

router = APIRouter(prefix="/auth", tags=["Authentication"])
_dummy_password_hash = hash_password("timing-protection-password")


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
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
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(func.lower(User.email) == str(payload.email).lower()).first()
    password_hash = user.password_hash if user and user.password_hash else _dummy_password_hash
    password_valid = verify_password(payload.password, password_hash)
    if user is None or not password_valid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email or password is incorrect.")
    token, expires_in = create_access_token(user.id)
    return TokenResponse(access_token=token, expires_in=expires_in)


@router.post("/google", response_model=TokenResponse)
def google_login(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
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

    token, expires_in = create_access_token(user.id)
    return TokenResponse(access_token=token, expires_in=expires_in)


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    return user
