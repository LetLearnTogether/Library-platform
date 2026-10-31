import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { useAuth } from '../auth/useAuth';
import { usePlatformSettings } from '../settings/PlatformSettingsContext.js';
import { DocumentSubmissionsPanel } from './DocumentHistoryPage.jsx';

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
  const { user } = useAuth();
  const { settings } = usePlatformSettings();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState(() => ({
    course_id: searchParams.get('course_id') || '',
    document_type: 'Midterm',
  }));
  const [file, setFile] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [courseError, setCourseError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submissionRefresh, setSubmissionRefresh] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    fetchCourses()
      .then((result) => {
        if (!active) return;
        const availableCourses = user.role === 'Lecturer'
          ? result.items.filter((course) => course.lecturer_id === user.id)
          : result.items;
        setCourses(availableCourses);
        setForm((current) => ({
          ...current,
          course_id: availableCourses.some((course) => String(course.id) === current.course_id)
            ? current.course_id
            : '',
        }));
      })
      .catch((requestError) => {
        if (active) setCourseError(requestError.message || 'Courses could not be loaded.');
      })
      .finally(() => {
        if (active) setLoadingCourses(false);
      });
    return () => { active = false; };
  }, [user.id, user.role]);

  async function retryCourseLoad() {
    setLoadingCourses(true);
    setCourseError('');
    try {
      const result = await fetchCourses();
      const availableCourses = user.role === 'Lecturer'
        ? result.items.filter((course) => course.lecturer_id === user.id)
        : result.items;
      setCourses(availableCourses);
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
      setMessage(document.status === 'Verified'
        ? 'Course material published to the library.'
        : `Upload received. Review status: ${document.status}.`);
      setSubmissionRefresh((current) => current + 1);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (requestError) {
      setError(requestError.message || 'The document could not be uploaded.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="upload-workspace">
      <header className="upload-workspace-header">
        <p className="eyebrow">{user.role === 'Lecturer' ? 'YOUR COURSE MATERIALS' : 'YOUR CONTRIBUTIONS'}</p>
        <h1>{user.role === 'Lecturer' ? 'Course materials' : 'My uploads'}</h1>
      </header>
      <section className="upload-workspace-card">
        {user.role === 'Student' && !settings.uploads_enabled ? (
          <div className="form-card upload-workspace-form">
            <p className="eyebrow">CONTRIBUTE TO THE LIBRARY</p>
            <h2>Student uploads are paused</h2>
            <p>New document submissions are temporarily unavailable. Your existing submission history remains available.</p>
          </div>
        ) : <div className="form-card upload-workspace-form">
          <p className="eyebrow">CONTRIBUTE TO THE LIBRARY</p>
          <h2>{user.role === 'Lecturer' ? 'Publish course material' : 'Upload a paper'}</h2>
          <p>{user.role === 'Lecturer'
            ? 'Publish materials to courses assigned to you. You can remove your materials from the library below.'
            : 'Student submissions are checked by a Lecturer or moderator before they appear in the public library.'}</p>
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
              <div className="upload-course-empty" role="status">
                <p>{user.role === 'Lecturer'
                  ? 'No courses are assigned to your account yet. Ask an administrator to assign you to a course.'
                  : 'No courses are in the catalog yet. An administrator must add a course before documents can be uploaded.'}</p>
                {user.role === 'Admin' && <Link className="secondary-button" to="/admin/courses">Open course management</Link>}
              </div>
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
            {message && <p className="form-success" role="status">{message} <Link to="/document-history">View all submissions</Link></p>}
            <button type="submit" className="primary-button" disabled={submitting || loadingCourses || Boolean(courseError) || courses.length === 0}>
              {submitting ? 'Uploading…' : user.role === 'Lecturer' ? 'Publish to library' : 'Submit for review'}
            </button>
          </form>
        </div>}
        <DocumentSubmissionsPanel key={submissionRefresh} embedded />
      </section>
    </main>
  );
}
