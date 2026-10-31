import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../lib/api.js';
import './AdminActivityPage.css';

const PAGE_SIZE = 20;

export default function AdminActivityPage() {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    apiRequest(`/activity?page=${page}&page_size=${PAGE_SIZE}`)
      .then((response) => {
        if (active) {
          setResult(response);
          setError('');
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'The activity log could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [page, retry]);

  const retryLoading = useCallback(() => {
    setLoading(true);
    setError('');
    setRetry((current) => current + 1);
  }, []);

  return (
    <main className="admin-activity-page">
      <header className="admin-activity-heading">
        <p className="eyebrow">ADMINISTRATION</p>
        <h1>Activity log</h1>
        <p>Review recent account, course, document-review, and system-setting changes.</p>
      </header>

      {error && (
        <div className="admin-activity-error" role="alert">
          <p>{error}</p>
          <button type="button" className="secondary-button" onClick={retryLoading}>Retry</button>
        </div>
      )}

      <section className="admin-activity-card" aria-label="Recent platform activity">
        {loading && <p className="admin-activity-status" role="status">Loading activity…</p>}
        {!loading && !error && result?.items.length === 0 && (
          <p className="admin-activity-status">No platform activity has been recorded yet.</p>
        )}
        {!loading && !error && result?.items.length > 0 && (
          <ol className="admin-activity-list">
            {result.items.map((item) => (
              <li className="admin-activity-item" key={item.id}>
                <span className="admin-activity-marker" aria-hidden="true" />
                <div className="admin-activity-copy">
                  <p>{item.summary}</p>
                  <span>{item.actor_name} · {item.actor_role}</span>
                </div>
                <time dateTime={item.created_at}>
                  {new Date(item.created_at).toLocaleString()}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>

      {result?.total_pages > 1 && (
        <nav className="admin-activity-pagination" aria-label="Activity pages">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1 || loading}
          >
            Previous
          </button>
          <span>Page {result.page} of {result.total_pages} · {result.total_items} activities</span>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setPage((current) => Math.min(result.total_pages, current + 1))}
            disabled={page >= result.total_pages || loading}
          >
            Next
          </button>
        </nav>
      )}
    </main>
  );
}
