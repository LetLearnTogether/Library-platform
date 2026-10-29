from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models import Document, Report, User
from app.schemas.api import PageResponse, ReportCreate, ReportResponse, ReportStatus, ReportUpdate
from app.services.api import commit_or_conflict, paginate, report_output, require_document, require_report

router = APIRouter(tags=["Reports"])
moderator_only = require_roles("Moderator", "Admin")


@router.post("/documents/{document_id}/reports", response_model=ReportResponse, status_code=201)
def create_report(
    document_id: int,
    payload: ReportCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_document(db, document_id)
    report = Report(document_id=document_id, submitted_by=user.id, reason=payload.reason.strip())
    db.add(report)
    commit_or_conflict(db)
    db.refresh(report)
    return report


@router.get("/reports", response_model=PageResponse[ReportResponse])
def list_reports(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    report_status: ReportStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    _moderator: User = Depends(moderator_only),
):
    if page < 1 or not 1 <= page_size <= 100:
        raise HTTPException(status_code=422, detail="page must be positive and page_size must be between 1 and 100.")
    query = db.query(Report)
    if report_status:
        query = query.filter(Report.status == report_status)
    result = paginate(query, page, page_size)
    result["items"] = [report_output(report) for report in result["items"]]
    return result


@router.put("/reports/{report_id}", response_model=ReportResponse)
def update_report(
    report_id: int,
    payload: ReportUpdate,
    db: Session = Depends(get_db),
    _moderator: User = Depends(moderator_only),
):
    report = require_report(db, report_id)
    report.status = payload.status
    report.moderator_note = payload.moderator_note
    commit_or_conflict(db)
    db.refresh(report)
    return report
