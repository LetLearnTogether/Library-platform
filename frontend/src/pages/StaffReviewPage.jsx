import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { apiRequest } from '../lib/api';

const reportStatuses = ['In Review', 'Resolved', 'Dismissed'];
const reportFilters = ['All', 'Open', ...reportStatuses];
const reportSummaryStatuses = ['Open', ...reportStatuses];
const PAGE_SIZE = 20;
const REVIEW_PAGE_SIZE = 20;

export default function StaffReviewPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [reviewPageIndex, setReviewPageIndex] = useState(1);
  const [reviewTotalPages, setReviewTotalPages] = useState(0);
  const [reviewTotalItems, setReviewTotalItems] = useState(0);
  const [reviewNotes, setReviewNotes] = useState({});
  const [reports, setReports] = useState([]);
  const [reportNotes, setReportNotes] = useState({});
  const [reportCounts, setReportCounts] = useState(null);
  const [reportStatus, setReportStatus] = useState('Open');
  const [reportPageIndex, setReportPageIndex] = useState(1);
  const [reportTotalPages, setReportTotalPages] = useState(0);
  const [reportTotalItems, setReportTotalItems] = useState(0);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [revokedDocumentIds, setRevokedDocumentIds] = useState(() => new Set());
  const [removedDocumentIds, setRemovedDocumentIds] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const canManageReports = ['Moderator', 'Admin'].includes(user.role);

  const refreshQueue = useCallback(async () => {
    const queueParams = new URLSearchParams({
      page: String(reviewPageIndex),
      page_size: String(REVIEW_PAGE_SIZE),
    });
    const queue = await apiRequest(`/documents/review-queue?${queueParams}`);
    setDocuments(queue.items);
    setReviewTotalPages(queue.total_pages);
    setReviewTotalItems(queue.total_items);
    if (reviewPageIndex > Math.max(1, queue.total_pages)) {
      setReviewPageIndex(Math.max(1, queue.total_pages));
    }
  }, [reviewPageIndex]);

  const refreshReports = useCallback(async () => {
    if (!canManageReports) return;
    const reportParams = new URLSearchParams({
      page: String(reportPageIndex),
      page_size: String(PAGE_SIZE),
    });
    if (reportStatus !== 'All') reportParams.set('status', reportStatus);
    const reportPage = await apiRequest(`/reports?${reportParams}`);
    setReports(reportPage.items);
    setReportNotes(Object.fromEntries(reportPage.items.map((report) => [report.id, report.moderator_note || ''])));
    setReportTotalPages(reportPage.total_pages);
    setReportTotalItems(reportPage.total_items);
    if (reportPageIndex > Math.max(1, reportPage.total_pages)) {
      setReportPageIndex(Math.max(1, reportPage.total_pages));
    }
  }, [canManageReports, reportPageIndex, reportStatus]);

  const loadReportCounts = useCallback(async () => {
    if (!canManageReports) return {};
    const counts = await Promise.all(reportSummaryStatuses.map(async (status) => {
      const params = new URLSearchParams({ page: '1', page_size: '1', status });
      const result = await apiRequest(`/reports?${params}`);
      return [status, result.total_items];
    }));
    return Object.fromEntries(counts);
  }, [canManageReports]);

  useEffect(() => {
    let active = true;
    Promise.all([refreshQueue(), refreshReports()])
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => {
        if (!active) return;
        setLoading(false);
        setReportsLoading(false);
      });
    return () => { active = false; };
  }, [refreshQueue, refreshReports]);

  useEffect(() => {
    let active = true;
    loadReportCounts()
      .then((counts) => { if (active) setReportCounts(counts); })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [loadReportCounts]);

  function filterReportsByStatus(status) {
    setReportsLoading(true);
    setReportStatus(status);
    setReportPageIndex(1);
    document.getElementById('document-reports')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function reviewDocument(documentId, action) {
    const reviewNote = (reviewNotes[documentId] || '').trim();
    setWorkingId(`document-${documentId}`);
    setError('');
    setMessage('');
    try {
      await apiRequest(`/documents/${documentId}/review`, {
        method: 'PUT',
        body: { action, review_note: reviewNote || null },
      });
      setMessage(`Document ${action === 'approve' ? 'approved' : 'rejected'}.`);
      setReviewNotes((current) => {
        const next = { ...current };
        delete next[documentId];
        return next;
      });
      try {
        await refreshQueue();
      } catch (requestError) {
        setError(`The review was saved, but the queue could not refresh: ${requestError.message}`);
      }
    } catch (requestError) {
      setError(requestError.message || 'The review could not be saved.');
    } finally {
      setWorkingId(null);
    }
  }

  async function updateReport(reportId, status, moderatorNote) {
    setWorkingId(`report-${reportId}`);
    setError('');
    setMessage('');
    try {
      await apiRequest(`/reports/${reportId}`, {
        method: 'PUT',
        body: { status, moderator_note: moderatorNote.trim() || null },
      });
      setMessage(status === reports.find((report) => report.id === reportId)?.status
        ? 'Moderator note saved.'
        : 'Report status updated.');
      setReportsLoading(true);
      try {
        await refreshReports();
        setReportCounts(await loadReportCounts());
      } catch (requestError) {
        setError(`The report was updated, but the list could not refresh: ${requestError.message}`);
      } finally {
        setReportsLoading(false);
      }
    } catch (requestError) {
      setError(requestError.message || 'The report update could not be saved.');
    } finally {
      setWorkingId(null);
    }
  }

  async function revokeDocument(documentId) {
    if (!window.confirm('Revoke this document’s verification stamp? It will no longer appear in the public library, and its verification page will show Revoked.')) return;
    setWorkingId(`revoke-${documentId}`);
    setError('');
    setMessage('');
    try {
      await apiRequest(`/documents/${documentId}/revoke`, { method: 'PUT' });
      setRevokedDocumentIds((current) => new Set(current).add(documentId));
      setMessage(`Document #${documentId} verification stamp revoked. It is no longer available in the public library.`);
      try {
        setReportsLoading(true);
        const [, , counts] = await Promise.all([refreshQueue(), refreshReports(), loadReportCounts()]);
        setReportCounts(counts);
      } catch (requestError) {
        setError(`The stamp was revoked, but the moderation list could not refresh: ${requestError.message}`);
      } finally {
        setReportsLoading(false);
      }
    } catch (requestError) {
      setError(requestError.message || 'The verification stamp could not be revoked.');
    } finally {
      setWorkingId(null);
    }
  }

  async function removeDocument(documentId) {
    if (!window.confirm('Permanently remove this document file? The document will no longer be available to anyone.')) return;
    setWorkingId(`remove-${documentId}`);
    setError('');
    setMessage('');
    try {
      await apiRequest(`/documents/${documentId}`, { method: 'DELETE' });
      setRemovedDocumentIds((current) => new Set(current).add(documentId));
      setMessage(`Document #${documentId} was removed.`);
    } catch (requestError) {
      setError(requestError.message || 'The document could not be removed.');
    } finally {
      setWorkingId(null);
    }
  }

  async function openReviewFile(documentId) {
    const previewWindow = window.open('about:blank', '_blank');
    if (!previewWindow) {
      setError('Allow pop-ups to preview a submitted file.');
      return;
    }
    previewWindow.opener = null;
    setWorkingId(`preview-${documentId}`);
    setError('');
    try {
      const response = await apiRequest(`/documents/${documentId}/review-content`);
      const objectUrl = URL.createObjectURL(await response.blob());
      previewWindow.location.href = objectUrl;
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (requestError) {
      previewWindow.close();
      setError(requestError.message || 'The submitted file could not be opened.');
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <main className="staff-page">
      <header className="staff-heading">
        <p className="eyebrow">{user.role === 'Moderator' ? 'PLATFORM-WIDE MODERATION' : `STAFF WORKSPACE · ${user.role}`}</p>
        <h1>{user.role === 'Lecturer' ? 'Course submission review' : user.role === 'Moderator' ? 'Moderation center' : 'Review and moderation'}</h1>
        <p>{user.role === 'Lecturer'
          ? 'Review student submissions for courses assigned to you.'
          : user.role === 'Moderator'
            ? 'Review submissions across all courses, resolve content reports, and withdraw or remove material that violates platform standards.'
            : 'Review pending submissions and protect the trusted learning library.'}</p>
      </header>
      {error && <p className="app-status" role="alert">{error}</p>}
      {message && <p className="app-status" role="status">{message}</p>}
      {user.role === 'Moderator' && (
        <section className="moderation-overview" aria-label="Moderation overview">
          <a className="moderation-stat moderation-stat-queue" href="#review-queue">
            <span>Pending submissions</span>
            <strong>{loading ? '—' : reviewTotalItems}</strong>
            <small>Across all courses</small>
          </a>
          {reportSummaryStatuses.map((status) => (
            <button
              type="button"
              key={status}
              className={`moderation-stat moderation-stat-${status.toLowerCase().replaceAll(' ', '-')}${reportStatus === status ? ' moderation-stat-active' : ''}`}
              aria-pressed={reportStatus === status}
              onClick={() => filterReportsByStatus(status)}
            >
              <span>{status} reports</span>
              <strong>{reportCounts ? reportCounts[status] : '—'}</strong>
              <small>{reportStatus === status ? 'Currently selected' : 'View reports'}</small>
            </button>
          ))}
        </section>
      )}
      {loading ? <p className="app-status" role="status">Loading review queue…</p> : (
        <section className="staff-section">
          <div className="staff-review-queue-heading" id="review-queue">
            <div>
              <h2>Documents awaiting review</h2>
              <p>{reviewTotalItems} {reviewTotalItems === 1 ? 'submission' : 'submissions'}</p>
            </div>
            {reviewTotalPages > 0 && (
              <span>Page {reviewPageIndex} of {reviewTotalPages}</span>
            )}
          </div>
          {documents.length ? documents.map((document) => (
            <article className="staff-card" key={document.id}>
              <div>
                <span className="course-code">{document.course.course_code}</span>
                <h3>{document.filename}</h3>
                <p>{document.course.course_title} · {document.course.year} · {document.course.semester} · {document.document_type}</p>
                <button type="button" className="staff-file-link" onClick={() => openReviewFile(document.id)}>Preview submitted file</button>
                <label className="staff-review-note">
                  Review note <span>(optional, visible to the student)</span>
                  <textarea
                    value={reviewNotes[document.id] || ''}
                    maxLength={1000}
                    rows={3}
                    placeholder="Explain the decision or suggest what should be corrected."
                    onChange={(event) => setReviewNotes((current) => ({
                      ...current,
                      [document.id]: event.target.value,
                    }))}
                  />
                  <small>{(reviewNotes[document.id] || '').length}/1000</small>
                </label>
              </div>
              <div className="staff-actions">
                <button type="button" className="primary-button" disabled={Boolean(workingId)} onClick={() => reviewDocument(document.id, 'approve')}>Approve</button>
                <button type="button" className="secondary-button" disabled={Boolean(workingId)} onClick={() => reviewDocument(document.id, 'reject')}>Reject</button>
              </div>
            </article>
          )) : <p className="dashboard-empty">There are no documents awaiting your review.</p>}
          {reviewTotalPages > 1 && (
            <nav className="staff-report-pagination" aria-label="Review queue pages">
              <button
                type="button"
                className="secondary-button"
                disabled={loading || reviewPageIndex === 1}
                onClick={() => {
                  setLoading(true);
                  setReviewPageIndex((current) => current - 1);
                }}
              >
                Previous
              </button>
              <span>Page {reviewPageIndex} of {reviewTotalPages}</span>
              <button
                type="button"
                className="secondary-button"
                disabled={loading || reviewPageIndex === reviewTotalPages}
                onClick={() => {
                  setLoading(true);
                  setReviewPageIndex((current) => current + 1);
                }}
              >
                Next
              </button>
            </nav>
          )}
        </section>
      )}

      {canManageReports && (
        <section className="staff-section">
          <div className="staff-reports-heading" id="document-reports">
            <div>
              <h2>Document reports</h2>
              <p>{reportTotalItems} {reportTotalItems === 1 ? 'report' : 'reports'}</p>
            </div>
            <label>
              <span>Filter by status</span>
              <select
                value={reportStatus}
                onChange={(event) => {
                  setReportsLoading(true);
                  setReportStatus(event.target.value);
                  setReportPageIndex(1);
                }}
              >
                {reportFilters.map((status) => <option key={status} value={status}>{status === 'All' ? 'All statuses' : status}</option>)}
              </select>
            </label>
          </div>
          {reportsLoading ? (
            <p className="app-status" role="status">Loading reports…</p>
          ) : reports.length ? reports.map((report) => (
            <article className="staff-card" key={report.id}>
              <div>
                <span className="course-code">{report.document.course.course_code} · Document #{report.document_id}</span>
                <h3>Report #{report.id}</h3>
                <p><strong>{report.document.filename}</strong> · {report.document.document_type}</p>
                <p>{report.document.course.course_title} · {report.document.course.year} · {report.document.course.semester}</p>
                <p>Reported by {report.submitter_name}</p>
                <span className={`staff-report-status status-${report.status.toLowerCase().replaceAll(' ', '-')}`}>{report.status}</span>
                <p>{report.reason}</p>
                <p>Submitted {new Date(report.created_at).toLocaleString()}</p>
                {removedDocumentIds.has(report.document_id)
                  ? <span>Document file removed</span>
                  : <a href={`/api/v1/documents/${report.document_id}/content?disposition=inline`} target="_blank" rel="noreferrer">Open verified document</a>}
                <label className="staff-review-note">
                  Moderator note
                  <textarea
                    value={reportNotes[report.id] ?? ''}
                    maxLength={2000}
                    rows={3}
                    placeholder="Record the moderation decision or follow-up."
                    onChange={(event) => setReportNotes((current) => ({
                      ...current,
                      [report.id]: event.target.value,
                    }))}
                  />
                  <small>{(reportNotes[report.id] ?? '').length}/2000</small>
                </label>
              </div>
              <div className="staff-actions">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={Boolean(workingId)}
                  onClick={() => updateReport(report.id, report.status, reportNotes[report.id] ?? '')}
                >
                  Save note
                </button>
                {reportStatuses.filter((status) => status !== report.status).map((status) => (
                  <button type="button" key={status} className="secondary-button" disabled={Boolean(workingId)} onClick={() => updateReport(report.id, status, reportNotes[report.id] ?? '')}>{status}</button>
                ))}
                <button
                  type="button"
                  className="staff-revoke-button"
                  disabled={Boolean(workingId) || revokedDocumentIds.has(report.document_id)}
                  onClick={() => revokeDocument(report.document_id)}
                >
                  {revokedDocumentIds.has(report.document_id) ? 'Stamp revoked' : 'Revoke verification'}
                </button>
                <button
                  type="button"
                  className="staff-revoke-button"
                  disabled={Boolean(workingId) || removedDocumentIds.has(report.document_id)}
                  onClick={() => removeDocument(report.document_id)}
                >
                  {removedDocumentIds.has(report.document_id) ? 'File removed' : 'Remove document'}
                </button>
              </div>
            </article>
          )) : <p className="dashboard-empty">There are no reports {reportStatus === 'All' ? '' : `with status "${reportStatus}"`}.</p>}
          {!reportsLoading && reportTotalPages > 1 && (
            <nav className="staff-report-pagination" aria-label="Report pages">
              <button
                type="button"
                className="secondary-button"
                disabled={reportPageIndex === 1}
                onClick={() => {
                  setReportsLoading(true);
                  setReportPageIndex((current) => current - 1);
                }}
              >
                Previous
              </button>
              <span>Page {reportPageIndex} of {reportTotalPages}</span>
              <button
                type="button"
                className="secondary-button"
                disabled={reportPageIndex === reportTotalPages}
                onClick={() => {
                  setReportsLoading(true);
                  setReportPageIndex((current) => current + 1);
                }}
              >
                Next
              </button>
            </nav>
          )}
        </section>
      )}
    </main>
  );
}
