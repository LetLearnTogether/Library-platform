import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';

const documentTypes = ['Midterm', 'Final', 'Assignment', 'Quiz', 'Syllabus'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const allowedFileTypes = {
  pdf: { mime: 'application/pdf', label: 'PDF' },
  jpg: { mime: 'image/jpeg', label: 'JPEG' },
  jpeg: { mime: 'image/jpeg', label: 'JPEG' },
  png: { mime: 'image/png', label: 'PNG' },
  webp: { mime: 'image/webp', label: 'WebP' },
};

function fetchCourses() {
  return apiRequest('/courses?page=1&page_size=100');
}

function validateFile(file) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const expected = allowedFileTypes[extension];
  if (!expected) return 'Choose a PDF, JPEG, PNG, or WebP file.';
  if (file.type !== expected.mime) return `The selected file is not recognized as ${expected.label}. Choose a valid ${expected.label} file.`;
  if (file.size > MAX_FILE_SIZE) return 'The selected file exceeds the 10 MiB upload limit.';
  if (file.size === 0) return 'The selected file is empty. Choose a file with content.';
  return '';
}

function formatFileSize(size) {
  return size >= 1024 * 1024
    ? `${(size / (1024 * 1024)).toFixed(2)} MiB`
    : `${Math.max(1, Math.round(size / 1024))} KiB`;
}

export default function UploadPage() {
  const [form, setForm] = useState({ course_id: '', document_type: 'Midterm' });
  const [file, setFile] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [courseError, setCourseError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    fetchCourses()
      .then((result) => {
        if (active) setCourses(result.items);
      })
      .catch((requestError) => {
        if (active) setCourseError(requestError.message || 'Courses could not be loaded.');
      })
      .finally(() => {
        if (active) setLoadingCourses(false);
      });
    return () => { active = false; };
  }, []);

  async function retryCourseLoad() {
    setLoadingCourses(true);
    setCourseError('');
    try {
      const result = await fetchCourses();
      setCourses(result.items);
    } catch (requestError) {
      setCourseError(requestError.message || 'Courses could not be loaded.');
    } finally {
      setLoadingCourses(false);
    }
  }

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0] || null;
    setError(selectedFile ? validateFile(selectedFile) : '');
    setMessage('');
    setFile(selectedFile);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    const fileError = file ? validateFile(file) : 'Choose a PDF, JPEG, PNG, or WebP file to upload.';
    if (fileError) {
      setError(fileError);
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
      if (fileInputRef.current) fileInputRef.current.value = '';
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
          {courseError && (
            <div className="upload-course-error" role="alert">
              <p>{courseError}</p>
              <button type="button" className="secondary-button" onClick={retryCourseLoad} disabled={loadingCourses}>
                {loadingCourses ? 'Loading courses…' : 'Retry loading courses'}
              </button>
            </div>
          )}
          {!loadingCourses && !courseError && courses.length === 0 && (
            <p className="upload-course-empty">No courses are available for uploads yet.</p>
          )}
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
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              required
            />
          </label>
          {file && (
            <div className="upload-file-summary" aria-live="polite">
              <span><strong>{file.name}</strong><small>{formatFileSize(file.size)}</small></span>
              <button
                type="button"
                className="upload-file-remove"
                onClick={() => {
                  setFile(null);
                  setError('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                Remove file
              </button>
            </div>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          {message && <p className="form-success" role="status">{message} <Link to="/document-history">Track submissions</Link></p>}
          <button type="submit" className="primary-button" disabled={submitting || loadingCourses || Boolean(courseError) || courses.length === 0}>
            {submitting ? 'Uploading…' : 'Submit for review'}
          </button>
        </form>
      </section>
    </main>
  );
}
