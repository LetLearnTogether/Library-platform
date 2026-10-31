from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.models import Course, CourseAnnouncement, User
from app.schemas.api import CourseAnnouncementInput, CourseAnnouncementResponse
from app.services.api import commit_or_conflict, require_course_lecturer

router = APIRouter(tags=["Course announcements"])
editor_roles = require_roles("Lecturer", "Admin")


def require_announcement_course(db: Session, course_id: int) -> Course:
    course = db.get(Course, course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="The requested course does not exist.")
    return course


def authorize_course_editor(course: Course, editor: User):
    if editor.role == "Lecturer":
        require_course_lecturer(course, editor.id)


def announcement_output(announcement: CourseAnnouncement) -> dict:
    return {
        "id": announcement.id,
        "course_id": announcement.course_id,
        "author_id": announcement.author_id,
        "author_name": announcement.author.name,
        "title": announcement.title,
        "body": announcement.body,
        "created_at": announcement.created_at,
        "updated_at": announcement.updated_at,
    }


@router.get("/courses/{course_id}/announcements", response_model=list[CourseAnnouncementResponse])
def list_course_announcements(course_id: int, db: Session = Depends(get_db)):
    require_announcement_course(db, course_id)
    announcements = (
        db.query(CourseAnnouncement)
        .options(joinedload(CourseAnnouncement.author))
        .filter(CourseAnnouncement.course_id == course_id)
        .order_by(CourseAnnouncement.created_at.desc(), CourseAnnouncement.id.desc())
        .all()
    )
    return [announcement_output(item) for item in announcements]


@router.get(
    "/courses/{course_id}/announcements/manage",
    response_model=list[CourseAnnouncementResponse],
)
def list_managed_course_announcements(
    course_id: int,
    db: Session = Depends(get_db),
    editor: User = Depends(editor_roles),
):
    course = require_announcement_course(db, course_id)
    authorize_course_editor(course, editor)
    announcements = (
        db.query(CourseAnnouncement)
        .options(joinedload(CourseAnnouncement.author))
        .filter(CourseAnnouncement.course_id == course_id)
        .order_by(CourseAnnouncement.created_at.desc(), CourseAnnouncement.id.desc())
        .all()
    )
    return [announcement_output(item) for item in announcements]


@router.post(
    "/courses/{course_id}/announcements",
    response_model=CourseAnnouncementResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_course_announcement(
    course_id: int,
    payload: CourseAnnouncementInput,
    db: Session = Depends(get_db),
    editor: User = Depends(editor_roles),
):
    course = require_announcement_course(db, course_id)
    authorize_course_editor(course, editor)
    announcement = CourseAnnouncement(
        course_id=course.id,
        author_id=editor.id,
        title=payload.title,
        body=payload.body,
    )
    db.add(announcement)
    commit_or_conflict(db)
    db.refresh(announcement)
    db.refresh(announcement, attribute_names=["author"])
    return announcement_output(announcement)


@router.put(
    "/course-announcements/{announcement_id}",
    response_model=CourseAnnouncementResponse,
)
def update_course_announcement(
    announcement_id: int,
    payload: CourseAnnouncementInput,
    db: Session = Depends(get_db),
    editor: User = Depends(editor_roles),
):
    announcement = (
        db.query(CourseAnnouncement)
        .options(joinedload(CourseAnnouncement.author), joinedload(CourseAnnouncement.course))
        .filter(CourseAnnouncement.id == announcement_id)
        .first()
    )
    if announcement is None:
        raise HTTPException(status_code=404, detail="The requested announcement does not exist.")
    authorize_course_editor(announcement.course, editor)
    announcement.title = payload.title
    announcement.body = payload.body
    commit_or_conflict(db)
    db.refresh(announcement)
    return announcement_output(announcement)


@router.delete("/course-announcements/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    editor: User = Depends(editor_roles),
):
    announcement = (
        db.query(CourseAnnouncement)
        .options(joinedload(CourseAnnouncement.course))
        .filter(CourseAnnouncement.id == announcement_id)
        .first()
    )
    if announcement is None:
        raise HTTPException(status_code=404, detail="The requested announcement does not exist.")
    authorize_course_editor(announcement.course, editor)
    db.delete(announcement)
    commit_or_conflict(db)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
