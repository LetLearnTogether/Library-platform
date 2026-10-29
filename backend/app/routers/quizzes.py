from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload, selectinload

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models import Course, Quiz, QuizAttempt, QuizQuestion, User
from app.schemas.api import (
    QuizAttemptCreate,
    QuizAttemptResponse,
    QuizAttemptResult,
    QuizCreate,
    QuizQuestionInput,
    QuizReplace,
    QuizResponse,
    PageResponse,
    Semester,
    QuizAttemptResponse,
)
from app.services.api import (
    commit_or_conflict,
    paginate,
    quiz_output,
    require_course,
    require_course_lecturer,
    require_quiz,
)

router = APIRouter(tags=["Quizzes", "Quiz attempts"])
creator_roles = require_roles("Lecturer", "Admin")
student_only = require_roles("Student")


def validate_pagination(page: int, page_size: int):
    if page < 1 or not 1 <= page_size <= 100:
        raise HTTPException(status_code=422, detail="page must be positive and page_size must be between 1 and 100.")


def set_questions(quiz: Quiz, questions: list[QuizQuestionInput]):
    quiz.questions.clear()
    quiz.questions.extend(
        QuizQuestion(
            question_text=question.question_text.strip(),
            options=[option.strip() for option in question.options],
            correct_answer_index=question.correct_answer_index,
        )
        for question in questions
    )


def authorize_quiz_editor(quiz: Quiz, user: User):
    if user.role == "Lecturer":
        require_course_lecturer(quiz.course, user.id)


@router.get("/quizzes", response_model=PageResponse[QuizResponse])
def list_quizzes(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    course_id: int | None = Query(default=None, ge=1),
    year: int | None = Query(default=None, ge=1900, le=2200),
    semester: Semester | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
):
    validate_pagination(page, page_size)
    query = (
        db.query(Quiz)
        .join(Course)
        .options(joinedload(Quiz.course), selectinload(Quiz.questions))
        .filter(Quiz.is_published.is_(True))
    )
    if course_id is not None:
        query = query.filter(Quiz.course_id == course_id)
    if year is not None:
        query = query.filter(Course.year == year)
    if semester:
        query = query.filter(Course.semester == semester)
    if q:
        pattern = f"%{q.strip().lower()}%"
        query = query.filter(func.lower(Quiz.title).like(pattern) | func.lower(Course.course_code).like(pattern))
    result = paginate(query, page, page_size)
    result["items"] = [quiz_output(quiz) for quiz in result["items"]]
    return result


@router.post("/quizzes", status_code=status.HTTP_201_CREATED)
def create_quiz(
    payload: QuizCreate,
    db: Session = Depends(get_db),
    creator: User = Depends(creator_roles),
):
    course = require_course(db, payload.course_id)
    if creator.role == "Lecturer":
        require_course_lecturer(course, creator.id)
    quiz = Quiz(
        course_id=payload.course_id,
        title=payload.title.strip(),
        type=payload.type,
        is_published=payload.is_published,
        created_by=creator.id,
    )
    set_questions(quiz, payload.questions)
    db.add(quiz)
    commit_or_conflict(db)
    db.refresh(quiz)
    return quiz_output(quiz)


@router.get("/quizzes/{quiz_id}", response_model=QuizResponse)
def get_quiz(quiz_id: int, db: Session = Depends(get_db)):
    quiz = (
        db.query(Quiz)
        .options(selectinload(Quiz.questions))
        .filter(Quiz.id == quiz_id, Quiz.is_published.is_(True))
        .first()
    )
    if quiz is None:
        raise HTTPException(status_code=404, detail="The requested quiz does not exist.")
    return quiz_output(quiz)


@router.put("/quizzes/{quiz_id}", response_model=QuizResponse)
def replace_quiz(
    quiz_id: int,
    payload: QuizReplace,
    db: Session = Depends(get_db),
    editor: User = Depends(creator_roles),
):
    quiz = require_quiz(db, quiz_id)
    authorize_quiz_editor(quiz, editor)
    quiz.title = payload.title.strip()
    quiz.type = payload.type
    quiz.is_published = payload.is_published
    set_questions(quiz, payload.questions)
    commit_or_conflict(db)
    db.refresh(quiz)
    return quiz_output(quiz)


@router.delete("/quizzes/{quiz_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_quiz(
    quiz_id: int,
    db: Session = Depends(get_db),
    editor: User = Depends(creator_roles),
):
    quiz = require_quiz(db, quiz_id)
    authorize_quiz_editor(quiz, editor)
    db.delete(quiz)
    commit_or_conflict(db, "This quiz has recorded attempts and cannot be deleted.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/quizzes/{quiz_id}/attempts", response_model=QuizAttemptResult, status_code=status.HTTP_201_CREATED)
def submit_attempt(
    quiz_id: int,
    payload: QuizAttemptCreate,
    db: Session = Depends(get_db),
    student: User = Depends(student_only),
):
    quiz = (
        db.query(Quiz)
        .options(selectinload(Quiz.questions))
        .filter(Quiz.id == quiz_id, Quiz.is_published.is_(True))
        .first()
    )
    if quiz is None:
        raise HTTPException(status_code=404, detail="The requested quiz does not exist.")
    question_by_id = {question.id: question for question in quiz.questions}
    if not question_by_id:
        raise HTTPException(status_code=409, detail="This quiz has no questions and cannot be attempted.")
    submitted_ids = [answer.question_id for answer in payload.answers]
    if len(submitted_ids) != len(set(submitted_ids)):
        raise HTTPException(status_code=422, detail="Each question may be answered only once.")
    if set(submitted_ids) != set(question_by_id):
        raise HTTPException(status_code=422, detail="Submit exactly one answer for every quiz question.")
    for answer in payload.answers:
        if answer.selected_option_index >= len(question_by_id[answer.question_id].options):
            raise HTTPException(status_code=422, detail="A selected option index is invalid for its question.")
    correct = sum(
        answer.selected_option_index == question_by_id[answer.question_id].correct_answer_index
        for answer in payload.answers
    )
    score = round((correct / len(question_by_id)) * 100, 2)
    attempt = QuizAttempt(
        user_id=student.id,
        quiz_id=quiz.id,
        score=Decimal(str(score)),
        total_questions=len(question_by_id),
    )
    db.add(attempt)
    commit_or_conflict(db)
    db.refresh(attempt)
    return {
        "id": attempt.id,
        "quiz_id": attempt.quiz_id,
        "score": float(attempt.score),
        "total_questions": attempt.total_questions,
        "attempted_at": attempt.attempted_at,
    }


@router.get("/quiz-attempts/mine", response_model=PageResponse[QuizAttemptResponse])
def list_my_attempts(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    quiz_id: int | None = Query(default=None, ge=1),
    db: Session = Depends(get_db),
    student: User = Depends(student_only),
):
    validate_pagination(page, page_size)
    query = db.query(QuizAttempt).options(joinedload(QuizAttempt.quiz)).join(Quiz).filter(QuizAttempt.user_id == student.id)
    if quiz_id is not None:
        query = query.filter(QuizAttempt.quiz_id == quiz_id)
    result = paginate(query, page, page_size)
    result["items"] = [
        {
            "id": attempt.id,
            "quiz_id": attempt.quiz_id,
            "score": float(attempt.score),
            "total_questions": attempt.total_questions,
            "attempted_at": attempt.attempted_at,
            "quiz_title": attempt.quiz.title,
        }
        for attempt in result["items"]
    ]
    return result
