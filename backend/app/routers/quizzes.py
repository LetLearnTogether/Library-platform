from collections import defaultdict
from decimal import Decimal
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload, selectinload

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models import Course, CourseEnrollment, Quiz, QuizAttempt, QuizAttemptAnswer, QuizQuestion, User
from app.schemas.api import (
    QuizAttemptCreate,
    QuizAttemptResponse,
    QuizAttemptResult,
    QuizAnswerOptionPerformance,
    QuizCreate,
    QuizEditorResponse,
    LecturerChallengingQuestion,
    LecturerCoursePerformance,
    LecturerPerformanceResponse,
    QuizQuestionPerformance,
    QuizQuestionInput,
    QuizReplace,
    QuizResultsResponse,
    QuizResponse,
    PageResponse,
    Semester,
)
from app.services.api import (
    commit_or_conflict,
    paginate,
    quiz_editor_output,
    quiz_output,
    require_course,
    require_course_lecturer,
    require_quiz,
)

router = APIRouter(tags=["Quizzes", "Quiz attempts"])
creator_roles = require_roles("Lecturer", "Admin")
student_only = require_roles("Student")
lecturer_only = require_roles("Lecturer")


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


@router.get("/lecturer/performance", response_model=LecturerPerformanceResponse)
def lecturer_performance(
    db: Session = Depends(get_db),
    lecturer: User = Depends(lecturer_only),
):
    courses = (
        db.query(Course)
        .filter(Course.lecturer_id == lecturer.id)
        .order_by(Course.course_code)
        .all()
    )
    course_by_id = {course.id: course for course in courses}
    if not course_by_id:
        return LecturerPerformanceResponse(
            quiz_count=0,
            attempt_count=0,
            average_score=None,
            courses=[],
            challenging_questions=[],
        )

    quiz_rows = (
        db.query(Quiz.id, Quiz.title, Quiz.course_id)
        .filter(Quiz.course_id.in_(course_by_id))
        .order_by(Quiz.id.desc())
        .all()
    )
    attempt_rows = (
        db.query(
            QuizAttempt.quiz_id,
            func.count(QuizAttempt.id),
            func.avg(QuizAttempt.score),
        )
        .join(Quiz, Quiz.id == QuizAttempt.quiz_id)
        .filter(Quiz.course_id.in_(course_by_id))
        .group_by(QuizAttempt.quiz_id)
        .all()
    )
    stats_by_quiz = {
        quiz_id: (attempt_count, average_score)
        for quiz_id, attempt_count, average_score in attempt_rows
    }

    course_stats = {
        course_id: {"quiz_count": 0, "attempt_count": 0, "score_sum": 0.0}
        for course_id in course_by_id
    }
    for quiz_id, _title, course_id in quiz_rows:
        stats = course_stats[course_id]
        stats["quiz_count"] += 1
        attempt_count, average_score = stats_by_quiz.get(quiz_id, (0, None))
        stats["attempt_count"] += attempt_count
        if attempt_count and average_score is not None:
            stats["score_sum"] += float(average_score) * attempt_count

    overall_attempt_count = sum(stats["attempt_count"] for stats in course_stats.values())
    course_performance = [
        LecturerCoursePerformance(
            course=course,
            quiz_count=course_stats[course.id]["quiz_count"],
            attempt_count=course_stats[course.id]["attempt_count"],
            average_score=(
                round(course_stats[course.id]["score_sum"] / course_stats[course.id]["attempt_count"], 2)
                if course_stats[course.id]["attempt_count"]
                else None
            ),
        )
        for course in courses
    ]
    quiz_title_by_id = {quiz_id: title for quiz_id, title, _course_id in quiz_rows}
    question_stats = defaultdict(lambda: [0, 0])
    for answer, quiz_id, course_id in (
        db.query(QuizAttemptAnswer, Quiz.id, Quiz.course_id)
        .join(QuizAttempt, QuizAttempt.id == QuizAttemptAnswer.attempt_id)
        .join(Quiz, Quiz.id == QuizAttempt.quiz_id)
        .filter(Quiz.course_id.in_(course_by_id))
        .yield_per(1000)
    ):
        question_key = (
            course_id,
            quiz_id,
            answer.question_order,
            answer.question_text,
            answer.correct_option_index,
        )
        question_stats[question_key][0] += 1
        question_stats[question_key][1] += answer.selected_option_index == answer.correct_option_index

    challenging_questions = []
    for (course_id, quiz_id, question_order, question_text, _correct_index), (total, correct) in question_stats.items():
        challenging_questions.append(
            LecturerChallengingQuestion(
                course_code=course_by_id[course_id].course_code,
                quiz_title=quiz_title_by_id[quiz_id],
                question_order=question_order,
                question_text=question_text,
                total_responses=total,
                correct_count=correct,
                correct_percentage=round(correct / total * 100, 2),
            )
        )
    challenging_questions.sort(key=lambda question: (question.correct_percentage, -question.total_responses))

    return LecturerPerformanceResponse(
        quiz_count=len(quiz_rows),
        attempt_count=overall_attempt_count,
        average_score=(
            round(
                sum(stats["score_sum"] for stats in course_stats.values()) / overall_attempt_count,
                2,
            )
            if overall_attempt_count
            else None
        ),
        courses=course_performance,
        challenging_questions=challenging_questions[:5],
    )


@router.get("/quizzes/manage", response_model=PageResponse[QuizResponse])
def list_managed_quizzes(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    course_id: int | None = Query(default=None, ge=1),
    db: Session = Depends(get_db),
    editor: User = Depends(creator_roles),
):
    validate_pagination(page, page_size)
    query = (
        db.query(Quiz)
        .join(Course)
        .options(joinedload(Quiz.course), selectinload(Quiz.questions))
    )
    if editor.role == "Lecturer":
        query = query.filter(Course.lecturer_id == editor.id)
    if course_id is not None:
        query = query.filter(Quiz.course_id == course_id)
    result = paginate(query, page, page_size)
    result["items"] = [quiz_output(quiz) for quiz in result["items"]]
    return result


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


@router.get("/quizzes/{quiz_id}/manage", response_model=QuizEditorResponse)
def get_quiz_for_editing(
    quiz_id: int,
    db: Session = Depends(get_db),
    editor: User = Depends(creator_roles),
):
    quiz = (
        db.query(Quiz)
        .options(joinedload(Quiz.course), selectinload(Quiz.questions))
        .filter(Quiz.id == quiz_id)
        .first()
    )
    if quiz is None:
        raise HTTPException(status_code=404, detail="The requested quiz does not exist.")
    authorize_quiz_editor(quiz, editor)
    return quiz_editor_output(quiz)


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
    is_enrolled = (
        db.query(CourseEnrollment.id)
        .filter(CourseEnrollment.course_id == quiz.course_id, CourseEnrollment.student_id == student.id)
        .first()
    )
    if is_enrolled is None:
        raise HTTPException(status_code=403, detail="Enroll in this course before attempting its quizzes.")
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
    question_order_by_id = {question.id: index for index, question in enumerate(quiz.questions, start=1)}
    attempt.answers.extend(
        QuizAttemptAnswer(
            question_order=question_order_by_id[answer.question_id],
            question_text=question_by_id[answer.question_id].question_text,
            options=list(question_by_id[answer.question_id].options),
            selected_option_index=answer.selected_option_index,
            correct_option_index=question_by_id[answer.question_id].correct_answer_index,
        )
        for answer in payload.answers
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


@router.get("/quizzes/{quiz_id}/results", response_model=QuizResultsResponse)
def quiz_results(
    quiz_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    editor: User = Depends(creator_roles),
):
    validate_pagination(page, page_size)
    quiz = (
        db.query(Quiz)
        .options(joinedload(Quiz.course), selectinload(Quiz.questions))
        .filter(Quiz.id == quiz_id)
        .first()
    )
    if quiz is None:
        raise HTTPException(status_code=404, detail="The requested quiz does not exist.")
    authorize_quiz_editor(quiz, editor)

    attempt_query = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz.id)
    attempt_count = attempt_query.count()
    average_score = db.query(func.avg(QuizAttempt.score)).filter(QuizAttempt.quiz_id == quiz.id).scalar()
    attempts = (
        db.query(QuizAttempt, User)
        .join(User, User.id == QuizAttempt.user_id)
        .filter(QuizAttempt.quiz_id == quiz.id)
        .order_by(QuizAttempt.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    question_versions = defaultdict(lambda: defaultdict(int))
    for answer in (
        db.query(QuizAttemptAnswer)
        .join(QuizAttempt, QuizAttempt.id == QuizAttemptAnswer.attempt_id)
        .filter(QuizAttempt.quiz_id == quiz.id)
        .yield_per(1000)
    ):
        version_key = (
            answer.question_order,
            answer.question_text,
            tuple(answer.options),
            answer.correct_option_index,
        )
        question_versions[version_key][answer.selected_option_index] += 1

    for index, question in enumerate(quiz.questions, start=1):
        question_versions.setdefault(
            (index, question.question_text, tuple(question.options), question.correct_answer_index),
            defaultdict(int),
        )

    question_results = []
    for (question_order, question_text, options, correct_index), selection_counts in sorted(
        question_versions.items(), key=lambda item: (item[0][0], item[0][1])
    ):
        total_responses = sum(selection_counts.values())
        correct_count = selection_counts.get(correct_index, 0)
        question_results.append(
            QuizQuestionPerformance(
                question_order=question_order,
                question_text=question_text,
                total_responses=total_responses,
                correct_count=correct_count,
                correct_percentage=round(correct_count / total_responses * 100, 2) if total_responses else None,
                options=[
                    QuizAnswerOptionPerformance(
                        option_text=option,
                        selection_count=selection_counts.get(option_index, 0),
                        percentage=round(selection_counts.get(option_index, 0) / total_responses * 100, 2)
                        if total_responses
                        else 0,
                        is_correct=option_index == correct_index,
                    )
                    for option_index, option in enumerate(options)
                ],
            )
        )

    return QuizResultsResponse(
        quiz_id=quiz.id,
        quiz_title=quiz.title,
        course=quiz.course,
        attempt_count=attempt_count,
        average_score=round(float(average_score), 2) if average_score is not None else None,
        page=page,
        page_size=page_size,
        total_pages=ceil(attempt_count / page_size) if attempt_count else 0,
        attempts=[
            {
                "id": attempt.id,
                "student_name": student.name,
                "score": float(attempt.score),
                "total_questions": attempt.total_questions,
                "attempted_at": attempt.attempted_at,
            }
            for attempt, student in attempts
        ],
        questions=question_results,
    )


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
