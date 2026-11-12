import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../lib/api';
import './AdminStudentVerificationsPage.css';

export default function AdminStudentVerificationsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [reviewNotes, setReviewNotes] = useState({});
  const [previewUrls, setPreviewUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workingId, setWorkingId] = useState(null);
  const [retry, setRetry] = useState(0);
  const previewUrlsRef = useRef(new Set());

  useEffect(() => () => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  useEffect(() => {
    let active = true;
    const filter = statusFilter ? `&status=${encodeURIComponent(statusFilter)}` : '';
    apiRequest(`/student-verifications/review-queue?page=${page}&page_size=20${filter}`)
      .then((result) => {
        if (active) {
          setSubmissions(result.items);
          setTotalPages(result.total_pages);
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Student verification submissions could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [statusFilter, page, retry]);

  async function showImage(submission, side) {
    const key = `${submission.id}-${side}`;
    setError('');
    try {
      const response = await apiRequest(`/student-verifications/${submission.id}/${side}-image`);
      if (!(response instanceof Response)) throw new Error('The student ID image could not be opened.');
      const objectUrl = URL.createObjectURL(await response.blob());
      previewUrlsRef.current.add(objectUrl);
      setPreviewUrls((current) => ({ ...current, [key]: objectUrl }));
    } catch (requestError) {
      setError(requestError.message || 'The student ID image could not be opened.');
    }
  }

  async function reviewSubmission(submission, action) {
    setWorkingId(submission.id);
    setError('');
    try {
      const updated = await apiRequest(`/student-verifications/${submission.id}/review`, {
        method: 'PUT',
        body: { action, review_note: reviewNotes[submission.id] || null },
      });
      setSubmissions((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setReviewNotes((current) => ({ ...current, [submission.id]: '' }));
    } catch (requestError) {
      setError(requestError.message || 'The student verification could not be reviewed.');
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <main className="staff-page admin-student-verifications">
      <header className="staff-heading">
        <div>
          <p className="eyebrow">ADMINISTRATOR WORKSPACE</p>
          <h1>Student verification submissions</h1>
          <p>Review student ID cards and the college and department details submitted by students.</p>
        </div>
        <label className="student-verification-filter">
          Submission status
          <select
            value={statusFilter}
            onChange={(event) => {
              setLoading(true);
              setError('');
              setPage(1);
              setStatusFilter(event.target.value);
            }}
          >
            <option value="Pending">Pending</option>
            <option value="">All submissions</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </label>
      </header>

      {error && <p className="form-error" role="alert">{error}</p>}
      {loading && <p className="app-status" role="status">Loading student verification submissions…</p>}
      {!loading && !error && submissions.length === 0 && (
        <section className="student-verification-empty">
          <h2>No submissions found</h2>
          <p>Student verification submissions matching this status will appear here.</p>
        </section>
      )}

      <section className="student-verification-review-list" aria-label="Student verification submissions">
        {submissions.map((submission) => (
          <article className="student-verification-review-card" key={submission.id}>
            <header>
              <div>
                <span className={`student-verification-status student-verification-status-${submission.status.toLowerCase()}`}>
                  {submission.status}
                </span>
                <h2>{submission.student_name}</h2>
                <p>{submission.student_email} · Student #{submission.student_id}</p>
              </div>
              <time dateTime={submission.submitted_at}>{new Date(submission.submitted_at).toLocaleString()}</time>
            </header>

            <dl className="student-verification-details">
              <div><dt>Name on student ID</dt><dd>{submission.full_name}</dd></div>
              <div><dt>Student number</dt><dd>{submission.student_number}</dd></div>
              <div><dt>University</dt><dd>{submission.university}</dd></div>
              <div><dt>College</dt><dd>{submission.college}</dd></div>
              <div><dt>Department</dt><dd>{submission.department}</dd></div>
              <div><dt>Academic year</dt><dd>{submission.academic_year}</dd></div>
              {submission.reviewer_name && <div><dt>Reviewed by</dt><dd>{submission.reviewer_name}</dd></div>}
              {submission.review_note && <div><dt>Admin note</dt><dd>{submission.review_note}</dd></div>}
            </dl>

            <div className="student-verification-images">
              {[
                ['front', 'Front of student ID', submission.front_image_url],
                ['back', 'Back of student ID', submission.back_image_url],
              ].map(([side, label, imageUrl]) => imageUrl && (
                <div key={side}>
                  <button type="button" className="secondary-button" onClick={() => showImage(submission, side)}>
                    {previewUrls[`${submission.id}-${side}`] ? 'Refresh' : 'View'} {label.toLowerCase()}
                  </button>
                  {previewUrls[`${submission.id}-${side}`] && (
                    <img src={previewUrls[`${submission.id}-${side}`]} alt={label} />
                  )}
                </div>
              ))}
            </div>

            {submission.status === 'Pending' && (
              <div className="student-verification-review-actions">
                <label>
                  Review note (optional)
                  <textarea
                    value={reviewNotes[submission.id] || ''}
                    onChange={(event) => setReviewNotes((current) => ({ ...current, [submission.id]: event.target.value }))}
                    maxLength={1000}
                  />
                </label>
                <div>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => reviewSubmission(submission, 'approve')}
                    disabled={workingId === submission.id}
                  >
                    {workingId === submission.id ? 'Saving…' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => reviewSubmission(submission, 'reject')}
                    disabled={workingId === submission.id}
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}
      </section>

      {!loading && totalPages > 1 && (
        <nav className="student-verification-pagination" aria-label="Student verification pages">
          <button type="button" className="secondary-button" onClick={() => setPage((current) => current - 1)} disabled={page === 1}>
            Previous
          </button>
          <span>Page {page} of {totalPages}</span>
          <button type="button" className="secondary-button" onClick={() => setPage((current) => current + 1)} disabled={page === totalPages}>
            Next
          </button>
        </nav>
      )}

      {error && !loading && (
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            setLoading(true);
            setError('');
            setRetry((current) => current + 1);
          }}
        >
          Retry loading submissions
        </button>
      )}
    </main>
  );
}
