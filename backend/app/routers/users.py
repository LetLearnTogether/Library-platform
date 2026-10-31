from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.models import User
from app.core.security import hash_password
from app.schemas.api import PageResponse, UserCreate, UserResponse, UserRole, UserUpdate
from app.services.api import commit_or_conflict, flush_or_conflict, paginate, record_activity

router = APIRouter(prefix="/users", tags=["Users"])
admin_only = require_roles("Admin")


@router.get("", response_model=PageResponse[UserResponse])
def list_users(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    role: UserRole | None = None,
    db: Session = Depends(get_db),
    _admin: User = Depends(admin_only),
):
    if page < 1 or not 1 <= page_size <= 100:
        raise HTTPException(status_code=422, detail="page must be positive and page_size must be between 1 and 100.")
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    result = paginate(query, page, page_size)
    result["items"] = [UserResponse.model_validate(user).model_dump() for user in result["items"]]
    return result


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(admin_only),
):
    email = str(payload.email).lower()
    if db.query(User).filter(func.lower(User.email) == email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = User(
        name=payload.name.strip(),
        email=email,
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    flush_or_conflict(db, "An account with this email already exists.")
    record_activity(db, admin, "created", "user", user.id, f"Created account #{user.id} with role {user.role}.")
    commit_or_conflict(db, "An account with this email already exists.")
    db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db), _admin: User = Depends(admin_only)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="The requested user does not exist.")
    return user


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(admin_only),
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="The requested user does not exist.")
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=422, detail="At least one field must be provided.")
    changed_fields = [field for field, value in changes.items() if getattr(user, field) != value]
    if changed_fields:
        if "role" in changed_fields:
            summary = f"Changed account #{user.id} role from {user.role} to {changes['role']}."
        else:
            summary = f"Updated account #{user.id} fields: {', '.join(changed_fields)}."
        record_activity(db, admin, "updated", "user", user.id, summary)
    if "name" in changes and changes["name"] is not None:
        user.name = changes["name"].strip()
    if "email" in changes and changes["email"] is not None:
        user.email = str(changes["email"]).lower()
    if "role" in changes and changes["role"] is not None:
        user.role = changes["role"]
    commit_or_conflict(db, "The email address is already in use.")
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="The requested user does not exist.")
    if user.id == admin.id:
        raise HTTPException(status_code=409, detail="Administrators cannot delete their own active account.")
    record_activity(db, admin, "deleted", "user", user.id, f"Deleted account #{user.id}.")
    db.delete(user)
    commit_or_conflict(db, "This account is referenced by other records and cannot be deleted.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
