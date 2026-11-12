from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Literal
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from PIL import Image, UnidentifiedImageError
from pydantic import ValidationError
from sqlalchemy.orm import Session, joinedload

from app.core.config import UPLOAD_DIR
from app.core.database import get_db
from app.core.dependencies import require_roles
from app.models import StudentVerification, User
from app.schemas.api import (
    PageResponse,
    StudentVerificationCreate,
    StudentVerificationMineResponse,
    StudentVerificationResponse,
    StudentVerificationReviewRequest,
)
from app.services.api import commit_or_conflict, paginate, record_activity

router = APIRouter(prefix="/student-verifications", tags=["Student verification"])
student_only = require_roles("Student")
admin_only = require_roles("Admin")
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
IMAGE_FORMATS = {
    ".jpg": ("image/jpeg", lambda content: content.startswith(b"\xff\xd8\xff")),
    ".jpeg": ("image/jpeg", lambda content: content.startswith(b"\xff\xd8\xff")),
    ".png": ("image/png", lambda content: content.startswith(b"\x89PNG\r\n\x1a\n")),
    ".webp": ("image/webp", lambda content: len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP"),
}


def verification_output(verification: StudentVerification) -> dict:
    return StudentVerificationResponse(
        id=verification.id,
        student_id=verification.user_id,
        student_name=verification.student.name,
        student_email=verification.student.email,
        full_name=verification.full_name,
        student_number=verification.student_number,
        university=verification.university,
        college=verification.college,
        department=verification.department,
        academic_year=verification.academic_year,
        status=verification.status,
        review_note=verification.review_note,
        front_image_url=f"/student-verifications/{verification.id}/front-image",
        back_image_url=f"/student-verifications/{verification.id}/back-image" if verification.back_image_path else None,
        submitted_at=verification.submitted_at,
        reviewer_name=verification.reviewer.name if verification.reviewer else None,
        reviewed_at=verification.reviewed_at,
    ).model_dump()


async def store_image(upload: UploadFile | None, destination_dir: Path) -> tuple[Path, str] | None:
    if upload is None:
        return None
    extension = Path(upload.filename or "").suffix.lower()
    format_info = IMAGE_FORMATS.get(extension)
    if format_info is None:
        raise HTTPException(status_code=415, detail="Student ID images must be JPG, PNG, or WebP files.")
    content_type, signature_check = format_info
    contents = await upload.read(MAX_IMAGE_SIZE_BYTES + 1)
    if len(contents) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="Each student ID image must be no larger than 5 MiB.")
    if not contents or not signature_check(contents):
        raise HTTPException(status_code=415, detail="The uploaded image content does not match its file type.")
    try:
        with Image.open(BytesIO(contents)) as image:
            if image.width > 12000 or image.height > 12000:
                raise HTTPException(status_code=415, detail="The uploaded image dimensions are too large.")
            image.verify()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as error:
        raise HTTPException(status_code=415, detail="The uploaded image could not be opened.") from error

    destination_dir.mkdir(parents=True, exist_ok=True)
    destination = destination_dir / f"{uuid.uuid4().hex}{extension}"
    destination.write_bytes(contents)
    return destination, content_type


def remove_stored_image(file_path: str | None) -> None:
    if not file_path:
        return
    path = Path(file_path).resolve()
    if path.is_relative_to(UPLOAD_DIR.resolve()) and path.is_file():
        path.unlink()


def find_verification(db: Session, verification_id: int) -> StudentVerification:
    verification = (
        db.query(StudentVerification)
        .options(joinedload(StudentVerification.reviewer))
        .filter(StudentVerification.id == verification_id)
        .first()
    )
    if verification is None:
        raise HTTPException(status_code=404, detail="The student verification submission does not exist.")
    return verification


@router.get("/mine", response_model=StudentVerificationMineResponse)
def get_my_verification(
    db: Session = Depends(get_db),
    student: User = Depends(student_only),
):
    verification = (
        db.query(StudentVerification)
        .options(joinedload(StudentVerification.reviewer))
        .filter(StudentVerification.user_id == student.id)
        .first()
    )
    if verification is None:
        return {"submitted": False, "submission": None}
    return {"submitted": True, "submission": verification_output(verification)}


@router.post("", response_model=StudentVerificationResponse, status_code=status.HTTP_201_CREATED)
async def submit_student_verification(
    full_name: str = Form(...),
    student_number: str = Form(...),
    university: str = Form(...),
    college: str = Form(...),
    department: str = Form(...),
    academic_year: str = Form(...),
    front_image: UploadFile = File(...),
    back_image: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    student: User = Depends(student_only),
):
    try:
        payload = StudentVerificationCreate.model_validate({
            "full_name": full_name,
            "student_number": student_number,
            "university": university,
            "college": college,
            "department": department,
            "academic_year": academic_year,
        })
    except ValidationError as error:
        raise HTTPException(status_code=422, detail="Enter valid student details and select a department from your college.") from error

    verification = db.query(StudentVerification).filter(StudentVerification.user_id == student.id).first()
    if verification and verification.status != "Rejected":
        raise HTTPException(status_code=409, detail="Your student verification has already been submitted.")

    destination_dir = UPLOAD_DIR / "student-verification"
    saved_files: list[Path] = []
    old_files = (
        [verification.front_image_path, verification.back_image_path]
        if verification
        else []
    )
    try:
        front = await store_image(front_image, destination_dir)
        if front is None:
            raise HTTPException(status_code=422, detail="A front image of your student ID is required.")
        saved_files.append(front[0])
        back = await store_image(back_image, destination_dir)
        if back:
            saved_files.append(back[0])

        if verification is None:
            verification = StudentVerification(user_id=student.id)
            db.add(verification)
        verification.full_name = payload.full_name
        verification.student_number = payload.student_number
        verification.university = payload.university
        verification.college = payload.college
        verification.department = payload.department
        verification.academic_year = payload.academic_year
        verification.front_image_path = str(front[0])
        verification.front_image_content_type = front[1]
        verification.back_image_path = str(back[0]) if back else None
        verification.back_image_content_type = back[1] if back else None
        verification.status = "Pending"
        verification.review_note = None
        verification.reviewed_by = None
        verification.reviewed_at = None
        verification.submitted_at = datetime.now(timezone.utc)
        db.flush()
        record_activity(
            db,
            student,
            "submitted",
            "student_verification",
            verification.id,
            f"Student account #{student.id} submitted university verification.",
        )
        commit_or_conflict(db, "The student verification could not be saved.")
    except Exception:
        db.rollback()
        for path in saved_files:
            path.unlink(missing_ok=True)
        raise

    for path in old_files:
        remove_stored_image(path)
    db.refresh(verification)
    return verification_output(verification)


@router.get("/review-queue", response_model=PageResponse[StudentVerificationResponse])
def list_student_verifications(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: Literal["Pending", "Approved", "Rejected"] | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    _admin: User = Depends(admin_only),
):
    query = db.query(StudentVerification).options(
        joinedload(StudentVerification.reviewer),
        joinedload(StudentVerification.student),
    )
    if status_filter:
        query = query.filter(StudentVerification.status == status_filter)
    result = paginate(query, page, page_size)
    result["items"] = [verification_output(item) for item in result["items"]]
    return result


@router.get("/{verification_id}/front-image")
def get_front_image(
    verification_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(admin_only),
):
    verification = find_verification(db, verification_id)
    path = Path(verification.front_image_path).resolve()
    if not path.is_relative_to(UPLOAD_DIR.resolve()) or not path.is_file():
        raise HTTPException(status_code=404, detail="The student ID image is not available.")
    return FileResponse(
        path,
        media_type=verification.front_image_content_type,
        headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store"},
    )


@router.get("/{verification_id}/back-image")
def get_back_image(
    verification_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(admin_only),
):
    verification = find_verification(db, verification_id)
    if not verification.back_image_path or not verification.back_image_content_type:
        raise HTTPException(status_code=404, detail="No back image was submitted.")
    path = Path(verification.back_image_path).resolve()
    if not path.is_relative_to(UPLOAD_DIR.resolve()) or not path.is_file():
        raise HTTPException(status_code=404, detail="The student ID image is not available.")
    return FileResponse(
        path,
        media_type=verification.back_image_content_type,
        headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store"},
    )


@router.put("/{verification_id}/review", response_model=StudentVerificationResponse)
def review_student_verification(
    verification_id: int,
    payload: StudentVerificationReviewRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(admin_only),
):
    verification = find_verification(db, verification_id)
    if verification.status != "Pending":
        raise HTTPException(status_code=409, detail="Only pending student verifications can be reviewed.")
    verification.status = "Approved" if payload.action == "approve" else "Rejected"
    verification.review_note = payload.review_note
    verification.reviewed_by = admin.id
    verification.reviewer = admin
    verification.reviewed_at = datetime.now(timezone.utc)
    record_activity(
        db,
        admin,
        payload.action,
        "student_verification",
        verification.id,
        f"{'Approved' if payload.action == 'approve' else 'Rejected'} student verification #{verification.id}.",
    )
    commit_or_conflict(db)
    db.refresh(verification)
    return verification_output(verification)
