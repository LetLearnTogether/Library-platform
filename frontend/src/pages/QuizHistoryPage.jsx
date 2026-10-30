import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import './QuizHistoryPage.css';

const PAGE_SIZE = 20;

export default function QuizHistoryPage() {
  const [attempts, setAttempts] = useState([]);
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    apiRequest(`/quiz-attempts/mine?page=${page}&page_size=${PAGE_SIZE}`)
      .then((result) => {
        if (!active) return;
        setAttempts(result.items);
        setTotalPages(result.total_pages);
        setTotalItems(result.total_items);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Unable to load quiz history.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [page, reload]);

  function changePage(nextPage) {
    setLoading(true);
    setError('');
    setPage(nextPage);
  }

  function retry() {
    setLoading(true);
    setError('');
    setReload((current) => current + 1);
  }

  return (
    <main className="quiz-history-page">
      <header className="quiz-history-header">
        <div>
          <p className="quiz-eyebrow">YOUR LEARNING ACTIVITY</p>
          <h1>Quiz history</h1>
          <p>Review your completed quizzes and server-calculated scores.</p>
        </div>
        <Link to="/quizzes" className="quiz-history-back-link">Browse quizzes</Link>
      </header>

      <section className="quiz-history-panel" aria-labelledby="quiz-history-title">
        <div className="quiz-history-panel-heading">
          <div>
            <h2 id="quiz-history-title">Your attempts</h2>
            <p>{totalItems} {totalItems === 1 ? 'attempt' : 'attempts'} recorded</p>
          </div>
          {!loading && totalPages > 0 && (
            <span className="quiz-history-page-count">Page {page} of {totalPages}</span>
          )}
        </div>

        {error && <p className="app-status" role="alert">{error}</p>}
        {loading ? (
          <p className="app-status" role="status">Loading your quiz history…</p>
        ) : error ? (
          <button type="button" className="quiz-button quiz-button-secondary" onClick={retry}>
            Try again
          </button>
        ) : attempts.length ? (
          <>
            <div className="quiz-history-list">
              {attempts.map((attempt) => (
                <article className="quiz-history-item" key={attempt.id}>
                  <div className="quiz-history-item-icon" aria-hidden="true">✓</div>
                  <div className="quiz-history-item-details">
                    <h3>{attempt.quiz_title}</h3>
                    <p>
                      {new Date(attempt.attempted_at).toLocaleString()}
                      <span aria-hidden="true"> · </span>
                      {attempt.total_questions} {attempt.total_questions === 1 ? 'question' : 'questions'}
                    </p>
                  </div>
                  <span className="quiz-history-score">{Number(attempt.score).toLocaleString(undefined, { maximumFractionDigits: 2 })}%</span>
                </article>
              ))}
            </div>

            {totalPages > 1 && (
              <nav className="quiz-history-pagination" aria-label="Quiz history pages">
                <button
                  type="button"
                  className="quiz-button quiz-button-secondary"
                  disabled={page === 1}
                  onClick={() => changePage(page - 1)}
                >
                  Previous
                </button>
                <span>Page {page} of {totalPages}</span>
                <button
                  type="button"
                  className="quiz-button quiz-button-secondary"
                  disabled={page === totalPages}
                  onClick={() => changePage(page + 1)}
                >
                  Next
                </button>
              </nav>
            )}
          </>
        ) : (
          <div className="quiz-history-empty">
            <span aria-hidden="true">📝</span>
            <h3>No quiz attempts yet</h3>
            <p>Your completed quizzes and scores will appear here.</p>
            <Link to="/quizzes" className="quiz-button quiz-button-primary">Explore quizzes</Link>
          </div>
        )}
      </section>
    </main>
  );
}
