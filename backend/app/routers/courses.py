from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.models import Course, User
from app.schemas.api import CourseCreate, CourseResponse, CourseUpdate, PageResponse, Semester
from app.services.api import commit_or_conflict, flush_or_conflict, paginate, record_activity

router = APIRouter(prefix="/courses", tags=["Courses"])
admin_only = require_roles("Admin")


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
    record_activity(
        db,
        admin,
        "deleted",
        "course",
        course.id,
        f"Deleted course {course.course_code} (#{course.id}).",
    )
    db.delete(course)
    commit_or_conflict(db, "This course contains linked content and cannot be deleted.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
