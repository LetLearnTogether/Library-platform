from datetime import datetime
from typing import Generic, Literal, TypeVar

from pydantic import (
    AnyHttpUrl,
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    TypeAdapter,
    ValidationError,
    field_validator,
    model_validator,
)

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


class PublicSettingsResponse(APIModel):
    announcement_enabled: bool
    announcement_message: str | None
    support_contact: str | None
    registration_enabled: bool
    uploads_enabled: bool


class AdminSettingsResponse(PublicSettingsResponse):
    updated_at: datetime


class ActivityLogResponse(APIModel):
    id: int
    actor_id: int | None
    actor_name: str
    actor_role: UserRole
    action: str
    entity_type: str
    entity_id: int | None
    summary: str
    created_at: datetime


class AdminSettingsUpdate(APIModel):
    announcement_enabled: bool | None = None
    announcement_message: str | None = Field(default=None, max_length=500)
    support_contact: str | None = Field(default=None, max_length=254)
    registration_enabled: bool | None = None
    uploads_enabled: bool | None = None

    @field_validator("announcement_message")
    @classmethod
    def normalize_announcement(cls, value: str | None):
        return value.strip() if value and value.strip() else None

    @field_validator("support_contact")
    @classmethod
    def validate_support_contact(cls, value: str | None):
        if value is None or not value.strip():
            return None
        contact = value.strip()
        try:
            return str(TypeAdapter(EmailStr).validate_python(contact)).lower()
        except ValidationError:
            try:
                url = TypeAdapter(AnyHttpUrl).validate_python(contact)
            except ValidationError:
                raise ValueError("Support contact must be a valid email address or an HTTP(S) URL.")
            if url.username or url.password:
                raise ValueError("Support contact URLs cannot include credentials.")
            return str(url)

    @model_validator(mode="after")
    def require_changes(self):
        if not self.model_fields_set:
            raise ValueError("At least one setting must be provided.")
        for field in ("announcement_enabled", "registration_enabled", "uploads_enabled"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null.")
        return self


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
    lecturer_name: str | None


class CourseAnnouncementInput(APIModel):
    title: str = Field(min_length=1, max_length=160)
    body: str = Field(min_length=1, max_length=5000)

    @field_validator("title", "body")
    @classmethod
    def strip_announcement_text(cls, value: str):
        normalized = value.strip()
        if not normalized:
            raise ValueError("Announcement text cannot be blank.")
        return normalized


class CourseAnnouncementResponse(APIModel):
    id: int
    course_id: int
    author_id: int
    author_name: str
    title: str
    body: str
    created_at: datetime
    updated_at: datetime


class LecturerCoursePerformance(APIModel):
    course: CourseResponse
    quiz_count: int
    attempt_count: int
    average_score: float | None


class LecturerChallengingQuestion(APIModel):
    course_code: str
    quiz_title: str
    question_order: int
    question_text: str
    total_responses: int
    correct_count: int
    correct_percentage: float


class LecturerPerformanceResponse(APIModel):
    quiz_count: int
    attempt_count: int
    average_score: float | None
    courses: list[LecturerCoursePerformance]
    challenging_questions: list[LecturerChallengingQuestion]


class StudentCourseEnrollment(APIModel):
    course: CourseResponse
    enrolled_at: datetime
    quiz_count: int
    quizzes_attempted: int
    attempt_count: int
    average_score: float | None
    last_attempt_at: datetime | None


class CourseRosterQuizProgress(APIModel):
    quiz_id: int
    quiz_title: str
    attempt_count: int
    best_score: float | None
    latest_score: float | None
    last_attempt_at: datetime | None


class CourseRosterStudent(APIModel):
    student_id: int
    student_name: str
    enrolled_at: datetime
    attempt_count: int
    quizzes_attempted: int
    average_score: float | None
    last_attempt_at: datetime | None
    quizzes: list[CourseRosterQuizProgress]


class CourseRosterResponse(APIModel):
    course: CourseResponse
    quiz_count: int
    page: int
    page_size: int
    total_items: int
    total_pages: int
    students: list[CourseRosterStudent]


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


class ReportDocumentSummary(APIModel):
    id: int
    filename: str
    document_type: DocumentType
    status: DocumentStatus
    course: CourseResponse


class ReportResponse(APIModel):
    id: int
    document_id: int
    submitted_by: int
    submitter_name: str
    document: ReportDocumentSummary
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


class QuizAnswerOptionPerformance(APIModel):
    option_text: str
    selection_count: int
    percentage: float
    is_correct: bool


class QuizQuestionPerformance(APIModel):
    question_order: int
    question_text: str
    total_responses: int
    correct_count: int
    correct_percentage: float | None
    options: list[QuizAnswerOptionPerformance]


class QuizResultAttempt(APIModel):
    id: int
    student_name: str
    score: float
    total_questions: int
    attempted_at: datetime


class QuizResultsResponse(APIModel):
    quiz_id: int
    quiz_title: str
    course: CourseResponse
    attempt_count: int
    average_score: float | None
    page: int
    page_size: int
    total_pages: int
    attempts: list[QuizResultAttempt]
    questions: list[QuizQuestionPerformance]


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
