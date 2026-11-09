from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models import ActivityLog, Document, User
from app.schemas.api import ActivityLogResponse, PageResponse
from app.services.api import paginate

router = APIRouter(prefix="/activity", tags=["Admin Activity"])
admin_only = require_roles("Admin")


@router.get("/downloads/mine")
def my_downloads(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = (
        db.query(ActivityLog)
        .filter(ActivityLog.actor_id == user.id, ActivityLog.action == "download", ActivityLog.entity_type == "document")
        .order_by(ActivityLog.created_at.desc())
        .limit(limit)
        .all()
    )
    documents = {document.id: document for document in db.query(Document).filter(Document.id.in_([row.entity_id for row in rows])).all()} if rows else {}
    return [
        {
            "document_id": row.entity_id,
            "filename": documents[row.entity_id].filename if row.entity_id in documents else "Removed document",
            "course_code": documents[row.entity_id].course.course_code if row.entity_id in documents else None,
            "downloaded_at": row.created_at,
        }
        for row in rows
    ]


@router.get("/analytics/documents")
def document_analytics(
    db: Session = Depends(get_db),
    _admin: User = Depends(admin_only),
):
    downloads = db.query(ActivityLog).filter(ActivityLog.action == "download", ActivityLog.entity_type == "document").all()
    counts: dict[int, int] = {}
    for row in downloads:
        if row.entity_id:
            counts[row.entity_id] = counts.get(row.entity_id, 0) + 1

    documents = db.query(Document).filter(Document.id.in_(counts.keys())).all() if counts else []
    popular_documents = sorted(
        [
            {
                "document_id": document.id,
                "filename": document.filename,
                "course_code": document.course.course_code,
                "downloads": counts[document.id],
            }
            for document in documents
        ],
        key=lambda item: item["downloads"],
        reverse=True,
    )[:10]

    course_counts: dict[str, int] = {}
    for document in documents:
        course_counts[document.course.course_code] = course_counts.get(document.course.course_code, 0) + counts[document.id]
    popular_courses = [
        {"course_code": code, "downloads": total}
        for code, total in sorted(course_counts.items(), key=lambda item: item[1], reverse=True)
    ][:10]
    return {
        "total_downloads": len(downloads),
        "popular_documents": popular_documents,
        "popular_courses": popular_courses,
    }


@router.get("", response_model=PageResponse[ActivityLogResponse])
def list_activity(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin: User = Depends(admin_only),
):
    return paginate(db.query(ActivityLog), page, page_size)
