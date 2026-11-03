import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.config import MAX_UPLOAD_SIZE_BYTES, PUBLIC_API_BASE_URL, UPLOAD_DIR
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models import Course, Document, User
from app.schemas.api import DocumentResponse, DocumentReviewRequest, DocumentStatus, DocumentType, PageResponse, Semester
from app.services.api import (
    commit_or_conflict,
    document_output,
    paginate,
    require_course,
    require_course_lecturer,
    require_document,
    require_platform_settings,
    record_activity,
)

router = APIRouter(prefix="/documents", tags=["Documents"])
reviewer_roles = require_roles("Lecturer", "Moderator", "Admin")
moderator_roles = require_roles("Moderator", "Admin")
ALLOWED_FILES = {
    ".pdf": ("application/pdf", lambda data: data.startswith(b"%PDF-")),
    ".jpg": ("image/jpeg", lambda data: data.startswith(b"\xff\xd8\xff")),
    ".jpeg": ("image/jpeg", lambda data: data.startswith(b"\xff\xd8\xff")),
    ".png": ("image/png", lambda data: data.startswith(b"\x89PNG\r\n\x1a\n")),
    ".webp": ("image/webp", lambda data: len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP"),
}


def validate_pagination(page: int, page_size: int):
    if page < 1 or not 1 <= page_size <= 100:
        raise HTTPException(status_code=422, detail="page must be positive and page_size must be between 1 and 100.")


def load_public_document(db: Session, document_id: int) -> Document:
    document = require_document(db, document_id)
    if document.status != "Verified":
        raise HTTPException(status_code=404, detail="The requested document does not exist.")
    return document


@router.get("", response_model=PageResponse[DocumentResponse])
def list_documents(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    q: str | None = Query(default=None, max_length=100),
    course_id: int | None = Query(default=None, ge=1),
    course_code: str | None = Query(default=None, max_length=50),
    year: int | None = Query(default=None, ge=1900, le=2200),
    semester: Semester | None = None,
    document_type: DocumentType | None = None,
    db: Session = Depends(get_db),
):
    validate_pagination(page, page_size)
    query = db.query(Document).join(Course).options(joinedload(Document.course)).filter(Document.status == "Verified")
    if q:
        pattern = f"%{q.strip().lower()}%"
        query = query.filter(
            func.lower(Document.filename).like(pattern)
            | func.lower(Course.course_code).like(pattern)
            | func.lower(Course.course_title).like(pattern)
        )
    if course_id is not None:
        query = query.filter(Document.course_id == course_id)
    if course_code:
        query = query.filter(func.lower(Course.course_code) == course_code.lower())
    if year is not None:
        query = query.filter(Course.year == year)
    if semester:
        query = query.filter(Course.semester == semester)
    if document_type:
        query = query.filter(Document.document_type == document_type)
    result = paginate(query, page, page_size)
    result["items"] = [document_output(document) for document in result["items"]]
    return result


@router.get("/mine", response_model=PageResponse[DocumentResponse])
def list_my_documents(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    document_status: DocumentStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    validate_pagination(page, page_size)
    query = db.query(Document).options(joinedload(Document.course)).filter(Document.uploaded_by == user.id)
    if document_status:
        query = query.filter(Document.status == document_status)
    result = paginate(query, page, page_size)
    result["items"] = [document_output(document) for document in result["items"]]
    return result


@router.get("/review-queue", response_model=PageResponse[DocumentResponse])
def list_review_queue(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    reviewer: User = Depends(reviewer_roles),
):
    validate_pagination(page, page_size)
    query = db.query(Document).join(Course).options(joinedload(Document.course)).filter(Document.status == "Under Review")
    if reviewer.role == "Lecturer":
        query = query.filter(Course.lecturer_id == reviewer.id)
    result = paginate(query, page, page_size)
    result["items"] = [document_output(document) for document in result["items"]]
    return result


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    course_id: int = Form(...),
    document_type: DocumentType = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == "Student" and not require_platform_settings(db).uploads_enabled:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student document uploads are currently paused.")
    course = require_course(db, course_id)
    lecturer_upload = user.role == "Lecturer"
    if lecturer_upload:
        require_course_lecturer(course, user.id)
    raw_name = (file.filename or "document").replace("\\", "/").rsplit("/", 1)[-1]
    raw_name = "".join(character for character in raw_name if character.isprintable()).strip() or "document"
    extension = Path(raw_name).suffix.lower()
    expected = ALLOWED_FILES.get(extension)
    if expected is None:
        raise HTTPException(status_code=415, detail="Only PDF, JPEG, PNG, and WebP documents are accepted.")
    expected_type, signature_check = expected
    if file.content_type != expected_type:
        raise HTTPException(status_code=415, detail="The file extension and MIME type do not match an allowed format.")
    contents = await file.read(MAX_UPLOAD_SIZE_BYTES + 1)
    if len(contents) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="The uploaded file exceeds the configured size limit.")
    if not contents or not signature_check(contents):
        raise HTTPException(status_code=415, detail="The uploaded file content does not match its declared format.")
    generated_name = f"{uuid.uuid4().hex}{extension}"
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    destination = UPLOAD_DIR / generated_name
    destination.write_bytes(contents)
    document = Document(
        course_id=course_id,
        document_type=document_type,
        file_path=str(destination),
        filename=raw_name[:255],
        content_type=expected_type,
        status="Verified" if lecturer_upload else "Under Review",
        uploaded_by=user.id,
        approved_by=user.id if lecturer_upload else None,
        approved_at=func.now() if lecturer_upload else None,
        reviewed_by=user.id if lecturer_upload else None,
        reviewed_at=func.now() if lecturer_upload else None,
        verification_token=str(uuid.uuid4()) if lecturer_upload else None,
    )
    db.add(document)
    try:
        db.flush()
        if lecturer_upload:
            record_activity(
                db,
                user,
                "published",
                "document",
                document.id,
                f"Published course material for {course.course_code}.",
            )
        commit_or_conflict(db, "The document could not be saved.")
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    db.refresh(document)
    return document_output(document)


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(document_id: int, db: Session = Depends(get_db)):
    return document_output(load_public_document(db, document_id))


@router.get("/{document_id}/content")
def get_document_content(
    document_id: int,
    disposition: str = Query(default="inline", pattern="^(inline|attachment)$"),
    db: Session = Depends(get_db),
):
    document = load_public_document(db, document_id)
    file_path = Path(document.file_path).resolve()
    if not file_path.is_relative_to(UPLOAD_DIR.resolve()) or not file_path.is_file():
        raise HTTPException(status_code=404, detail="The requested document file is not available.")
    return FileResponse(
        file_path,
        media_type=document.content_type,
        filename=document.filename,
        content_disposition_type=disposition,
        headers={"X-Content-Type-Options": "nosniff"},
    )


@router.get("/{document_id}/review-content")
def get_review_document_content(
    document_id: int,
    db: Session = Depends(get_db),
    reviewer: User = Depends(reviewer_roles),
):
    document = require_document(db, document_id)
    if reviewer.role == "Lecturer":
        require_course_lecturer(document.course, reviewer.id)
    if document.status != "Under Review":
        raise HTTPException(status_code=404, detail="The requested review file does not exist.")
    file_path = Path(document.file_path).resolve()
    if not file_path.is_relative_to(UPLOAD_DIR.resolve()) or not file_path.is_file():
        raise HTTPException(status_code=404, detail="The requested document file is not available.")
    return FileResponse(
        file_path,
        media_type=document.content_type,
        filename=document.filename,
        content_disposition_type="inline",
        headers={"X-Content-Type-Options": "nosniff"},
    )


@router.put("/{document_id}/review", response_model=DocumentResponse)
def review_document(
    document_id: int,
    payload: DocumentReviewRequest,
    db: Session = Depends(get_db),
    reviewer: User = Depends(reviewer_roles),
):
    document = require_document(db, document_id)
    if document.status != "Under Review":
        raise HTTPException(status_code=409, detail="Only documents under review can be approved or rejected.")
    if reviewer.role == "Lecturer":
        require_course_lecturer(document.course, reviewer.id)
    document.reviewed_by = reviewer.id
    document.reviewed_at = func.now()
    document.review_note = payload.review_note
    if payload.action == "approve":
        document.status = "Verified"
        document.approved_by = reviewer.id
        document.approved_at = func.now()
        document.verification_token = str(uuid.uuid4())
    else:
        document.status = "Rejected"
    record_activity(
        db,
        reviewer,
        payload.action,
        "document",
        document.id,
        f"{'Approved' if payload.action == 'approve' else 'Rejected'} document #{document.id} for {document.course.course_code}.",
    )
    commit_or_conflict(db)
    db.refresh(document)
    return document_output(document)


@router.put("/{document_id}/revoke", response_model=DocumentResponse)
def revoke_document(
    document_id: int,
    db: Session = Depends(get_db),
    moderator: User = Depends(moderator_roles),
):
    document = require_document(db, document_id)
    if document.status != "Verified":
        raise HTTPException(status_code=409, detail="Only verified documents can be revoked.")
    document.status = "Revoked"
    document.reviewed_by = moderator.id
    document.reviewed_at = func.now()
    record_activity(
        db,
        moderator,
        "revoked",
        "document",
        document.id,
        f"Revoked document #{document.id} for {document.course.course_code}.",
    )
    commit_or_conflict(db)
    db.refresh(document)
    return document_output(document)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    moderator: User = Depends(reviewer_roles),
):
    document = require_document(db, document_id)
    if moderator.role == "Lecturer":
        require_course_lecturer(document.course, moderator.id)
        if document.uploaded_by != moderator.id:
            raise HTTPException(status_code=403, detail="Lecturers can remove only materials they uploaded.")
    document.status = "Revoked"
    document.reviewed_by = moderator.id
    document.reviewed_at = func.now()
    record_activity(
        db,
        moderator,
        "deleted",
        "document",
        document.id,
        f"Deleted document file for document #{document.id}.",
    )
    commit_or_conflict(db)
    file_path = Path(document.file_path).resolve()
    if file_path.is_relative_to(UPLOAD_DIR.resolve()) and file_path.is_file():
        file_path.unlink()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
