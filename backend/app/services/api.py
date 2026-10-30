from math import ceil
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Query, Session

from app.core.config import PUBLIC_API_BASE_URL, PUBLIC_FRONTEND_URL
from app.models import Course, Document, Quiz, Report
from app.schemas.api import CourseResponse, DocumentResponse, QuizEditorResponse, QuizResponse, ReportResponse


def paginate(query: Query, page: int, page_size: int) -> dict[str, Any]:
    total_items = query.order_by(None).count()
    entity = query.column_descriptions[0].get("entity")
    ordered_query = query.order_by(entity.id.desc()) if entity is not None else query
    items = ordered_query.offset((page - 1) * page_size).limit(page_size).all()
    return {
        "page": page,
        "page_size": page_size,
        "total_items": total_items,
        "total_pages": ceil(total_items / page_size) if total_items else 0,
        "items": items,
    }


def course_output(course: Course) -> dict[str, Any]:
    return CourseResponse.model_validate(course).model_dump()


def document_output(document: Document) -> dict[str, Any]:
    return DocumentResponse(
        id=document.id,
        course_id=document.course_id,
        course=course_output(document.course),
        document_type=document.document_type,
        filename=document.filename,
        status=document.status,
        uploaded_by=document.uploaded_by,
        approved_by=document.approved_by,
        approved_at=document.approved_at,
        reviewed_by=document.reviewed_by,
        reviewed_at=document.reviewed_at,
        review_note=document.review_note,
        verification_token=document.verification_token,
        verification_url=f"{PUBLIC_FRONTEND_URL}/verify/{document.verification_token}" if document.verification_token else None,
        qr_code_url=f"{PUBLIC_API_BASE_URL}/verification/{document.verification_token}/qr" if document.verification_token else None,
        created_at=document.created_at,
        updated_at=document.updated_at,
    ).model_dump()


def quiz_output(quiz: Quiz) -> dict[str, Any]:
    return QuizResponse(
        id=quiz.id,
        course_id=quiz.course_id,
        course=course_output(quiz.course),
        title=quiz.title,
        type=quiz.type,
        is_published=quiz.is_published,
        questions=[
            {"id": question.id, "question_text": question.question_text, "options": question.options}
            for question in quiz.questions
        ],
    ).model_dump()


def quiz_editor_output(quiz: Quiz) -> dict[str, Any]:
    return QuizEditorResponse(
        id=quiz.id,
        course_id=quiz.course_id,
        course=course_output(quiz.course),
        title=quiz.title,
        type=quiz.type,
        is_published=quiz.is_published,
        questions=[
            {
                "id": question.id,
                "question_text": question.question_text,
                "options": question.options,
                "correct_answer_index": question.correct_answer_index,
            }
            for question in quiz.questions
        ],
    ).model_dump()


def report_output(report: Report) -> dict[str, Any]:
    return ReportResponse.model_validate(report).model_dump()


def commit_or_conflict(db: Session, message: str = "The change conflicts with existing data.") -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=message) from exc


def require_course(db: Session, course_id: int) -> Course:
    course = db.get(Course, course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="The requested course does not exist.")
    return course


def require_document(db: Session, document_id: int) -> Document:
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="The requested document does not exist.")
    return document


def require_quiz(db: Session, quiz_id: int) -> Quiz:
    quiz = db.get(Quiz, quiz_id)
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="The requested quiz does not exist.")
    return quiz


def require_report(db: Session, report_id: int) -> Report:
    report = db.get(Report, report_id)
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="The requested report does not exist.")
    return report


def require_course_lecturer(course: Course, user_id: int) -> None:
    if course.lecturer_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not assigned to this course.")


def search_text(query: Query, column, value: str | None) -> Query:
    if value:
        return query.filter(func.lower(column).contains(value.lower()))
    return query
