from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DocumentResponse(BaseModel):
    id: int
    course_id: int
    document_type: str
    file_path: str
    status: str
    verification_token: Optional[str] = None
    uploaded_by: int
    created_at: datetime

    class Config:
        from_attributes = True

class ReviewRequest(BaseModel):
    action: str  # "approve", "reject", or "revoke"