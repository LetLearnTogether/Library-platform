import logging
from dataclasses import dataclass

from fastapi import HTTPException, status
from google.auth.exceptions import TransportError
from google.auth.transport.requests import Request
from google.oauth2 import id_token
from pydantic import EmailStr, TypeAdapter, ValidationError

from app.core.config import GOOGLE_CLIENT_ID

logger = logging.getLogger(__name__)
email_adapter = TypeAdapter(EmailStr)


@dataclass(frozen=True)
class VerifiedGoogleIdentity:
    subject: str
    email: str
    name: str


def verify_google_identity(credential: str, expected_nonce: str) -> VerifiedGoogleIdentity:
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google sign-in is not configured.",
        )

    try:
        claims = id_token.verify_oauth2_token(
            credential,
            Request(),
            audience=GOOGLE_CLIENT_ID,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The Google sign-in could not be verified.",
        ) from error
    except TransportError as error:
        logger.exception("Google token verification could not reach Google's signing-key service.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google sign-in is temporarily unavailable.",
        ) from error

    audience = claims.get("aud")
    audiences = audience if isinstance(audience, list) else [audience]
    if (
        claims.get("iss") not in {"accounts.google.com", "https://accounts.google.com"}
        or GOOGLE_CLIENT_ID not in audiences
        or claims.get("nonce") != expected_nonce
        or claims.get("email_verified") is not True
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The Google sign-in could not be verified.",
        )

    subject = claims.get("sub")
    raw_email = claims.get("email")
    if not isinstance(subject, str) or not subject or len(subject) > 255 or not isinstance(raw_email, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The Google sign-in did not provide a valid account identity.",
        )

    try:
        email = str(email_adapter.validate_python(raw_email)).lower()
    except ValidationError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The Google sign-in did not provide a valid email address.",
        ) from error

    if len(email) > 150:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The Google account email is too long to use with this platform.",
        )

    name = claims.get("name")
    if not isinstance(name, str) or not name.strip():
        name = email.partition("@")[0]
    name = name.strip()[:100] or email.partition("@")[0][:100]
    return VerifiedGoogleIdentity(subject=subject, email=email, name=name)
