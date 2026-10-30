
import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { useAuth } from './auth/useAuth';
import Navbar from './components/layout/Navbar.jsx';
import AuthenticatedLayout from './components/layout/AuthenticatedLayout.jsx';
import ScrollToHash from './components/layout/ScrollToHash.jsx';
import RequireAuth from './components/auth/RequireAuth.jsx';
import { apiRequest, getDocumentContentUrl, getVerificationUrl } from './lib/api.js';
import DocumentReportDialog from './components/documents/DocumentReportDialog.jsx';
import LibraryFolderBrowser from './components/documents/LibraryFolderBrowser.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import QuizPage from './pages/QuizPage.jsx';
import QuizHistoryPage from './pages/QuizHistoryPage.jsx';
import DocumentHistoryPage from './pages/DocumentHistoryPage.jsx';
import QuizManagementPage from './pages/QuizManagementPage.jsx';
import VerificationPage from './pages/VerificationPage';
import UploadPage from './pages/UploadPage.jsx';
import StaffReviewPage from './pages/StaffReviewPage.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminAccountsPage from './pages/AdminAccountsPage.jsx';
import AdminCoursesPage from './pages/AdminCoursesPage.jsx';
import './App.css';

const currentYear = new Date().getFullYear();

const documentTypes = [
  'Midterm',
  'Final',
  'Assignment',
  'Quiz',
  'Syllabus',
];

function LibraryPage({ portal = false }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { courseCode: folderCourseCode, year: folderYear, semester: folderSemester, documentType: folderDocumentType } = useParams();
  const [search, setSearch] = useState('');
  const [course, setCourse] = useState('All');
  const [year, setYear] = useState('All');
  const [semester, setSemester] = useState('All');
  const [documentType, setDocumentType] = useState('All');
  const [documents, setDocuments] = useState([]);
  const [courseOptions, setCourseOptions] = useState([]);
  const [courseOptionsLoading, setCourseOptionsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [courseError, setCourseError] = useState('');
  const [reportingDocument, setReportingDocument] = useState(null);
  const [reportedDocumentIds, setReportedDocumentIds] = useState(() => new Set());
  const [reportMessage, setReportMessage] = useState('');
  const isFolderRoute = Boolean(folderCourseCode);
  const selectedCourse = isFolderRoute ? folderCourseCode : course;
  const selectedYear = isFolderRoute ? folderYear || 'All' : year;
  const routeSemester = folderSemester?.toLowerCase().replace(/-semester$/, '');
  const selectedSemester = isFolderRoute
    ? routeSemester === 'first' ? 'First' : routeSemester === 'second' ? 'Second' : folderSemester || 'All'
    : semester;
  const selectedDocumentType = isFolderRoute
    ? documentTypes.find((type) => type.toLowerCase() === folderDocumentType?.toLowerCase()) || folderDocumentType || 'All'
    : documentType;

  useEffect(() => {
    let active = true;
    apiRequest('/courses?page=1&page_size=100')
      .then((result) => {
        if (active) setCourseOptions(result.items);
      })
      .catch((requestError) => {
        if (active) setCourseError(requestError.message || 'Course filters are temporarily unavailable.');
      })
      .finally(() => {
        if (active) setCourseOptionsLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ page: String(page), page_size: '20' });
      if (search.trim()) params.set('q', search.trim());
      if (selectedCourse !== 'All') params.set('course_code', selectedCourse);
      if (selectedYear !== 'All') params.set('year', selectedYear);
      if (selectedSemester !== 'All') params.set('semester', selectedSemester);
      if (selectedDocumentType !== 'All') params.set('document_type', selectedDocumentType);

      setLoading(true);
      setError('');
      apiRequest(`/documents?${params}`)
        .then((result) => {
          if (!active) return;
          setDocuments(result.items);
          setTotalItems(result.total_items);
          setTotalPages(result.total_pages);
        })
        .catch((requestError) => {
          if (!active) return;
          setError(requestError.message || 'Unable to load documents.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, search.trim() ? 250 : 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [search, selectedCourse, selectedYear, selectedSemester, selectedDocumentType, page]);

  const courses = [...new Set(courseOptions.map((item) => item.course_code))].sort();
  const years = [...new Set(courseOptions.map((item) => item.year))].sort((a, b) => b - a);

  function resetFilters() {
    if (isFolderRoute) navigate('/library');
    setSearch('');
    setCourse('All');
    setYear('All');
    setSemester('All');
    setDocumentType('All');
    setPage(1);
  }

  function changeFilter(setter, value) {
    if (isFolderRoute) navigate('/library');
    setter(value);
    setPage(1);
  }

  function handleView(document) {
    window.open(getDocumentContentUrl(document.id), '_blank', 'noopener,noreferrer');
  }

  function handleDownload(document) {
    const link = window.document.createElement('a');
    link.href = getDocumentContentUrl(document.id, 'attachment');
    window.document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function handleReportSubmitted(documentId) {
    setReportedDocumentIds((current) => new Set(current).add(documentId));
    setReportingDocument(null);
    setReportMessage('Thank you. Your report has been sent to the moderation team.');
  }

  return (
    <>
      {reportingDocument && (
        <DocumentReportDialog
          document={reportingDocument}
          onClose={() => setReportingDocument(null)}
          onSubmitted={handleReportSubmitted}
        />
      )}
      <main>
        {!portal && <section className="hero-section">
          <div className="hero-content">
            <span className="eyebrow">YOUR LEARNING LIBRARY</span>
            <h1>
              Learn more.
              <br />
              <span>Achieve more.</span>
            </h1>
            <p>
              Find study materials, past questions, assignments,
              quizzes, and syllabuses in one place.
            </p>
            <a className="primary-button hero-button" href="#library">
              Explore documents <span aria-hidden="true">↓</span>
            </a>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="visual-circle circle-one" />
            <div className="visual-circle circle-two" />
            <div className="book-illustration">
              <div className="book-symbol">L</div>
              <span>LEARN</span>
              <span className="book-lines" />
              <span className="book-lines short" />
            </div>
            <div className="floating-note note-top">Study smarter</div>
            <div className="floating-note note-bottom">
              <span>✓</span> Verified resources
            </div>
          </div>
        </section>}

        <section className="library-section" id="library">
          <div className="section-heading">
            <div>
              <span className="eyebrow">STUDY RESOURCES</span>
              <h2>Document Library</h2>
              <p>Find the right material for your next study session.</p>
            </div>

            <div className="resource-count">
              <strong>{totalItems}</strong>
              <span>
                {totalItems === 1
                  ? 'document found'
                  : 'documents found'}
              </span>
            </div>
          </div>

          <LibraryFolderBrowser
            courses={courseOptions}
            loading={courseOptionsLoading}
            error={courseError}
            courseCode={folderCourseCode}
            year={folderYear}
            semester={folderSemester}
            documentType={folderDocumentType}
          />

          <div className="search-panel">
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                placeholder="Search by course code or title..."
                aria-label="Search documents"
              />
            </label>

            <button
              className="reset-button"
              type="button"
              onClick={resetFilters}
            >
              Reset filters
            </button>
          </div>

          <div className="filter-grid">
            <label className="filter-field">
              <span>Course</span>
              <select
                value={selectedCourse}
                onChange={(event) => changeFilter(setCourse, event.target.value)}
              >
                <option value="All">All courses</option>
                {courses.map((courseCode) => (
                  <option key={courseCode} value={courseCode}>
                    {courseCode}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-field">
              <span>Academic year</span>
              <select
                value={selectedYear}
                onChange={(event) => changeFilter(setYear, event.target.value)}
              >
                <option value="All">All years</option>
                {years.map((academicYear) => (
                  <option key={academicYear} value={String(academicYear)}>
                    {academicYear}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-field">
              <span>Semester</span>
              <select
                value={selectedSemester}
                onChange={(event) => changeFilter(setSemester, event.target.value)}
              >
                <option value="All">All semesters</option>
                <option value="First">First semester</option>
                <option value="Second">Second semester</option>
              </select>
            </label>

            <label className="filter-field">
              <span>Document type</span>
              <select
                value={selectedDocumentType}
                onChange={(event) => changeFilter(setDocumentType, event.target.value)}
              >
                <option value="All">All types</option>
                {documentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {courseError && <p className="app-status" role="status">{courseError}</p>}
          {reportMessage && <p className="app-status library-report-status" role="status">{reportMessage}</p>}

          <div className="library-notice">
            <span className="notice-icon" aria-hidden="true">✓</span>
            <span>
              <strong>Verified resources</strong>
              <small>
                Only documents verified by the platform are shown.
              </small>
            </span>
          </div>

          {error ? (
            <div className="empty-state" role="alert">
              <h3>Library unavailable</h3>
              <p>{error}</p>
            </div>
          ) : loading ? (
            <p className="app-status" role="status">Loading verified documents…</p>
          ) : documents.length > 0 ? (
            <div className="document-grid">
              {documents.map((document) => (
                <article className="document-card" key={document.id}>
                  <div className="document-card-top">
                    <div className="file-icon" aria-hidden="true">
                      <span>PDF</span>
                    </div>
                    <span className="verified-badge">
                      <span aria-hidden="true">✓</span> Verified
                    </span>
                  </div>

                  <div className="document-info">
                    <span className="course-code">{document.course.course_code}</span>
                    <h3>{document.filename}</h3>
                    <p className="course-title">{document.course.course_title}</p>

                    <div className="document-meta">
                    <span>{document.document_type}</span>
                    <span>{document.course.year}</span>
                    <span>{document.course.semester} semester</span>
                    </div>
                    {document.verification_token && (
                    <a href={getVerificationUrl(document.verification_token)}>Verify stamp</a>
                    )}
                  </div>

                  <div className="document-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => handleView(document)}
                    >
                      View
                    </button>
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => handleDownload(document)}
                    >
                      Download
                    </button>
                  </div>
                  {reportedDocumentIds.has(document.id) ? (
                    <p className="document-report-submitted" role="status">Report submitted</p>
                  ) : user ? (
                    <button
                      className="document-report-trigger"
                      type="button"
                      onClick={() => { setReportMessage(''); setReportingDocument(document); }}
                    >
                      Report document
                    </button>
                  ) : (
                    <Link
                      className="document-report-trigger"
                      to="/login"
                      state={{ from: location }}
                    >
                      Sign in to report
                    </Link>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon" aria-hidden="true">⌕</div>
              <h3>No documents found</h3>
              <p>
                Try another search or change your filters to find
                available study materials.
              </p>
              <button
                className="primary-button"
                type="button"
                onClick={resetFilters}
              >
                Clear filters
              </button>
            </div>
          )}
          {!loading && totalPages > 1 && (
            <nav className="pagination" aria-label="Document pages">
              <button type="button" className="secondary-button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
              <span>Page {page} of {totalPages}</span>
              <button type="button" className="secondary-button" disabled={page === totalPages} onClick={() => setPage((value) => value + 1)}>Next</button>
            </nav>
          )}
        </section>

        {!portal && <section className="about-section" id="about">
          <div>
            <span className="eyebrow">BUILT FOR LEARNERS</span>
            <h2>Better resources. Better preparation.</h2>
          </div>
          <p>
            LetLearnTogether brings learning materials together so students
            can spend less time searching and more time learning.
          </p>
        </section>}
      </main>

      {!portal && <footer className="site-footer">
        <a className="footer-brand" href="/">
          <span className="brand-mark" aria-hidden="true">L</span>
          LetLearnTogether
        </a>
        <p>
          © {currentYear} LetLearnTogether. Learn together,
          grow together.
        </p>
      </footer>}
    </>
  );
}

function roleHome(role) {
  if (role === 'Admin') return '/admin';
  if (['Lecturer', 'Moderator'].includes(role)) return '/staff';
  return '/student-dashboard';
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="app-status" role="status">Restoring your session…</p>;
  }

  if (user) {
    return (
      <AuthenticatedLayout>
        <ScrollToHash />
        <Routes>
          <Route path="/" element={<Navigate to={roleHome(user.role)} replace />} />
          <Route path="/login" element={<Navigate to={roleHome(user.role)} replace />} />
          <Route path="/register" element={<Navigate to={roleHome(user.role)} replace />} />
          <Route path="/library" element={<LibraryPage portal />} />
          <Route path="/courses/:courseCode/:year/:semester/:documentType" element={<LibraryPage portal />} />
          <Route path="/courses/:courseCode/:year/:semester" element={<LibraryPage portal />} />
          <Route path="/courses/:courseCode/:year" element={<LibraryPage portal />} />
          <Route path="/courses/:courseCode" element={<LibraryPage portal />} />
          <Route path="/student-dashboard" element={<RequireAuth roles={['Student']}><StudentDashboard /></RequireAuth>} />
          <Route path="/quiz-history" element={<RequireAuth roles={['Student']}><QuizHistoryPage /></RequireAuth>} />
          <Route path="/document-history" element={<RequireAuth roles={['Student']}><DocumentHistoryPage /></RequireAuth>} />
          <Route path="/quiz-management" element={<RequireAuth roles={['Lecturer', 'Admin']}><QuizManagementPage /></RequireAuth>} />
          <Route path="/upload" element={<RequireAuth><UploadPage /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth roles={['Admin']}><AdminDashboard /></RequireAuth>} />
          <Route path="/admin/accounts" element={<RequireAuth roles={['Admin']}><AdminAccountsPage /></RequireAuth>} />
          <Route path="/admin/courses" element={<RequireAuth roles={['Admin']}><AdminCoursesPage /></RequireAuth>} />
          <Route path="/staff" element={<RequireAuth roles={['Lecturer', 'Moderator', 'Admin']}><StaffReviewPage /></RequireAuth>} />
          <Route path="/quizzes" element={<QuizPage />} />
          <Route path="/quizzes/:quizId" element={<RequireAuth roles={['Student']}><QuizPage /></RequireAuth>} />
          <Route path="/verify" element={<VerificationPage />} />
          <Route path="/verify/:token" element={<VerificationPage />} />
          <Route path="*" element={<Navigate to={roleHome(user.role)} replace />} />
        </Routes>
      </AuthenticatedLayout>
    );
  }

  return (
    <div className="app-shell">
      <Navbar />
      <ScrollToHash />
      <Routes>
        <Route path="/" element={<LibraryPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/courses/:courseCode/:year/:semester/:documentType" element={<LibraryPage />} />
        <Route path="/courses/:courseCode/:year/:semester" element={<LibraryPage />} />
        <Route path="/courses/:courseCode/:year" element={<LibraryPage />} />
        <Route path="/courses/:courseCode" element={<LibraryPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/student-dashboard" element={<RequireAuth roles={['Student']}><StudentDashboard /></RequireAuth>} />
        <Route path="/quiz-history" element={<RequireAuth roles={['Student']}><QuizHistoryPage /></RequireAuth>} />
        <Route path="/document-history" element={<RequireAuth roles={['Student']}><DocumentHistoryPage /></RequireAuth>} />
        <Route path="/quiz-management" element={<RequireAuth roles={['Lecturer', 'Admin']}><QuizManagementPage /></RequireAuth>} />
        <Route path="/upload" element={<RequireAuth><UploadPage /></RequireAuth>} />
        <Route path="/admin" element={<RequireAuth roles={['Admin']}><AdminDashboard /></RequireAuth>} />
        <Route path="/admin/accounts" element={<RequireAuth roles={['Admin']}><AdminAccountsPage /></RequireAuth>} />
        <Route path="/admin/courses" element={<RequireAuth roles={['Admin']}><AdminCoursesPage /></RequireAuth>} />
        <Route path="/staff" element={<RequireAuth roles={['Lecturer', 'Moderator', 'Admin']}><StaffReviewPage /></RequireAuth>} />
        <Route path="/quizzes" element={<QuizPage />} />
        <Route path="/quizzes/:quizId" element={<RequireAuth roles={['Student']}><QuizPage /></RequireAuth>} />
        <Route path="/verify" element={<VerificationPage />} />
        <Route path="/verify/:token" element={<VerificationPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
