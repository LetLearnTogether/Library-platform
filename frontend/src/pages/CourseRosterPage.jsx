import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../lib/api.js';
import './CourseRosterPage.css';

const PAGE_SIZE = 20;

function displayScore(score) {
  return score == null ? '—' : `${Number(score).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}

export default function CourseRosterPage() {
  const { courseId } = useParams();
  const [report, setReport] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    apiRequest(`/courses/${encodeURIComponent(courseId)}/students?page=${page}&page_size=${PAGE_SIZE}`)
      .then((value) => {
        if (!active) return;
        setReport(value);
        setError('');
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'The course roster could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [courseId, page, retry]);

  function retryReport() {
    setLoading(true);
    setError('');
    setRetry((current) => current + 1);
  }

  return (
    <main className="course-roster-page">
      <header className="course-roster-header">
        <div>
          <p className="eyebrow">LECTURER WORKSPACE · COURSE PROGRESS</p>
          <h1>{report ? `${report.course.course_code} student progress` : 'Course student progress'}</h1>
          {report && <p>{report.course.course_title} · {report.course.year} · {report.course.semester} semester</p>}
        </div>
        <Link to="/lecturer">Back to dashboard</Link>
      </header>

      {error && (
        <div className="course-roster-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={retryReport}>Retry</button>
        </div>
      )}
      {loading && <p className="course-roster-status" role="status">Loading student progress…</p>}

      {!loading && !error && report && (
        <>
          <section className="course-roster-stats" aria-label="Course enrollment summary">
            <article><span>Enrolled students</span><strong>{report.total_items}</strong></article>
            <article><span>Published quizzes</span><strong>{report.quiz_count}</strong></article>
            <article><span>Roster page</span><strong>{report.total_pages ? `${report.page}/${report.total_pages}` : '—'}</strong></article>
          </section>

          <section className="course-roster-panel" aria-labelledby="course-roster-title">
            <div className="course-roster-panel-heading">
              <div>
                <h2 id="course-roster-title">Student roster and quiz progress</h2>
                <p>Progress includes attempts for published quizzes in this course.</p>
              </div>
            </div>
            {report.students.length === 0 ? (
              <div className="course-roster-empty">
                <h3>No students enrolled yet</h3>
                <p>Students can enroll from the Student Dashboard under My Courses.</p>
              </div>
            ) : (
              <div className="course-roster-list">
                {report.students.map((student) => (
                  <details className="course-roster-student" key={student.student_id}>
                    <summary>
                      <span className="course-roster-student-name">
                        <strong>{student.student_name}</strong>
                        <small>Enrolled {new Date(student.enrolled_at).toLocaleDateString()}</small>
                      </span>
                      <span>{student.quizzes_attempted}/{report.quiz_count} quizzes</span>
                      <span>{student.attempt_count} attempts</span>
                      <strong>{displayScore(student.average_score)}</strong>
                    </summary>
                    <div className="course-roster-quiz-list">
                      {student.quizzes.map((quiz) => (
                        <article key={quiz.quiz_id}>
                          <span>{quiz.quiz_title}</span>
                          {quiz.attempt_count ? (
                            <>
                              <small>{quiz.attempt_count} {quiz.attempt_count === 1 ? 'attempt' : 'attempts'}</small>
                              <small>Latest {displayScore(quiz.latest_score)} · Best {displayScore(quiz.best_score)}</small>
                            </>
                          ) : <small>Not attempted</small>}
                        </article>
                      ))}
                      {student.last_attempt_at && (
                        <p>Last activity: {new Date(student.last_attempt_at).toLocaleString()}</p>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            )}
            {report.total_pages > 1 && (
              <nav className="course-roster-pagination" aria-label="Course roster pages">
                <button type="button" disabled={page <= 1} onClick={() => { setLoading(true); setPage((current) => current - 1); }}>Previous</button>
                <span>Page {report.page} of {report.total_pages}</span>
                <button type="button" disabled={page >= report.total_pages} onClick={() => { setLoading(true); setPage((current) => current + 1); }}>Next</button>
              </nav>
            )}
          </section>
        </>
      )}
    </main>
  );
}
