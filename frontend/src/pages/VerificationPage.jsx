import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiRequest, getVerificationQrUrl } from '../lib/api';
import './VerificationPage.css';

function VerificationPage() {
  const { token: routeToken } = useParams();
  return <VerificationPageContent key={routeToken || 'empty'} routeToken={routeToken} />;
}

function VerificationPageContent({ routeToken }) {
  const navigate = useNavigate();
  const [token, setToken] = useState(routeToken || '');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(routeToken));

  useEffect(() => {
    if (!routeToken) {
      return undefined;
    }

    let active = true;
    apiRequest(`/verification/${encodeURIComponent(routeToken)}`)
      .then((verification) => {
        if (active) setResult(verification);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Unable to verify this document.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [routeToken]);

  function handleVerify(event) {
    event.preventDefault();
    const enteredToken = token.trim();
    if (enteredToken) navigate(`/verify/${encodeURIComponent(enteredToken)}`);
  }

  return (
    <main className="verification-page">
      <section className="verification-card">
        <div className="verification-icon" aria-hidden="true">✓</div>
        <p className="verification-eyebrow">LETLEARNTOGETHER</p>
        <h1>Verify a document</h1>
        <p className="verification-intro">
          Check a document&apos;s current stamp status using its verification ID.
        </p>

        <form onSubmit={handleVerify}>
          <label htmlFor="verification-token">Document verification ID</label>
          <input
            id="verification-token"
            type="text"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Paste the UUID verification token"
            autoComplete="off"
            required
          />
          <button type="submit">Verify document</button>
        </form>

        {loading && <p role="status">Checking verification status…</p>}
        {!loading && error && (
          <section className="verification-result result-not-found" role="alert">
            <h2>Verification unavailable</h2>
            <p>{error}</p>
          </section>
        )}
        {!loading && result && (
          <section
            className={`verification-result ${result.status === 'Verified' ? 'result-verified' : 'result-revoked'}`}
            aria-live="polite"
          >
            <h2>{result.status === 'Verified' ? 'Document verified' : 'Document revoked'}</h2>
            <p>Status: <strong>{result.status}</strong></p>
            <dl>
              <dt>Document ID</dt>
              <dd>{result.document_id}</dd>
              <dt>Course</dt>
              <dd>{result.course_code} — {result.course_title}</dd>
              <dt>Document type</dt>
              <dd>{result.document_type}</dd>
              <dt>Approval date</dt>
              <dd>{result.approved_at ? new Date(result.approved_at).toLocaleString() : 'Not available'}</dd>
            </dl>
            <figure className="verification-qr">
              <img
                src={getVerificationQrUrl(routeToken)}
                alt={`QR code for the ${result.status.toLowerCase()} document verification page`}
                width="160"
                height="160"
              />
              <figcaption>Scan to check this document&apos;s current status.</figcaption>
            </figure>
          </section>
        )}

        <Link to="/library" className="verification-back-link">Back to document library</Link>
      </section>
    </main>
  );
}

export default VerificationPage;
