import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../lib/api.js';
import './QuizResultsPage.css';

const PAGE_SIZE = 20;

function percentage(value) {
  return value == null ? '—' : `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}

export default function QuizResultsPage() {
  const { quizId } = useParams();
  const [results, setResults] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    apiRequest(`/quizzes/${encodeURIComponent(quizId)}/results?page=${page}&page_size=${PAGE_SIZE}`)
      .then((report) => {
        if (active) {
          setResults(report);
          setError('');
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Quiz results could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [quizId, page, retry]);

  const retryLoading = useCallback(() => {
    setLoading(true);
    setError('');
    setRetry((current) => current + 1);
  }, []);

  return (
    <main className="quiz-results-page">
      <header className="quiz-results-header">
        <div>
          <p className="quiz-eyebrow">QUIZ PERFORMANCE REPORT</p>
          <h1>{results?.quiz_title || 'Quiz results'}</h1>
          {results && (
            <p>{results.course.course_code} · {results.course.course_title} · {results.course.year} · {results.course.semester} semester</p>
          )}
        </div>
        <Link to="/quiz-management" className="quiz-results-back">Back to quizzes</Link>
      </header>

      {error && (
        <div className="quiz-results-error" role="alert">
          <p>{error}</p>
          <button type="button" className="quiz-management-secondary" onClick={retryLoading}>Retry</button>
        </div>
      )}

      {loading && <p className="app-status" role="status">Loading quiz performance…</p>}

      {!loading && !error && results && (
        <>
          <section className="quiz-results-summary" aria-label="Quiz summary">
            <article><span>Total attempts</span><strong>{results.attempt_count}</strong></article>
            <article><span>Average score</span><strong>{percentage(results.average_score)}</strong></article>
            <article><span>Questions</span><strong>{results.questions.length}</strong></article>
          </section>

          <section className="quiz-results-panel" aria-labelledby="question-performance-title">
            <div className="quiz-results-section-heading">
              <div>
                <h2 id="question-performance-title">Question performance</h2>
                <p>Answer choices and accuracy show where students may need more practice.</p>
              </div>
            </div>
            {results.questions.length === 0 ? (
              <p className="quiz-results-empty">This quiz currently has no questions.</p>
            ) : (
              <div className="quiz-question-results">
                {results.questions.map((question) => (
                  <article className="quiz-question-result" key={`${question.question_order}-${question.question_text}`}>
                    <div className="quiz-question-result-heading">
                      <div>
                        <span className="quiz-question-number">QUESTION {question.question_order}</span>
                        <h3>{question.question_text}</h3>
                      </div>
                      <span className="quiz-question-accuracy">
                        {question.correct_percentage == null ? 'No answer data yet' : `${percentage(question.correct_percentage)} correct`}
                      </span>
                    </div>
                    <p className="quiz-question-response-count">
                      {question.total_responses} {question.total_responses === 1 ? 'response' : 'responses'}
                    </p>
                    <div className="quiz-answer-options">
                      {question.options.map((option) => (
                        <div
                          className={`quiz-answer-option${option.is_correct ? ' quiz-answer-option-correct' : ''}`}
                          key={option.option_text}
                        >
                          <span className="quiz-answer-option-label">
                            {option.option_text}
                            {option.is_correct && <strong>Correct answer</strong>}
                          </span>
                          <span className="quiz-answer-count">{option.selection_count} · {percentage(option.percentage)}</span>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
            {results.attempt_count > 0 && results.questions.every((question) => question.total_responses === 0) && (
              <p className="quiz-results-history-note">
                Earlier attempts’ scores are included above. Per-question answer breakdown is available for attempts submitted after this feature was enabled.
              </p>
            )}
          </section>

          <section className="quiz-results-panel" aria-labelledby="student-attempts-title">
            <div className="quiz-results-section-heading">
              <div>
                <h2 id="student-attempts-title">Student attempts</h2>
                <p>Most recent attempts first.</p>
              </div>
              {results.total_pages > 0 && <span>Page {results.page} of {results.total_pages}</span>}
            </div>
            {results.attempts.length === 0 ? (
              <p className="quiz-results-empty">No students have attempted this quiz yet.</p>
            ) : (
              <div className="quiz-attempt-results-list">
                {results.attempts.map((attempt) => (
                  <article className="quiz-attempt-result" key={attempt.id}>
                    <div>
                      <h3>{attempt.student_name}</h3>
                      <p>{new Date(attempt.attempted_at).toLocaleString()} · {attempt.total_questions} {attempt.total_questions === 1 ? 'question' : 'questions'}</p>
                    </div>
                    <strong>{percentage(attempt.score)}</strong>
                  </article>
                ))}
              </div>
            )}
            {results.total_pages > 1 && (
              <nav className="quiz-results-pagination" aria-label="Student attempt pages">
                <button
                  type="button"
                  className="quiz-management-secondary"
                  disabled={page <= 1}
                  onClick={() => { setLoading(true); setPage((current) => current - 1); }}
                >
                  Previous
                </button>
                <span>Page {results.page} of {results.total_pages}</span>
                <button
                  type="button"
                  className="quiz-management-secondary"
                  disabled={page >= results.total_pages}
                  onClick={() => { setLoading(true); setPage((current) => current + 1); }}
                >
                  Next
                </button>
              </nav>
            )}
          </section>
        </>
      )}
    </main>
  );
}
