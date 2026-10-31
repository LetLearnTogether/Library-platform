import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api.js';
import './StudentCoursesPage.css';

export default function StudentCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingCourseId, setWorkingCourseId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest('/courses?page=1&page_size=100'),
      apiRequest('/enrollments/mine'),
    ])
      .then(([coursePage, myEnrollments]) => {
        if (!active) return;
        setCourses(coursePage.items);
        setEnrollments(myEnrollments);
        setError('');
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Courses could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [retry]);

  const retryLoading = useCallback(() => {
    setLoading(true);
    setError('');
    setRetry((current) => current + 1);
  }, []);

  async function changeEnrollment(course, isEnrolled) {
    setWorkingCourseId(course.id);
    setError('');
    setMessage('');
    try {
      if (isEnrolled) {
        if (!window.confirm(`Leave ${course.course_code}? Your quiz history will be kept, but you will need to re-enroll before taking more quizzes.`)) return;
        await apiRequest(`/courses/${course.id}/enrollment`, { method: 'DELETE' });
        setMessage(`You left ${course.course_code}. Your existing quiz history is retained.`);
      } else {
        await apiRequest(`/courses/${course.id}/enrollment`, { method: 'POST' });
        setMessage(`You enrolled in ${course.course_code}. You can now take its quizzes.`);
      }
      setLoading(true);
      setRetry((current) => current + 1);
    } catch (requestError) {
      setError(requestError.message || 'Your enrollment could not be updated.');
    } finally {
      setWorkingCourseId(null);
    }
  }

  const enrollmentByCourse = new Map(enrollments.map((enrollment) => [enrollment.course.id, enrollment]));

  return (
    <main className="student-courses-page">
      <header className="student-courses-header">
        <div>
          <p className="eyebrow">STUDENT LEARNING SPACE</p>
          <h1>My courses</h1>
          <p>Join courses to take their quizzes and follow your learning progress.</p>
        </div>
        <Link to="/student-dashboard">Back to dashboard</Link>
      </header>

      {message && <p className="student-courses-message" role="status">{message}</p>}
      {error && (
        <div className="student-courses-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={retryLoading}>Retry</button>
        </div>
      )}
      {loading ? (
        <p className="student-courses-status" role="status">Loading course catalog…</p>
      ) : courses.length === 0 ? (
        <section className="student-courses-empty">
          <h2>No courses are available yet</h2>
          <p>Courses will appear here after an administrator adds them to the platform.</p>
        </section>
      ) : (
        <section className="student-course-list" aria-label="Available courses">
          {courses.map((course) => {
            const enrollment = enrollmentByCourse.get(course.id);
            const isWorking = workingCourseId === course.id;
            return (
              <article className="student-course-card" key={course.id}>
                <div className="student-course-card-main">
                  <span>{course.course_code} · {course.year} · {course.semester} semester</span>
                  <h2>{course.course_title}</h2>
                  <p>{course.lecturer_name ? `Lecturer: ${course.lecturer_name}` : 'Lecturer to be assigned'}</p>
                  {enrollment ? (
                    <div className="student-course-progress">
                      <span>{enrollment.quizzes_attempted} of {enrollment.quiz_count} quizzes attempted</span>
                      <span>{enrollment.attempt_count} total attempts</span>
                      <span>
                        Average:{' '}
                        {enrollment.average_score == null
                          ? '—'
                          : `${Number(enrollment.average_score).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`}
                      </span>
                    </div>
                  ) : (
                    <p className="student-course-enrollment-hint">Enroll to unlock this course’s quizzes.</p>
                  )}
                </div>
                <div className="student-course-card-actions">
                  {enrollment && (
                    <>
                      <Link to={`/courses/${encodeURIComponent(course.course_code)}`}>Course library</Link>
                      <Link to="/quizzes">Browse quizzes</Link>
                    </>
                  )}
                  <button
                    type="button"
                    className={enrollment ? 'student-course-leave' : 'student-course-join'}
                    disabled={isWorking}
                    onClick={() => changeEnrollment(course, Boolean(enrollment))}
                  >
                    {isWorking ? 'Updating…' : enrollment ? 'Leave course' : 'Enroll'}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
