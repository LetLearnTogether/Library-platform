from datetime import datetime
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

UserRole = Literal["Student", "Lecturer", "Moderator", "Admin"]
Semester = Literal["First", "Second"]
DocumentType = Literal["Midterm", "Final", "Assignment", "Quiz", "Syllabus"]
DocumentStatus = Literal["Under Review", "Verified", "Rejected", "Revoked"]
ReportStatus = Literal["Open", "In Review", "Resolved", "Dismissed"]


class APIModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")


class RegisterRequest(APIModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def bcrypt_password_limit(cls, value: str):
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must not exceed 72 UTF-8 bytes.")
        return value


class UserCreate(RegisterRequest):
    role: UserRole


class LoginRequest(APIModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def bcrypt_password_limit(cls, value: str):
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must not exceed 72 UTF-8 bytes.")
        return value


class TokenResponse(APIModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int


class UserUpdate(APIModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    email: EmailStr | None = None
    role: UserRole | None = None

    @model_validator(mode="after")
    def reject_null_values(self):
        for field in ("name", "email", "role"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self


class UserResponse(APIModel):
    id: int
    name: str
    email: EmailStr
    role: UserRole
    created_at: datetime


class CourseCreate(APIModel):
    course_code: str = Field(min_length=1, max_length=50)
    course_title: str = Field(min_length=1, max_length=255)
    year: int = Field(ge=1900, le=2200)
    semester: Semester
    lecturer_id: int | None = Field(default=None, gt=0)


class CourseUpdate(APIModel):
    course_code: str | None = Field(default=None, min_length=1, max_length=50)
    course_title: str | None = Field(default=None, min_length=1, max_length=255)
    year: int | None = Field(default=None, ge=1900, le=2200)
    semester: Semester | None = None
    lecturer_id: int | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def require_changes(self):
        if not self.model_fields_set:
            raise ValueError("At least one field must be provided")
        for field in ("course_code", "course_title", "year", "semester"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self


class CourseResponse(APIModel):
    id: int
    course_code: str
    course_title: str
    year: int
    semester: Semester
    lecturer_id: int | None


class DocumentReviewRequest(APIModel):
    action: Literal["approve", "reject"]
    review_note: str | None = Field(default=None, max_length=1000)


class DocumentResponse(APIModel):
    id: int
    course_id: int
    course: CourseResponse
    document_type: DocumentType
    filename: str
    status: DocumentStatus
    uploaded_by: int
    approved_by: int | None
    approved_at: datetime | None
    reviewed_by: int | None
    reviewed_at: datetime | None
    review_note: str | None
    verification_token: str | None
    verification_url: str | None
    qr_code_url: str | None
    created_at: datetime
    updated_at: datetime


class VerificationResponse(APIModel):
    document_id: int
    course_code: str
    course_title: str
    document_type: DocumentType
    approved_at: datetime
    status: Literal["Verified", "Revoked"]


class ReportCreate(APIModel):
    reason: str = Field(min_length=1, max_length=2000)


class ReportUpdate(APIModel):
    status: ReportStatus
    moderator_note: str | None = Field(default=None, max_length=2000)


class ReportResponse(APIModel):
    id: int
    document_id: int
    submitted_by: int
    reason: str
    status: ReportStatus
    moderator_note: str | None
    created_at: datetime
    updated_at: datetime


class QuizQuestionInput(APIModel):
    question_text: str = Field(min_length=1, max_length=5000)
    options: list[str] = Field(min_length=2, max_length=10)
    correct_answer_index: int = Field(ge=0)

    @model_validator(mode="after")
    def valid_answer_index(self):
        if self.correct_answer_index >= len(self.options):
            raise ValueError("correct_answer_index must refer to an existing option")
        if any(not option.strip() or len(option) > 1000 for option in self.options):
            raise ValueError("Each option must contain 1 to 1000 characters")
        return self


class QuizQuestionResponse(APIModel):
    id: int
    question_text: str
    options: list[str]


class QuizQuestionEditorResponse(QuizQuestionResponse):
    correct_answer_index: int


class QuizCreate(APIModel):
    course_id: int = Field(gt=0)
    title: str = Field(min_length=1, max_length=255)
    type: str | None = Field(default=None, max_length=50)
    is_published: bool = False
    questions: list[QuizQuestionInput] = Field(min_length=1)


class QuizReplace(APIModel):
    title: str = Field(min_length=1, max_length=255)
    type: str | None = Field(default=None, max_length=50)
    is_published: bool
    questions: list[QuizQuestionInput] = Field(min_length=1)


class QuizResponse(APIModel):
    id: int
    course_id: int
    course: CourseResponse
    title: str
    type: str | None
    is_published: bool
    questions: list[QuizQuestionResponse]


class QuizEditorResponse(APIModel):
    id: int
    course_id: int
    course: CourseResponse
    title: str
    type: str | None
    is_published: bool
    questions: list[QuizQuestionEditorResponse]


class QuizQuestionAnswer(APIModel):
    question_id: int = Field(gt=0)
    selected_option_index: int = Field(ge=0)


class QuizAttemptCreate(APIModel):
    answers: list[QuizQuestionAnswer]


class QuizAttemptResult(APIModel):
    id: int
    quiz_id: int
    score: float
    total_questions: int
    attempted_at: datetime


class QuizAttemptResponse(QuizAttemptResult):
    quiz_title: str


class PageMetadata(APIModel):
    page: int
    page_size: int
    total_items: int
    total_pages: int


T = TypeVar("T")


class PageResponse(APIModel, Generic[T]):
    page: int
    page_size: int
    total_items: int
    total_pages: int
    items: list[T]
