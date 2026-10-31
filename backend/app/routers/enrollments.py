from math import ceil

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.models import CourseEnrollment, Quiz, QuizAttempt, User
from app.schemas.api import (
    CourseResponse,
    CourseRosterQuizProgress,
    CourseRosterResponse,
    CourseRosterStudent,
    StudentCourseEnrollment,
)
from app.services.api import commit_or_conflict, flush_or_conflict, require_course, require_course_lecturer

router = APIRouter(tags=["Course enrollments"])
student_only = require_roles("Student")
roster_roles = require_roles("Lecturer", "Admin")


@router.get("/enrollments/mine", response_model=list[StudentCourseEnrollment])
def list_my_enrollments(db: Session = Depends(get_db), student: User = Depends(student_only)):
    enrollments = (
        db.query(CourseEnrollment)
        .options(joinedload(CourseEnrollment.course))
        .filter(CourseEnrollment.student_id == student.id)
        .order_by(CourseEnrollment.enrolled_at.desc(), CourseEnrollment.id.desc())
        .all()
    )
    if not enrollments:
        return []

    course_ids = [enrollment.course_id for enrollment in enrollments]
    quiz_counts = dict(
        db.query(Quiz.course_id, func.count(Quiz.id))
        .filter(Quiz.course_id.in_(course_ids), Quiz.is_published.is_(True))
        .group_by(Quiz.course_id)
        .all()
    )
    attempt_stats = {
        course_id: (attempt_count, average_score, last_attempt)
        for course_id, attempt_count, average_score, last_attempt in (
            db.query(
                Quiz.course_id,
                func.count(QuizAttempt.id),
                func.avg(QuizAttempt.score),
                func.max(QuizAttempt.attempted_at),
            )
            .join(QuizAttempt, QuizAttempt.quiz_id == Quiz.id)
            .filter(
                Quiz.course_id.in_(course_ids),
                Quiz.is_published.is_(True),
                QuizAttempt.user_id == student.id,
            )
            .group_by(Quiz.course_id)
            .all()
        )
    }
    attempted_quiz_counts = dict(
        db.query(Quiz.course_id, func.count(func.distinct(QuizAttempt.quiz_id)))
        .join(QuizAttempt, QuizAttempt.quiz_id == Quiz.id)
        .filter(
            Quiz.course_id.in_(course_ids),
            Quiz.is_published.is_(True),
            QuizAttempt.user_id == student.id,
        )
        .group_by(Quiz.course_id)
        .all()
    )

    return [
        StudentCourseEnrollment(
            course=enrollment.course,
            enrolled_at=enrollment.enrolled_at,
            quiz_count=quiz_counts.get(enrollment.course_id, 0),
            quizzes_attempted=attempted_quiz_counts.get(enrollment.course_id, 0),
            attempt_count=attempt_stats.get(enrollment.course_id, (0, None, None))[0],
            average_score=(
                round(float(attempt_stats[enrollment.course_id][1]), 2)
                if attempt_stats.get(enrollment.course_id, (0, None, None))[1] is not None
                else None
            ),
            last_attempt_at=attempt_stats.get(enrollment.course_id, (0, None, None))[2],
        )
        for enrollment in enrollments
    ]


@router.post(
    "/courses/{course_id}/enrollment",
    response_model=StudentCourseEnrollment,
    status_code=status.HTTP_201_CREATED,
)
def enroll_in_course(
    course_id: int,
    db: Session = Depends(get_db),
    student: User = Depends(student_only),
):
    course = require_course(db, course_id)
    enrollment = CourseEnrollment(course_id=course.id, student_id=student.id)
    db.add(enrollment)
    flush_or_conflict(db, "You are already enrolled in this course.")
    commit_or_conflict(db)
    return next(
        item
        for item in list_my_enrollments(db, student)
        if item.course.id == course.id
    )


@router.delete("/courses/{course_id}/enrollment", status_code=status.HTTP_204_NO_CONTENT)
def leave_course(
    course_id: int,
    db: Session = Depends(get_db),
    student: User = Depends(student_only),
):
    course = require_course(db, course_id)
    enrollment = (
        db.query(CourseEnrollment)
        .filter(CourseEnrollment.course_id == course.id, CourseEnrollment.student_id == student.id)
        .first()
    )
    if enrollment is not None:
        db.delete(enrollment)
        commit_or_conflict(db)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/courses/{course_id}/students", response_model=CourseRosterResponse)
def course_roster(
    course_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    editor: User = Depends(roster_roles),
):
    course = require_course(db, course_id)
    if editor.role == "Lecturer":
        require_course_lecturer(course, editor.id)

    enrollment_query = (
        db.query(CourseEnrollment, User)
        .join(User, User.id == CourseEnrollment.student_id)
        .filter(CourseEnrollment.course_id == course.id)
    )
    total_items = enrollment_query.count()
    total_pages = ceil(total_items / page_size) if total_items else 0
    enrolled_students = (
        enrollment_query
        .order_by(User.name, User.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    quizzes = (
        db.query(Quiz.id, Quiz.title)
        .filter(Quiz.course_id == course.id, Quiz.is_published.is_(True))
        .order_by(Quiz.title, Quiz.id)
        .all()
    )
    quiz_ids = [quiz_id for quiz_id, _ in quizzes]
    student_ids = [user.id for _, user in enrolled_students]
    progress_by_student_quiz = {}
    if student_ids and quiz_ids:
        for attempt in (
            db.query(QuizAttempt)
            .filter(
                QuizAttempt.user_id.in_(student_ids),
                QuizAttempt.quiz_id.in_(quiz_ids),
            )
            .order_by(QuizAttempt.id)
            .all()
        ):
            stats = progress_by_student_quiz.setdefault(
                (attempt.user_id, attempt.quiz_id),
                {"count": 0, "best": None, "latest": None, "last_attempt": None, "score_sum": 0.0},
            )
            attempt_score = float(attempt.score)
            stats["count"] += 1
            stats["best"] = max(stats["best"], attempt_score) if stats["best"] is not None else attempt_score
            stats["latest"] = attempt_score
            stats["last_attempt"] = attempt.attempted_at
            stats["score_sum"] += attempt_score

    students = []
    for enrollment, user in enrolled_students:
        student_quiz_progress = []
        total_attempts = 0
        total_score = 0.0
        last_attempt_at = None
        for quiz_id, title in quizzes:
            progress = progress_by_student_quiz.get((user.id, quiz_id))
            if progress:
                total_attempts += progress["count"]
                total_score += progress["score_sum"]
                student_quiz_progress.append(
                    CourseRosterQuizProgress(
                        quiz_id=quiz_id,
                        quiz_title=title,
                        attempt_count=progress["count"],
                        best_score=progress["best"],
                        latest_score=progress["latest"],
                        last_attempt_at=progress["last_attempt"],
                    )
                )
                last_quiz_attempt = progress["last_attempt"]
                last_attempt_at = max(last_attempt_at, last_quiz_attempt) if last_attempt_at else last_quiz_attempt
            else:
                student_quiz_progress.append(
                    CourseRosterQuizProgress(
                        quiz_id=quiz_id,
                        quiz_title=title,
                        attempt_count=0,
                        best_score=None,
                        latest_score=None,
                        last_attempt_at=None,
                    )
                )
        students.append(
            CourseRosterStudent(
                student_id=user.id,
                student_name=user.name,
                enrolled_at=enrollment.enrolled_at,
                attempt_count=total_attempts,
                quizzes_attempted=sum(1 for quiz in student_quiz_progress if quiz.attempt_count > 0),
                average_score=round(total_score / total_attempts, 2) if total_attempts else None,
                last_attempt_at=last_attempt_at,
                quizzes=student_quiz_progress,
            )
        )

    return CourseRosterResponse(
        course=CourseResponse.model_validate(course),
        quiz_count=len(quizzes),
        page=page,
        page_size=page_size,
        total_items=total_items,
        total_pages=total_pages,
        students=students,
    )
