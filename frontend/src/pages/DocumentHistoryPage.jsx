import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { apiRequest, downloadDocument, getVerificationUrl } from '../lib/api';
import './DocumentHistoryPage.css';

const PAGE_SIZE = 20;
const statuses = ['Under Review', 'Verified', 'Rejected', 'Revoked'];

export function DocumentSubmissionsPanel({ embedded = false }) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewError, setViewError] = useState('');
  const [viewingId, setViewingId] = useState(null);
  const [workingId, setWorkingId] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
    if (status !== 'All') params.set('status', status);

    apiRequest(`/documents/mine?${params}`)
      .then((result) => {
        if (!active) return;
        setDocuments(result.items);
        setTotalPages(result.total_pages);
        setTotalItems(result.total_items);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Unable to load your document submissions.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [page, status, reload]);

  function retry() {
    setLoading(true);
    setError('');
    setReload((current) => current + 1);
  }

  function changePage(nextPage) {
    setLoading(true);
    setError('');
    setPage(nextPage);
  }

  function changeStatus(event) {
    setLoading(true);
    setError('');
    setStatus(event.target.value);
    setPage(1);
  }

  async function viewDocument(document) {
    const previewWindow = window.open('about:blank', '_blank');
    if (!previewWindow) {
      setViewError('Allow pop-ups to preview this document.');
      return;
    }
    setViewError('');
    setViewingId(document.id);
    previewWindow.document.title = 'Loading document';
    previewWindow.document.body.textContent = 'Loading document preview…';
    try {
      const response = await downloadDocument(document.id);
      const objectUrl = URL.createObjectURL(await response.blob());
      previewWindow.opener = null;
      previewWindow.location.href = objectUrl;
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (requestError) {
      previewWindow.close();
      setViewError(requestError.message || 'The document could not be opened.');
    } finally {
      setViewingId(null);
    }
  }

  async function removeMaterial(document) {
    if (!window.confirm(`Remove "${document.filename}" from the public library?`)) return;
    setWorkingId(document.id);
    setError('');
    setMessage('');
    try {
      await apiRequest(`/documents/${document.id}`, { method: 'DELETE' });
      setMessage('Material removed from the public library.');
      setLoading(true);
      setReload((current) => current + 1);
    } catch (requestError) {
      setError(requestError.message || 'The material could not be removed.');
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <section
      className={`document-history-panel${embedded ? ' document-history-panel-embedded' : ''}`}
      aria-labelledby="document-history-title"
    >
        <div className="document-history-panel-heading">
          <div>
            <h2 id="document-history-title">{embedded ? 'Your uploads' : 'Your submissions'}</h2>
            <p>{totalItems} {totalItems === 1 ? 'document' : 'documents'}</p>
          </div>
          <label className="document-history-status-filter">
            <span>Review status</span>
            <select value={status} onChange={changeStatus}>
              <option value="All">All statuses</option>
              {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>

        {error && <p className="app-status" role="alert">{error}</p>}
        {viewError && <p className="app-status" role="alert">{viewError}</p>}
        {message && <p className="app-status" role="status">{message}</p>}
        {loading ? (
          <p className="app-status" role="status">Loading your submissions…</p>
        ) : error ? (
          <button type="button" className="document-history-button" onClick={retry}>Try again</button>
        ) : documents.length ? (
          <>
            <div className="document-history-list">
              {documents.map((document) => {
                const normalizedStatus = document.status.toLowerCase().replaceAll(' ', '-');
                return (
                  <article className="document-history-item" key={document.id}>
                    <div className="document-history-icon" aria-hidden="true">▤</div>
                    <div className="document-history-details">
                      <h3>{document.filename}</h3>
                      <p>
                        {document.course.course_code} · {document.document_type}
                        <span aria-hidden="true"> · </span>
                        Submitted {new Date(document.created_at).toLocaleDateString()}
                      </p>
                      {document.review_note && <p className="document-history-note">Review note: {document.review_note}</p>}
                    </div>
                    <div className="document-history-actions">
                      <span className={`document-history-status status-${normalizedStatus}`}>{document.status}</span>
                      {document.status === 'Verified' && (
                        <>
                          <button
                            type="button"
                            className="document-history-button"
                            disabled={viewingId === document.id}
                            onClick={() => void viewDocument(document)}
                          >
                            {viewingId === document.id ? 'Opening…' : 'View document'}
                          </button>
                          {document.verification_token && (
                            <Link to={getVerificationUrl(document.verification_token)}>Verify stamp</Link>
                          )}
                          {user.role === 'Lecturer' && document.uploaded_by === user.id && document.status !== 'Revoked' && (
                            <button
                              type="button"
                              className="document-history-button"
                              disabled={workingId === document.id}
                              onClick={() => removeMaterial(document)}
                            >
                              {workingId === document.id ? 'Removing…' : 'Remove from library'}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            {totalPages > 1 && (
              <nav className="document-history-pagination" aria-label="Document submission pages">
                <button
                  type="button"
                  className="document-history-button"
                  disabled={page === 1}
                  onClick={() => changePage(page - 1)}
                >
                  Previous
                </button>
                <span>Page {page} of {totalPages}</span>
                <button
                  type="button"
                  className="document-history-button"
                  disabled={page === totalPages}
                  onClick={() => changePage(page + 1)}
                >
                  Next
                </button>
              </nav>
            )}
          </>
        ) : (
          <div className="document-history-empty">
            <span aria-hidden="true">▤</span>
            <h3>{status === 'All' ? 'No submissions yet' : `No ${status.toLowerCase()} submissions`}</h3>
            <p>Your uploaded documents and their review status will appear here.</p>
            {!embedded && <Link to="/upload" className="document-history-button">Upload your first document</Link>}
          </div>
        )}
    </section>
  );
}

export default function DocumentHistoryPage() {
  const [downloads, setDownloads] = useState([]);
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    apiRequest('/activity/downloads/mine?limit=20')
      .then(setDownloads)
      .catch((requestError) => setDownloadError(requestError.message || 'Download history could not be loaded.'));
  }, []);

  return (
    <main className="document-history-page">
      <header className="document-history-header">
        <div>
          <p className="eyebrow">YOUR CONTRIBUTIONS</p>
          <h1>Document submissions</h1>
          <p>Track the review status of the materials you have uploaded.</p>
        </div>
        <Link to="/upload" className="document-history-upload-link">Upload a document</Link>
      </header>
      <section className="document-history-downloads" aria-labelledby="download-history-title">
        <div><p className="eyebrow">RECENT ACCESS</p><h2 id="download-history-title">Downloaded documents</h2></div>
        {downloadError && <p role="alert">{downloadError}</p>}
        {!downloadError && downloads.length === 0 && <p>No documents downloaded yet.</p>}
        {downloads.length > 0 && (
          <div className="document-history-table">
            {downloads.map((item) => (
              <article key={`${item.document_id}-${item.downloaded_at}`}>
                <div><strong>{item.filename}</strong>{item.course_code && <span>{item.course_code}</span>}</div>
                <time dateTime={item.downloaded_at}>{new Date(item.downloaded_at).toLocaleString()}</time>
              </article>
            ))}
          </div>
        )}
      </section>
      <DocumentSubmissionsPanel />
    </main>
  );
}
