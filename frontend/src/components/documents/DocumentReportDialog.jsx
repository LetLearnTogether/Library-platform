import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../../lib/api';
import './DocumentReportDialog.css';

export default function DocumentReportDialog({ document, onClose, onSubmitted }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const reasonField = useRef(null);

  useEffect(() => {
    reasonField.current?.focus();
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !submitting) onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, submitting]);

  async function submitReport(event) {
    event.preventDefault();
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError('Enter a reason for reporting this document.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await apiRequest(`/documents/${document.id}/reports`, {
        method: 'POST',
        body: { reason: trimmedReason },
      });
      onSubmitted(document.id);
    } catch (requestError) {
      setError(requestError.message || 'Your report could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="document-report-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <section
        className="document-report-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-report-title"
        aria-describedby="document-report-description"
      >
        <div className="document-report-heading">
          <div>
            <p className="eyebrow">HELP KEEP THE LIBRARY TRUSTED</p>
            <h2 id="document-report-title">Report this document</h2>
          </div>
          <button
            type="button"
            className="document-report-close"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close report dialog"
          >
            ×
          </button>
        </div>

        <p id="document-report-description" className="document-report-document">
          <strong>{document.filename}</strong>
          <span>{document.course.course_code} · {document.document_type} · {document.course.year}</span>
        </p>
        <p className="document-report-explanation">
          Tell our moderation team what should be checked. Reports are reviewed by authorized staff.
        </p>

        <form onSubmit={submitReport}>
          <label htmlFor="document-report-reason">Reason for report</label>
          <textarea
            id="document-report-reason"
            ref={reasonField}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={2000}
            rows={5}
            placeholder="Describe the issue with this document…"
            required
          />
          <span className="document-report-character-count">{reason.length}/2000</span>

          {error && <p className="document-report-error" role="alert">{error}</p>}

          <div className="document-report-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={submitting || !reason.trim()}>
              {submitting ? 'Submitting…' : 'Submit report'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
