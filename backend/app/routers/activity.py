from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.models import ActivityLog, User
from app.schemas.api import ActivityLogResponse, PageResponse
from app.services.api import paginate

router = APIRouter(prefix="/activity", tags=["Admin Activity"])
admin_only = require_roles("Admin")


@router.get("", response_model=PageResponse[ActivityLogResponse])
def list_activity(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin: User = Depends(admin_only),
):
    return paginate(db.query(ActivityLog), page, page_size)
