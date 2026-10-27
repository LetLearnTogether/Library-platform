from enum import Enum
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from fastapi import UploadFile

# --- Enums (Matching SRS Section 6 & PRD Section 2) ---

class DocumentTypeEnum(str, Enum):
    midterm = "Midterm"
    final = "Final"
    quiz = "Quiz"
    assignment = "Assignment"
    syllabus = "Syllabus"

class DocumentStatusEnum(str, Enum):
    under_review = "Under Review"
    verified = "Verified"
    rejected = "Rejected"

# --- Schemas ---

class DocumentCreate(BaseModel):
    """Schema for creating a new document request (Metadata only)."""
    course_id: int = Field(..., description="ID of the course this document belongs to")
    document_type: DocumentTypeEnum
    title: str = Field(..., min_length=3, max_length=255, description="Descriptive title of the document")
    year: Optional[int] = Field(None, description="Academic year, e.g., 2025")
    semester: Optional[str] = Field(None, description="e.g., 'First Semester'")
    
    # NOTE: In FastAPI, the actual file is passed as a separate parameter in the router 
    # (e.g., file: UploadFile = File(...)) rather than inside the JSON BaseModel.

class DocumentResponse(BaseModel):
    """Schema returned to the client after successful creation or retrieval."""
    model_config = ConfigDict(from_attributes=True) # Allows conversion from SQLAlchemy models
    
    id: int
    course_id: int
    document_type: DocumentTypeEnum
    title: str
    file_path: str
    status: DocumentStatusEnum
    verification_token: Optional[str] = None
    uploaded_at: datetime

class DocumentSearchQuery(BaseModel):
    """Schema for GET /documents query parameters (Aligns with NFR-PERF-02 & FR-08)"""
    course_id: Optional[int] = None
    year: Optional[int] = None
    semester: Optional[str] = None
    document_type: Optional[DocumentTypeEnum] = None
    keyword: Optional[str] = Field(None, max_length=100, description="Search in title or metadata")
    
    # Pagination (NFR-PERF-02)
    page: int = Field(default=1, ge=1, description="Page number, starting at 1")
    limit: int = Field(default=20, ge=1, le=100, description="Items per page, max 100")