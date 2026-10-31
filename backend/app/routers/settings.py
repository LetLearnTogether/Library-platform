from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.models import User
from app.schemas.api import AdminSettingsResponse, AdminSettingsUpdate, PublicSettingsResponse
from app.services.api import commit_or_conflict, record_activity, require_platform_settings

router = APIRouter(prefix="/settings", tags=["Settings"])
admin_only = require_roles("Admin")


@router.get("/public", response_model=PublicSettingsResponse)
def get_public_settings(db: Session = Depends(get_db)):
    return require_platform_settings(db)


@router.get("", response_model=AdminSettingsResponse)
def get_admin_settings(db: Session = Depends(get_db), _admin: User = Depends(admin_only)):
    return require_platform_settings(db)


@router.patch("", response_model=AdminSettingsResponse)
def update_admin_settings(
    payload: AdminSettingsUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(admin_only),
):
    settings = require_platform_settings(db)
    changes = payload.model_dump(exclude_unset=True)
    announcement_enabled = changes.get("announcement_enabled", settings.announcement_enabled)
    announcement_message = changes.get("announcement_message", settings.announcement_message)
    if announcement_enabled and not announcement_message:
        raise HTTPException(status_code=422, detail="An announcement message is required when the banner is enabled.")

    changed_fields = [field for field, value in changes.items() if getattr(settings, field) != value]
    for field, value in changes.items():
        setattr(settings, field, value)
    settings.updated_by = admin.id
    if changed_fields:
        record_activity(
            db,
            admin,
            "updated",
            "platform_settings",
            settings.id,
            f"Updated platform settings: {', '.join(changed_fields)}.",
        )
    commit_or_conflict(db, "The platform settings could not be saved.")
    db.refresh(settings)
    return settings
