import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { apiRequest } from '../lib/api';

const reportStatuses = ['In Review', 'Resolved', 'Dismissed'];

export default function StaffReviewPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const canManageReports = ['Moderator', 'Admin'].includes(user.role);

  const refresh = useCallback(async () => {
    const [queue, reportPage] = await Promise.all([
      apiRequest('/documents/review-queue?page=1&page_size=100'),
      canManageReports ? apiRequest('/reports?page=1&page_size=100&status=Open') : Promise.resolve({ items: [] }),
    ]);
    setDocuments(queue.items);
    setReports(reportPage.items);
  }, [canManageReports]);

  useEffect(() => {
    let active = true;
    refresh()
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refresh]);

  async function reviewDocument(documentId, action) {
    setWorkingId(`document-${documentId}`);
    setError('');
    setMessage('');
    try {
      await apiRequest(`/documents/${documentId}/review`, {
        method: 'PUT',
        body: { action },
      });
      setMessage(`Document ${action === 'approve' ? 'approved' : 'rejected'}.`);
      await refresh();
    } catch (requestError) {
      setError(requestError.message || 'The review could not be saved.');
    } finally {
      setWorkingId(null);
    }
  }

  async function updateReport(reportId, status) {
    setWorkingId(`report-${reportId}`);
    setError('');
    setMessage('');
    try {
      await apiRequest(`/reports/${reportId}`, {
        method: 'PUT',
        body: { status },
      });
      setMessage('Report status updated.');
      await refresh();
    } catch (requestError) {
      setError(requestError.message || 'The report update could not be saved.');
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
        <p className="eyebrow">STAFF WORKSPACE · {user.role}</p>
        <h1>Review and moderation</h1>
        <p>Review pending submissions. Lecturer queues contain only assigned courses.</p>
      </header>
      {error && <p className="app-status" role="alert">{error}</p>}
      {message && <p className="app-status" role="status">{message}</p>}
      {loading ? <p className="app-status" role="status">Loading review queue…</p> : (
        <section className="staff-section">
          <h2>Documents awaiting review</h2>
          {documents.length ? documents.map((document) => (
            <article className="staff-card" key={document.id}>
              <div>
                <span className="course-code">{document.course.course_code}</span>
                <h3>{document.filename}</h3>
                <p>{document.course.course_title} · {document.course.year} · {document.course.semester} · {document.document_type}</p>
                <button type="button" className="staff-file-link" onClick={() => openReviewFile(document.id)}>Preview submitted file</button>
              </div>
              <div className="staff-actions">
                <button type="button" className="primary-button" disabled={Boolean(workingId)} onClick={() => reviewDocument(document.id, 'approve')}>Approve</button>
                <button type="button" className="secondary-button" disabled={Boolean(workingId)} onClick={() => reviewDocument(document.id, 'reject')}>Reject</button>
              </div>
            </article>
          )) : <p className="dashboard-empty">There are no documents awaiting your review.</p>}
        </section>
      )}

      {canManageReports && (
        <section className="staff-section">
          <h2>Open reports</h2>
          {reports.length ? reports.map((report) => (
            <article className="staff-card" key={report.id}>
              <div>
                <span className="course-code">Document #{report.document_id}</span>
                <h3>Report #{report.id}</h3>
                <p>{report.reason}</p>
                <a href={`/api/v1/documents/${report.document_id}/content?disposition=inline`} target="_blank" rel="noreferrer">Open verified document</a>
              </div>
              <div className="staff-actions">
                {reportStatuses.map((status) => (
                  <button type="button" key={status} className="secondary-button" disabled={Boolean(workingId)} onClick={() => updateReport(report.id, status)}>{status}</button>
                ))}
              </div>
            </article>
          )) : <p className="dashboard-empty">There are no open reports.</p>}
        </section>
      )}
    </main>
  );
}
