import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';

const documentTypes = ['Midterm', 'Final', 'Assignment', 'Quiz', 'Syllabus'];

export default function UploadPage() {
  const [form, setForm] = useState({ course_id: '', document_type: 'Midterm' });
  const [file, setFile] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/courses?page=1&page_size=100')
      .then((result) => setCourses(result.items))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoadingCourses(false));
  });

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!file) {
      setError('Choose a PDF, JPEG, PNG, or WebP file to upload.');
      return;
    }

    const body = new FormData();
    body.set('file', file);
    body.set('course_id', form.course_id);
    body.set('document_type', form.document_type);
    setSubmitting(true);
    try {
      const document = await apiRequest('/documents', { method: 'POST', body });
      setMessage(`Upload received. Review status: ${document.status}.`);
      setFile(null);
      event.target.reset();
    } catch (requestError) {
      setError(requestError.message || 'The document could not be uploaded.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="form-page">
      <section className="form-card">
        <p className="eyebrow">CONTRIBUTE TO THE LIBRARY</p>
        <h1>Upload a document</h1>
        <p>Submissions are checked before they appear in the public library.</p>
        <form className="upload-form" onSubmit={handleSubmit}>
          <label>
            Course
            <select
              value={form.course_id}
              onChange={(event) => setForm((current) => ({ ...current, course_id: event.target.value }))}
              required
              disabled={loadingCourses}
            >
              <option value="">{loadingCourses ? 'Loading courses…' : 'Choose a course'}</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>{course.course_code} — {course.course_title}</option>
              ))}
            </select>
          </label>
          <label>
            Document type
            <select
              value={form.document_type}
              onChange={(event) => setForm((current) => ({ ...current, document_type: event.target.value }))}
            >
              {documentTypes.map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label>
            File (PDF, JPEG, PNG, WebP; maximum 10 MiB)
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              required
            />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          {message && <p className="form-success" role="status">{message} <Link to="/student-dashboard">View submissions</Link></p>}
          <button type="submit" className="primary-button" disabled={submitting || loadingCourses || courses.length === 0}>
            {submitting ? 'Uploading…' : 'Submit for review'}
          </button>
        </form>
      </section>
    </main>
  );
}
