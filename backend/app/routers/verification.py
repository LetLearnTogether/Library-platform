<<<<<<< HEAD
import io

import qrcode
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.config import PUBLIC_FRONTEND_URL
from app.core.database import get_db
from app.models import Document
from app.schemas.api import VerificationResponse

router = APIRouter(prefix="/verification", tags=["Verification"])


@router.get("/{token}", response_model=VerificationResponse)
def verify_document(token: str, db: Session = Depends(get_db)):
    document = db.query(Document).filter(Document.verification_token == token).first()
    if document is None or document.status not in {"Verified", "Revoked"}:
        raise HTTPException(status_code=404, detail="The verification token is invalid.")
    return {
        "document_id": document.id,
        "course_code": document.course.course_code,
        "course_title": document.course.course_title,
        "document_type": document.document_type,
        "approved_at": document.approved_at,
        "status": document.status,
    }


@router.get("/{token}/qr")
def verification_qr(token: str, db: Session = Depends(get_db)):
    document = db.query(Document).filter(Document.verification_token == token).first()
    if document is None or document.status not in {"Verified", "Revoked"}:
        raise HTTPException(status_code=404, detail="The verification token is invalid.")
    verification_url = f"{PUBLIC_FRONTEND_URL}/verify/{token}"
    image = qrcode.make(verification_url)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="image/png", headers={"Cache-Control": "public, max-age=3600"})
=======
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/verification", tags=["Verification"])

@router.get("/{token}")
def verify_document(token: str):
    """Verify a document using its QR code token."""
    # TODO: Add database lookup to check if token exists and is valid
    return {"status": "verified", "token": token}
>>>>>>> 9528878 (feat: complete backend API with secure env config, MySQL integration, and full documentation)
