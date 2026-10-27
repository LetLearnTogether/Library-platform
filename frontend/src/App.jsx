
import { useMemo, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { mockDocuments } from './data/mockDocuments';
import Navbar from './components/layout/Navbar.jsx';
import ScrollToHash from './components/layout/ScrollToHash.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import QuizPage from './pages/QuizPage.jsx';
import VerificationPage from './pages/VerificationPage';
import './App.css';

const currentYear = new Date().getFullYear();

const documentTypes = [
  'Midterm',
  'Final',
  'Assignment',
  'Quiz',
  'Syllabus',
];

function LibraryPage() {
  const [search, setSearch] = useState('');
  const [course, setCourse] = useState('All');
  const [year, setYear] = useState('All');
  const [semester, setSemester] = useState('All');
  const [documentType, setDocumentType] = useState('All');

  // Students should only see documents marked Verified.
  const verifiedDocuments = useMemo(
    () => mockDocuments.filter((document) => document.status === 'Verified'),
    []
  );

  // Apply search and filters to verified documents.
  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return verifiedDocuments.filter((document) => {
      const matchesSearch =
        document.title.toLowerCase().includes(query) ||
        document.courseCode.toLowerCase().includes(query) ||
        document.courseTitle.toLowerCase().includes(query);

      const matchesCourse =
        course === 'All' || document.courseCode === course;

      const matchesYear =
        year === 'All' || String(document.academicYear) === year;

      const matchesSemester =
        semester === 'All' || document.semester === semester;

      const matchesType =
        documentType === 'All' || document.documentType === documentType;

      return (
        matchesSearch &&
        matchesCourse &&
        matchesYear &&
        matchesSemester &&
        matchesType
      );
    });
  }, [
    search,
    course,
    year,
    semester,
    documentType,
    verifiedDocuments,
  ]);

  const courses = [
    ...new Set(verifiedDocuments.map((document) => document.courseCode)),
  ].sort();

  const years = [
    ...new Set(verifiedDocuments.map((document) => document.academicYear)),
  ].sort((a, b) => b - a);

  function resetFilters() {
    setSearch('');
    setCourse('All');
    setYear('All');
    setSemester('All');
    setDocumentType('All');
  }

  // Open the selected PDF in a new browser tab.
  function handleView(document) {
    if (!document.filePath) {
      window.alert('This document is not available yet.');
      return;
    }

    window.open(document.filePath, '_blank', 'noopener,noreferrer');
  }

  // Download the selected PDF.
  function handleDownload(document) {
    if (!document.filePath) {
      window.alert('This document is not available for download yet.');
      return;
    }

    const link = window.document.createElement('a');
    link.href = document.filePath;
    link.download = document.filePath.split('/').pop();
    window.document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <>
      <main>
        <section className="hero-section">
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
        </section>

        <section className="library-section" id="library">
          <div className="section-heading">
            <div>
              <span className="eyebrow">STUDY RESOURCES</span>
              <h2>Document Library</h2>
              <p>Find the right material for your next study session.</p>
            </div>

            <div className="resource-count">
              <strong>{filteredDocuments.length}</strong>
              <span>
                {filteredDocuments.length === 1
                  ? 'document found'
                  : 'documents found'}
              </span>
            </div>
          </div>

          <div className="search-panel">
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
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
                value={course}
                onChange={(event) => setCourse(event.target.value)}
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
                value={year}
                onChange={(event) => setYear(event.target.value)}
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
                value={semester}
                onChange={(event) => setSemester(event.target.value)}
              >
                <option value="All">All semesters</option>
                <option value="First">First semester</option>
                <option value="Second">Second semester</option>
              </select>
            </label>

            <label className="filter-field">
              <span>Document type</span>
              <select
                value={documentType}
                onChange={(event) => setDocumentType(event.target.value)}
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

          <div className="library-notice">
            <span className="notice-icon" aria-hidden="true">✓</span>
            <span>
              <strong>Verified resources</strong>
              <small>
                Only documents verified by the platform are shown.
              </small>
            </span>
          </div>

          {filteredDocuments.length > 0 ? (
            <div className="document-grid">
              {filteredDocuments.map((document) => (
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
                    <span className="course-code">{document.courseCode}</span>
                    <h3>{document.title}</h3>
                    <p className="course-title">{document.courseTitle}</p>

                    <div className="document-meta">
                      <span>{document.documentType}</span>
                      <span>{document.academicYear}</span>
                      <span>{document.semester} semester</span>
                    </div>

                    <p className="lecturer-info">{document.lecturer}</p>
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
        </section>

        <section className="about-section" id="about">
          <div>
            <span className="eyebrow">BUILT FOR LEARNERS</span>
            <h2>Better resources. Better preparation.</h2>
          </div>
          <p>
            LetLearnTogether brings learning materials together so students
            can spend less time searching and more time learning.
          </p>
        </section>
      </main>

      <footer className="site-footer">
        <a className="footer-brand" href="/">
          <span className="brand-mark" aria-hidden="true">L</span>
          LetLearnTogether
        </a>
        <p>
          © {currentYear} LetLearnTogether. Learn together,
          grow together.
        </p>
      </footer>
    </>
  );
}

function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <ScrollToHash />
      <Routes>
        <Route path="/" element={<LibraryPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/student-dashboard"
          element={<StudentDashboard />}
        />
        <Route path="/quizzes" element={<QuizPage />} />
        <Route path="/verify" element={<VerificationPage />} />
      </Routes>
    </div>
  );
}

export default App;
