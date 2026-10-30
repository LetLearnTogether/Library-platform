import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import './QuizPage.css';

export default function QuizPage() {
  const { quizId } = useParams();
  return <QuizPageContent key={quizId || 'list'} quizId={quizId} />;
}

function QuizPageContent({ quizId }) {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [courseId, setCourseId] = useState('');
  const [year, setYear] = useState('');
  const [semester, setSemester] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [reload, setReload] = useState(0);
  const [coursesError, setCoursesError] = useState('');
  const [quiz, setQuiz] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (quizId) return undefined;
    let active = true;
    apiRequest('/courses?page=1&page_size=100')
      .then((result) => {
        if (active) setCourses(result.items);
      })
      .catch((requestError) => {
        if (active) setCoursesError(requestError.message || 'Course filters could not be loaded.');
      });
    return () => { active = false; };
  }, [quizId]);

  useEffect(() => {
    if (quizId) return undefined;
    const timer = window.setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [quizId, searchDraft]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), page_size: '20' });
    if (search) params.set('q', search);
    if (courseId) params.set('course_id', courseId);
    if (year) params.set('year', year);
    if (semester) params.set('semester', semester);
    const request = quizId
      ? apiRequest(`/quizzes/${encodeURIComponent(quizId)}`)
        .then((value) => { if (active) setQuiz(value); })
      : apiRequest(`/quizzes?${params}`)
        .then((value) => {
          if (!active) return;
          setQuizzes(value.items);
          setTotalPages(value.total_pages);
          setTotalItems(value.total_items);
        });
    request
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Unable to load quizzes.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [quizId, page, search, courseId, year, semester, reload]);

  const questions = quiz?.questions || [];
  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = questions.length ? ((currentIndex + 1) / questions.length) * 100 : 0;

  function chooseAnswer(optionIndex) {
    if (!currentQuestion || result) return;
    setAnswers((previous) => ({ ...previous, [currentQuestion.id]: optionIndex }));
  }

  async function submitQuiz() {
    setSubmitting(true);
    setError('');
    try {
      const attempt = await apiRequest(`/quizzes/${encodeURIComponent(quizId)}/attempts`, {
        method: 'POST',
        body: {
          answers: questions.map((question) => ({
            question_id: question.id,
            selected_option_index: answers[question.id],
          })),
        },
      });
      setResult(attempt);
      setShowConfirmation(false);
    } catch (requestError) {
      setError(requestError.message || 'Your answers could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  }

  function restartQuiz() {
    setCurrentIndex(0);
    setAnswers({});
    setResult(null);
    setError('');
  }

  function resetQuizFilters() {
    setSearchDraft('');
    setSearch('');
    setCourseId('');
    setYear('');
    setSemester('');
    setPage(1);
  }

  function retryQuizList() {
    setLoading(true);
    setError('');
    setReload((current) => current + 1);
  }

  if (!quizId) {
    const years = [...new Set(courses.map((course) => course.year))]
      .sort((left, right) => right - left);
    return (
      <main className="quiz-page">
        <header className="quiz-page-header">
          <div><p className="quiz-eyebrow">PRACTICE AND LEARN</p><h1>Quizzes</h1><p>Search and filter published quizzes, then choose one to begin.</p></div>
          <Link to="/student-dashboard" className="quiz-back-link">← Dashboard</Link>
        </header>
        <section className="quiz-filters" aria-label="Filter quizzes">
          <label>
            <span>Search quizzes</span>
            <input
              type="search"
              value={searchDraft}
              maxLength={100}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Quiz title or course code"
            />
          </label>
          <label>
            <span>Course</span>
            <select value={courseId} onChange={(event) => { setCourseId(event.target.value); setPage(1); }}>
              <option value="">All courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>{course.course_code}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Academic year</span>
            <select value={year} onChange={(event) => { setYear(event.target.value); setPage(1); }}>
              <option value="">All years</option>
              {years.map((academicYear) => <option key={academicYear} value={academicYear}>{academicYear}</option>)}
            </select>
          </label>
          <label>
            <span>Semester</span>
            <select value={semester} onChange={(event) => { setSemester(event.target.value); setPage(1); }}>
              <option value="">All semesters</option>
              <option value="First">First semester</option>
              <option value="Second">Second semester</option>
            </select>
          </label>
          <button type="button" className="quiz-button quiz-button-secondary" onClick={resetQuizFilters}>
            Clear filters
          </button>
        </section>
        {coursesError && <p className="app-status" role="alert">{coursesError}</p>}
        {error && <p className="app-status" role="alert">{error}</p>}
        <p className="quiz-results-count" aria-live="polite">
          {totalItems} {totalItems === 1 ? 'quiz' : 'quizzes'} found
        </p>
        {loading ? <p className="app-status" role="status">Loading quizzes…</p> : quizzes.length ? (
          <>
            <section className="quiz-list">
              {quizzes.map((item) => (
                <article className="quiz-card" key={item.id}>
                  <p className="quiz-course-label">{item.course.course_code}</p>
                  <h2>{item.title}</h2>
                  <p>{item.course.course_title} · {item.course.year} · {item.course.semester} semester · {item.questions.length} questions</p>
                  <Link className="quiz-button quiz-button-primary" to={`/quizzes/${item.id}`}>Start quiz</Link>
                </article>
              ))}
            </section>
            {totalPages > 1 && (
              <nav className="quiz-list-pagination" aria-label="Quiz pages">
                <button
                  type="button"
                  className="quiz-button quiz-button-secondary"
                  disabled={page === 1}
                  onClick={() => { setLoading(true); setPage((current) => current - 1); }}
                >
                  Previous
                </button>
                <span>Page {page} of {totalPages}</span>
                <button
                  type="button"
                  className="quiz-button quiz-button-secondary"
                  disabled={page === totalPages}
                  onClick={() => { setLoading(true); setPage((current) => current + 1); }}
                >
                  Next
                </button>
              </nav>
            )}
          </>
        ) : !error ? (
          <div className="empty-state">
            <h2>{search || courseId || year || semester ? 'No matching quizzes' : 'No quizzes published yet'}</h2>
            <p>{search || courseId || year || semester
              ? 'Try adjusting your search or clearing one or more filters.'
              : 'Check back later for quizzes from your lecturers.'}</p>
            {(search || courseId || year || semester) && (
              <button type="button" className="quiz-button quiz-button-secondary" onClick={resetQuizFilters}>Clear filters</button>
            )}
          </div>
        ) : (
          <button type="button" className="quiz-button quiz-button-secondary" onClick={retryQuizList}>Try again</button>
        )}
      </main>
    );
  }

  if (loading) return <p className="app-status" role="status">Loading quiz…</p>;
  if (error && !quiz) return <main className="quiz-page"><p className="app-status" role="alert">{error}</p><Link to="/quizzes">Back to quizzes</Link></main>;
  if (!quiz) return null;

  if (result) {
    return (
      <main className="quiz-page">
        <section className="quiz-results">
          <p className="quiz-eyebrow">QUIZ COMPLETED</p>
          <h1>Your Results</h1>
          <p className="quiz-results-description">{quiz.title} · {quiz.course.course_code}</p>
          <div className="quiz-score-circle"><strong>{result.score}%</strong><span>Your score</span></div>
          <p className="quiz-score-summary">Your score has been calculated and saved by the server.</p>
          <div className="quiz-results-actions">
            <button type="button" className="quiz-button quiz-button-primary" onClick={restartQuiz}>Try Again</button>
            <Link to="/student-dashboard" className="quiz-button quiz-button-secondary">Back to Dashboard</Link>
          </div>
        </section>
      </main>
    );
  }

  if (!currentQuestion) {
    return <main className="quiz-page"><p role="alert">This quiz currently has no questions.</p><Link to="/quizzes">Back to quizzes</Link></main>;
  }

  return (
    <main className="quiz-page">
      <header className="quiz-page-header">
        <div><p className="quiz-eyebrow">PRACTICE AND LEARN</p><h1>{quiz.title}</h1><p>{quiz.course.course_code} · {quiz.course.course_title}</p></div>
        <button type="button" className="quiz-back-link" onClick={() => navigate('/quizzes')}>← Quizzes</button>
      </header>
      {error && <p className="app-status" role="alert">{error}</p>}
      <section className="quiz-card">
        <div className="quiz-top-row">
          <span className="quiz-course-label">{quiz.course.course_code}</span>
          <span className="quiz-question-count">Question {currentIndex + 1} of {questions.length}</span>
        </div>
        <div className="quiz-progress-track" role="progressbar" aria-label="Quiz progress" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={currentIndex + 1}>
          <div className="quiz-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="quiz-question-area">
          <h2>{currentQuestion.question_text}</h2>
          <p className="quiz-select-instruction">Choose one answer.</p>
          <div className="quiz-options">
            {currentQuestion.options.map((option, index) => {
              const selected = answers[currentQuestion.id] === index;
              return (
                <button key={`${currentQuestion.id}-${index}`} type="button" className={`quiz-option ${selected ? 'selected' : ''}`} onClick={() => chooseAnswer(index)} aria-pressed={selected}>
                  <span className="quiz-option-letter">{String.fromCharCode(65 + index)}</span>
                  <span className="quiz-option-text">{option}</span>
                  <span className="quiz-option-indicator" aria-hidden="true">{selected ? '✓' : ''}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="quiz-navigation">
          <button type="button" className="quiz-button quiz-button-secondary" onClick={() => setCurrentIndex((index) => index - 1)} disabled={currentIndex === 0}>← Previous</button>
          <span className="quiz-answered-count">{answeredCount} of {questions.length} answered</span>
          {currentIndex < questions.length - 1 ? (
            <button type="button" className="quiz-button quiz-button-primary" onClick={() => setCurrentIndex((index) => index + 1)}>Next →</button>
          ) : (
            <button type="button" className="quiz-button quiz-button-primary" onClick={() => setShowConfirmation(true)} disabled={answeredCount !== questions.length}>Submit Quiz</button>
          )}
        </div>
      </section>
      {showConfirmation && (
        <div className="quiz-modal-backdrop">
          <section className="quiz-confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="quiz-confirm-title">
            <h2 id="quiz-confirm-title">Submit your quiz?</h2>
            <p>You have answered all {questions.length} questions. You cannot change answers after submitting.</p>
            <div className="quiz-modal-actions">
              <button type="button" className="quiz-button quiz-button-secondary" onClick={() => setShowConfirmation(false)} disabled={submitting}>Go Back</button>
              <button type="button" className="quiz-button quiz-button-primary" onClick={submitQuiz} disabled={submitting}>{submitting ? 'Submitting…' : 'Confirm Submit'}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
