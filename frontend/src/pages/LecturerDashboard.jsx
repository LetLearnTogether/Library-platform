import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { apiRequest } from '../lib/api.js';
import './LecturerDashboard.css';

const initialOverview = { courses: [], reviews: null, quizzes: null, performance: null };

export default function LecturerDashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(initialOverview);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest('/courses?page=1&page_size=100'),
      apiRequest('/documents/review-queue?page=1&page_size=1'),
      apiRequest('/quizzes/manage?page=1&page_size=1'),
      apiRequest('/lecturer/performance'),
    ])
      .then(([coursePage, reviewPage, quizPage, performance]) => {
        if (!active) return;
        setOverview({
          courses: coursePage.items.filter((course) => course.lecturer_id === user.id),
          reviews: reviewPage.total_items,
          quizzes: quizPage.total_items,
          performance,
        });
        setError('');
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'The Lecturer overview could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [retry, user.id]);

  const retryOverview = useCallback(() => {
    setLoading(true);
    setError('');
    setRetry((current) => current + 1);
  }, []);
  const performanceByCourse = new Map(
    (overview.performance?.courses || []).map((item) => [item.course.id, item]),
  );

  return (
    <main className="lecturer-dashboard">
      <header className="lecturer-dashboard-heading">
        <div>
          <p className="eyebrow">LECTURER WORKSPACE</p>
          <h1>Teaching overview</h1>
          <p>Review submissions for your assigned courses and prepare quizzes for your students.</p>
        </div>
        <span className="lecturer-dashboard-badge"><span aria-hidden="true">✓</span> Lecturer access</span>
      </header>

      {error && (
        <div className="lecturer-dashboard-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={retryOverview}>Retry overview</button>
        </div>
      )}

      <section className="lecturer-dashboard-stats" aria-label="Teaching overview">
        <Link className="lecturer-stat" to="/staff">
          <span className="lecturer-stat-icon" aria-hidden="true">◷</span>
          <span><small>Awaiting your review</small><strong>{loading ? '—' : overview.reviews ?? '—'}</strong></span>
        </Link>
        <Link className="lecturer-stat" to="/quiz-management">
          <span className="lecturer-stat-icon" aria-hidden="true">✎</span>
          <span><small>Your quizzes</small><strong>{loading ? '—' : overview.quizzes ?? '—'}</strong></span>
        </Link>
        <article className="lecturer-stat">
          <span className="lecturer-stat-icon" aria-hidden="true">▤</span>
          <span><small>Assigned courses</small><strong>{loading ? '—' : overview.courses.length}</strong></span>
        </article>
        <article className="lecturer-stat">
          <span className="lecturer-stat-icon" aria-hidden="true">◉</span>
          <span><small>Student quiz attempts</small><strong>{loading ? '—' : overview.performance?.attempt_count ?? '—'}</strong></span>
        </article>
        <article className="lecturer-stat">
          <span className="lecturer-stat-icon" aria-hidden="true">％</span>
          <span>
            <small>Average quiz score</small>
            <strong>
              {loading ? '—' : overview.performance?.average_score == null
                ? '—'
                : `${Number(overview.performance.average_score).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`}
            </strong>
          </span>
        </article>
      </section>

      <section className="lecturer-dashboard-panel" aria-labelledby="lecturer-courses-title">
        <div className="lecturer-panel-heading">
          <div>
            <p className="lecturer-panel-kicker">YOUR TEACHING SCOPE</p>
            <h2 id="lecturer-courses-title">Assigned courses</h2>
            <p>Reviews, quizzes, and performance reports are limited to the courses assigned to you.</p>
          </div>
          <Link className="lecturer-secondary-link" to="/library">Open document library</Link>
        </div>

        {loading && <p className="lecturer-dashboard-status" role="status">Loading your courses…</p>}
        {!loading && !error && overview.courses.length === 0 && (
          <div className="lecturer-empty">
            <h3>No courses assigned yet</h3>
            <p>Ask an administrator to assign you to a course. Assigned courses will appear here.</p>
          </div>
        )}
        {!loading && !error && overview.courses.length > 0 && (
          <div className="lecturer-course-list">
            {overview.courses.map((course) => (
              <article className="lecturer-course-card" key={course.id}>
                <div className="lecturer-course-details">
                  <span className="lecturer-course-code">{course.course_code}</span>
                  <h3>{course.course_title}</h3>
                  <p>{course.year} · {course.semester} semester</p>
                  <div className="lecturer-course-performance">
                    <span>{performanceByCourse.get(course.id)?.quiz_count ?? 0} quizzes</span>
                    <span>{performanceByCourse.get(course.id)?.attempt_count ?? 0} attempts</span>
                    <span>
                      Average:{' '}
                      {performanceByCourse.get(course.id)?.average_score == null
                        ? '—'
                        : `${Number(performanceByCourse.get(course.id).average_score).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`}
                    </span>
                  </div>
                </div>
                <div className="lecturer-course-actions">
                  <Link to={`/lecturer/courses/${course.id}/students`}>Student roster and progress <span aria-hidden="true">→</span></Link>
                  <Link to={`/quiz-management?course_id=${course.id}`}>View quiz reports <span aria-hidden="true">→</span></Link>
                  <Link to={`/upload?course_id=${course.id}`}>Upload course material <span aria-hidden="true">→</span></Link>
                  <Link to="/quiz-management">Manage quizzes <span aria-hidden="true">→</span></Link>
                  <Link to={`/lecturer/announcements?course_id=${course.id}`}>Post an update <span aria-hidden="true">→</span></Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="lecturer-dashboard-panel" aria-labelledby="lecturer-challenging-title">
        <div className="lecturer-panel-heading">
          <div>
            <p className="lecturer-panel-kicker">LEARNING INSIGHTS</p>
            <h2 id="lecturer-challenging-title">Questions students find challenging</h2>
            <p>Lowest correct-response rates across your assigned courses, based on recorded quiz answers.</p>
          </div>
        </div>
        {loading ? (
          <p className="lecturer-dashboard-status" role="status">Calculating quiz performance…</p>
        ) : overview.performance?.challenging_questions.length ? (
          <div className="lecturer-challenging-list">
            {overview.performance.challenging_questions.map((question, index) => (
              <article className="lecturer-challenging-item" key={`${question.course_code}-${question.quiz_title}-${question.question_order}-${index}`}>
                <div>
                  <span>{question.course_code} · {question.quiz_title} · Question {question.question_order}</span>
                  <p>{question.question_text}</p>
                  <small>{question.correct_count} of {question.total_responses} responses correct</small>
                </div>
                <strong>{Number(question.correct_percentage).toLocaleString(undefined, { maximumFractionDigits: 1 })}%</strong>
              </article>
            ))}
          </div>
        ) : (
          <p className="lecturer-performance-empty">
            No question-level results yet. Student answer analysis will appear after students complete quizzes in your courses.
          </p>
        )}
      </section>

      <section className="lecturer-responsibility-panel" aria-labelledby="lecturer-responsibilities-title">
        <p className="lecturer-panel-kicker">YOUR ROLE</p>
        <h2 id="lecturer-responsibilities-title">Support learning in your courses</h2>
        <div className="lecturer-responsibility-grid">
          <article>
            <span>01</span>
            <h3>Review student submissions</h3>
            <p>Preview and approve or reject papers submitted to your assigned courses.</p>
            <Link to="/staff">Open review queue</Link>
          </article>
          <article>
            <span>02</span>
            <h3>Create practice quizzes</h3>
            <p>Prepare, edit, and publish quizzes for the courses you teach.</p>
            <Link to="/quiz-management">Manage quizzes</Link>
          </article>
          <article>
            <span>03</span>
            <h3>Post course announcements</h3>
            <p>Share schedule changes and important updates with students visiting your course.</p>
            <Link to="/lecturer/announcements">Manage announcements</Link>
          </article>
          <article>
            <span>04</span>
            <h3>Publish course materials</h3>
            <p>Upload verified course resources to the courses assigned to you and remove them when they are outdated.</p>
            <Link to="/upload">Manage course materials</Link>
          </article>
          <article>
            <span>05</span>
            <h3>Use the learning library</h3>
            <p>Browse verified materials and use them to support your students’ learning.</p>
            <Link to="/library">Browse library</Link>
          </article>
        </div>
      </section>
    </main>
  );
}
