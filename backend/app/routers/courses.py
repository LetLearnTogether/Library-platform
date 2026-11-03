import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import UPLOAD_DIR
from app.core.database import get_db
from app.core.dependencies import require_roles
from app.models import (
    Course,
    CourseAnnouncement,
    CourseEnrollment,
    Document,
    Quiz,
    QuizAttempt,
    QuizAttemptAnswer,
    QuizQuestion,
    Report,
    User,
)
from app.schemas.api import CourseCreate, CourseResponse, CourseUpdate, PageResponse, Semester
from app.services.api import commit_or_conflict, flush_or_conflict, paginate, record_activity

router = APIRouter(prefix="/courses", tags=["Courses"])
admin_only = require_roles("Admin")
logger = logging.getLogger(__name__)


def validate_lecturer(db: Session, lecturer_id: int | None):
    if lecturer_id is None:
        return
    lecturer = db.get(User, lecturer_id)
    if lecturer is None or lecturer.role != "Lecturer":
        raise HTTPException(status_code=422, detail="lecturer_id must identify an existing Lecturer.")


@router.get("", response_model=PageResponse[CourseResponse])
def list_courses(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    q: str | None = Query(default=None, max_length=100),
    year: int | None = Query(default=None, ge=1900, le=2200),
    semester: Semester | None = None,
    db: Session = Depends(get_db),
):
    if page < 1 or not 1 <= page_size <= 100:
        raise HTTPException(status_code=422, detail="page must be positive and page_size must be between 1 and 100.")
    query = db.query(Course)
    if q:
        pattern = f"%{q.strip().lower()}%"
        query = query.filter(func.lower(Course.course_code).like(pattern) | func.lower(Course.course_title).like(pattern))
    if year is not None:
        query = query.filter(Course.year == year)
    if semester:
        query = query.filter(Course.semester == semester)
    result = paginate(query, page, page_size)
    result["items"] = [CourseResponse.model_validate(course).model_dump() for course in result["items"]]
    return result


@router.post("", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(payload: CourseCreate, db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    validate_lecturer(db, payload.lecturer_id)
    course = Course(**payload.model_dump())
    db.add(course)
    flush_or_conflict(db, "A course with this course code already exists.")
    record_activity(
        db,
        admin,
        "created",
        "course",
        course.id,
        f"Created course {course.course_code} (#{course.id}).",
    )
    commit_or_conflict(db, "A course with this course code already exists.")
    db.refresh(course)
    return course


@router.get("/{course_id}", response_model=CourseResponse)
def get_course(course_id: int, db: Session = Depends(get_db)):
    course = db.get(Course, course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="The requested course does not exist.")
    return course


@router.patch("/{course_id}", response_model=CourseResponse)
def update_course(
    course_id: int,
    payload: CourseUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(admin_only),
):
    course = db.get(Course, course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="The requested course does not exist.")
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=422, detail="At least one field must be provided.")
    changed_fields = [field for field, value in changes.items() if getattr(course, field) != value]
    if "lecturer_id" in changes:
        validate_lecturer(db, changes["lecturer_id"])
    for key, value in changes.items():
        setattr(course, key, value)
    if changed_fields:
        record_activity(
            db,
            admin,
            "updated",
            "course",
            course.id,
            f"Updated course {course.course_code} (#{course.id}) fields: {', '.join(changed_fields)}.",
        )
    commit_or_conflict(db, "The course code is already in use.")
    db.refresh(course)
    return course


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(course_id: int, db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    course = db.get(Course, course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="The requested course does not exist.")
    document_paths = [
        document.file_path
        for document in db.query(Document).filter(Document.course_id == course_id).all()
    ]
    quiz_ids = [
        quiz_id
        for (quiz_id,) in db.query(Quiz.id).filter(Quiz.course_id == course_id).all()
    ]
    attempt_ids = [
        attempt_id
        for (attempt_id,) in db.query(QuizAttempt.id).filter(QuizAttempt.quiz_id.in_(quiz_ids)).all()
    ] if quiz_ids else []
    document_ids = [
        document_id
        for (document_id,) in db.query(Document.id).filter(Document.course_id == course_id).all()
    ]
    record_activity(
        db,
        admin,
        "deleted",
        "course",
        course.id,
        f"Deleted course {course.course_code} (#{course.id}).",
    )
    if attempt_ids:
        db.query(QuizAttemptAnswer).filter(QuizAttemptAnswer.attempt_id.in_(attempt_ids)).delete(
            synchronize_session=False
        )
    if quiz_ids:
        db.query(QuizQuestion).filter(QuizQuestion.quiz_id.in_(quiz_ids)).delete(synchronize_session=False)
        db.query(QuizAttempt).filter(QuizAttempt.quiz_id.in_(quiz_ids)).delete(synchronize_session=False)
        db.query(Quiz).filter(Quiz.id.in_(quiz_ids)).delete(synchronize_session=False)
    if document_ids:
        db.query(Report).filter(Report.document_id.in_(document_ids)).delete(synchronize_session=False)
        db.query(Document).filter(Document.id.in_(document_ids)).delete(synchronize_session=False)
    db.query(CourseAnnouncement).filter(CourseAnnouncement.course_id == course_id).delete(
        synchronize_session=False
    )
    db.query(CourseEnrollment).filter(CourseEnrollment.course_id == course_id).delete(
        synchronize_session=False
    )
    db.delete(course)
    commit_or_conflict(db)
    upload_root = UPLOAD_DIR.resolve()
    for raw_path in document_paths:
        file_path = Path(raw_path).resolve()
        if file_path.is_relative_to(upload_root):
            try:
                file_path.unlink(missing_ok=True)
            except OSError:
                logger.warning("Could not remove uploaded file after deleting course %s: %s", course_id, file_path)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
