from itertools import count
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

router = APIRouter(prefix="/documents", tags=["Documents"])

ALLOWED_DOCUMENT_TYPES = {
    "Midterm",
    "Final",
    "Assignment",
    "Quiz",
    "Syllabus",
}
ALLOWED_FILE_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}

# Practice data only. This resets whenever the server restarts.
VERIFIED_DOCUMENTS = [
    {
        "id": 1,
        "course_id": 1,
        "course_code": "CS101",
        "course_title": "Introduction to Programming",
        "year": 2025,
        "semester": "First",
        "document_type": "Final",
        "status": "Verified",
    }
]

PENDING_UPLOADS = []
upload_ids = count(start=2)


@router.get("")
def list_documents(
    course_id: int | None = None,
    year: int | None = None,
    semester: str | None = None,
) -> dict[str, list[dict[str, str | int]]]:
    """List verified documents, with optional course filters."""

    documents = VERIFIED_DOCUMENTS

    if course_id is not None:
        documents = [
            document for document in documents
            if document["course_id"] == course_id
        ]

    if year is not None:
        documents = [
            document for document in documents
            if document["year"] == year
        ]

    if semester is not None:
        documents = [
            document for document in documents
            if document["semester"].lower() == semester.lower()
        ]

    return {"documents": documents}


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    course_id: int = Form(...),
    document_type: str = Form(...),
) -> dict[str, str | int]:
    """Practice upload endpoint; it does not store the file permanently."""

    filename = file.filename or ""
    extension = Path(filename).suffix.lower()

    if not filename or extension not in ALLOWED_FILE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Upload a PDF, PNG, or JPG file.",
        )

    if document_type not in ALLOWED_DOCUMENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid document type.",
        )

    if course_id < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Course ID must be a positive number.",
        )

    upload_id = next(upload_ids)
    PENDING_UPLOADS.append(
        {
            "id": upload_id,
            "course_id": course_id,
            "document_type": document_type,
            "filename": filename,
            "status": "Under Review",
        }
    )

    await file.close()

    return {
        "id": upload_id,
        "status": "Under Review",
        "message": "Upload received and waiting for review.",
    }