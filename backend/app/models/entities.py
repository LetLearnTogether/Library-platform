from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "Users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="Student", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class PlatformSettings(Base):
    __tablename__ = "Platform_Settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    announcement_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    announcement_message: Mapped[str | None] = mapped_column(String(500), nullable=True)
    support_contact: Mapped[str | None] = mapped_column(String(254), nullable=True)
    registration_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    uploads_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    updated_by: Mapped[int | None] = mapped_column(ForeignKey("Users.id"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class ActivityLog(Base):
    __tablename__ = "Admin_Activity_Log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    actor_id: Mapped[int | None] = mapped_column(
        ForeignKey("Users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    actor_name: Mapped[str] = mapped_column(String(100), nullable=False)
    actor_role: Mapped[str] = mapped_column(String(20), nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Course(Base):
    __tablename__ = "Courses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    course_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    course_title: Mapped[str] = mapped_column(String(255), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    semester: Mapped[str] = mapped_column(String(20), nullable=False)
    lecturer_id: Mapped[int | None] = mapped_column(ForeignKey("Users.id"), nullable=True)

    lecturer: Mapped[User | None] = relationship(foreign_keys=[lecturer_id], lazy="joined")

    @property
    def lecturer_name(self) -> str | None:
        return self.lecturer.name if self.lecturer else None


class CourseEnrollment(Base):
    __tablename__ = "Course_Enrollments"
    __table_args__ = (UniqueConstraint("course_id", "student_id", name="uq_course_enrollment_student"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    course_id: Mapped[int] = mapped_column(
        ForeignKey("Courses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[int] = mapped_column(
        ForeignKey("Users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    enrolled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    course: Mapped[Course] = relationship()
    student: Mapped[User] = relationship()


class CourseAnnouncement(Base):
    __tablename__ = "Course_Announcements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    course_id: Mapped[int] = mapped_column(
        ForeignKey("Courses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    author_id: Mapped[int] = mapped_column(ForeignKey("Users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    course: Mapped[Course] = relationship()
    author: Mapped[User] = relationship()


class Document(Base):
    __tablename__ = "Documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("Courses.id"), nullable=False, index=True)
    document_type: Mapped[str] = mapped_column(String(30), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="Under Review", nullable=False, index=True)
    verification_token: Mapped[str | None] = mapped_column(String(100), unique=True, index=True, nullable=True)
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("Users.id"), nullable=False)
    approved_by: Mapped[int | None] = mapped_column(ForeignKey("Users.id"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_by: Mapped[int | None] = mapped_column(ForeignKey("Users.id"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    course: Mapped[Course] = relationship()
    uploader: Mapped[User] = relationship(foreign_keys=[uploaded_by])
    approver: Mapped[User | None] = relationship(foreign_keys=[approved_by])


class Quiz(Base):
    __tablename__ = "Quizzes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("Courses.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_by: Mapped[int] = mapped_column(ForeignKey("Users.id"), nullable=False)

    course: Mapped[Course] = relationship()
    creator: Mapped[User] = relationship()
    questions: Mapped[list["QuizQuestion"]] = relationship(
        back_populates="quiz", cascade="all, delete-orphan", order_by="QuizQuestion.id"
    )


class QuizQuestion(Base):
    __tablename__ = "Quiz_Questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    quiz_id: Mapped[int] = mapped_column(ForeignKey("Quizzes.id", ondelete="CASCADE"), nullable=False, index=True)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    correct_answer_index: Mapped[int] = mapped_column(Integer, nullable=False)

    quiz: Mapped[Quiz] = relationship(back_populates="questions")


class QuizAttempt(Base):
    __tablename__ = "Quiz_Attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("Users.id"), nullable=False, index=True)
    quiz_id: Mapped[int] = mapped_column(ForeignKey("Quizzes.id"), nullable=False, index=True)
    score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False)
    attempted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    quiz: Mapped[Quiz] = relationship()
    answers: Mapped[list["QuizAttemptAnswer"]] = relationship(
        back_populates="attempt", cascade="all, delete-orphan"
    )


class QuizAttemptAnswer(Base):
    __tablename__ = "Quiz_Attempt_Answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    attempt_id: Mapped[int] = mapped_column(
        ForeignKey("Quiz_Attempts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    question_order: Mapped[int] = mapped_column(Integer, nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    selected_option_index: Mapped[int] = mapped_column(Integer, nullable=False)
    correct_option_index: Mapped[int] = mapped_column(Integer, nullable=False)

    attempt: Mapped[QuizAttempt] = relationship(back_populates="answers")


class Report(Base):
    __tablename__ = "Reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("Documents.id"), nullable=False, index=True)
    submitted_by: Mapped[int] = mapped_column(ForeignKey("Users.id"), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="Open", nullable=False, index=True)
    moderator_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
