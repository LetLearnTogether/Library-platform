import { useState } from "react";
import { Link } from "react-router-dom";
import "./VerificationPage.css";

// Demonstration data only.
// Replace this with the backend API after the API contract is agreed.
const mockDocuments = [
  {
    verificationToken: "LLT-2026-001",
    title: "Introduction to Computer Science — Midterm",
    course: "Introduction to Computer Science",
    status: "Verified",
    uploadedBy: "Sample Lecturer",
  },
  {
    verificationToken: "LLT-2026-002",
    title: "Sample Mathematics Past Paper",
    course: "Mathematics",
    status: "Revoked",
    uploadedBy: "Sample Lecturer",
  },
];

function VerificationPage() {
  const [token, setToken] = useState("");
  const [result, setResult] = useState(null);
  const [searched, setSearched] = useState(false);

  function handleVerify(event) {
    event.preventDefault();

    const enteredToken = token.trim();

    if (!enteredToken) {
      setResult(null);
      setSearched(false);
      return;
    }

    const document = mockDocuments.find(
      (item) =>
        item.verificationToken.toLowerCase() ===
        enteredToken.toLowerCase()
    );

    setResult(document || null);
    setSearched(true);
  }

  return (
    <main className="verification-page">
      <section className="verification-card">
        <div className="verification-icon" aria-hidden="true">
          ✓
        </div>

        <p className="verification-eyebrow">
          LETLEARNTOGETHER
        </p>

        <h1>Verify a document</h1>

        <p className="verification-intro">
          Enter the document verification ID to check its
          current verification status.
        </p>

        <form onSubmit={handleVerify}>
          <label htmlFor="verification-token">
            Document verification ID
          </label>

          <input
            id="verification-token"
            type="text"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="e.g. LLT-2026-001"
            autoComplete="off"
            required
          />

          <button type="submit">
            Verify document
          </button>
        </form>

        {searched && (
          <section
            className={`verification-result ${
              result?.status === "Verified"
                ? "result-verified"
                : result
                  ? "result-revoked"
                  : "result-not-found"
            }`}
            aria-live="polite"
          >
            {!result ? (
              <>
                <h2>Document not found</h2>
                <p>
                  No matching document was found in the
                  demonstration records. Check the ID and try
                  again.
                </p>
              </>
            ) : (
              <>
                <h2>
                  {result.status === "Verified"
                    ? "Document verified"
                    : "Document revoked"}
                </h2>

                <p>
                  Status: <strong>{result.status}</strong>
                </p>

                <dl>
                  <dt>Document</dt>
                  <dd>{result.title}</dd>

                  <dt>Course</dt>
                  <dd>{result.course}</dd>

                  <dt>Verification ID</dt>
                  <dd>{result.verificationToken}</dd>

                  <dt>Uploaded by</dt>
                  <dd>{result.uploadedBy}</dd>
                </dl>
              </>
            )}
          </section>
        )}

        <Link to="/library" className="verification-back-link">
          Back to document library
        </Link>

        <p className="verification-demo-note">
          Demonstration only: results use sample data and do
          not establish the authenticity of a real document.
        </p>
      </section>
    </main>
  );
}

export default VerificationPage;
