import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { apiRequest } from '../lib/api';
import './StudentDashboard.css';

const quickLinks = [
  { icon: '📚', title: 'Browse Documents', description: 'Find verified study materials and past papers.', link: '/library' },
  { icon: '📝', title: 'Practice Quizzes', description: 'Take quizzes and save your results.', link: '/quizzes' },
  { icon: '📤', title: 'Upload Materials', description: 'Submit resources for lecturer review.', link: '/upload' },
];

export default function StudentDashboard() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest('/documents/mine?page=1&page_size=5'),
      apiRequest('/quiz-attempts/mine?page=1&page_size=5'),
    ])
      .then(([documentResult, attemptResult]) => {
        if (!active) return;
        setDocuments(documentResult.items);
        setAttempts(attemptResult.items);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Unable to load your dashboard.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <main className="student-dashboard">
      <section className="dashboard-welcome">
        <div>
          <span className="dashboard-eyebrow">STUDENT LEARNING SPACE</span>
          <h1>Welcome, {user?.name || 'Student'}!</h1>
          <p>Explore learning materials, submit resources, and track your quiz attempts.</p>
          <Link to="/library" className="dashboard-primary-button">Explore Documents</Link>
        </div>
        <div className="dashboard-illustration" aria-hidden="true">📖</div>
      </section>

      {error && <p className="app-status" role="alert">{error}</p>}
      {loading ? <p className="app-status" role="status">Loading your learning activity…</p> : (
        <>
          <section className="dashboard-section">
            <div className="dashboard-section-heading"><div><h2>Your Learning Overview</h2><p>Your recent activity and submissions.</p></div></div>
            <div className="dashboard-stats">
              <article className="dashboard-stat"><span className="stat-icon">📚</span><p>Your submissions</p><h3>{documents.length} recent</h3><Link to="/upload">Upload material →</Link></article>
              <article className="dashboard-stat"><span className="stat-icon">📝</span><p>Quiz attempts</p><h3>{attempts.length} recent</h3><Link to="/quizzes">Explore quizzes →</Link></article>
              <article className="dashboard-stat"><span className="stat-icon">🎯</span><p>Account role</p><h3>{user?.role}</h3><span className="stat-note">Scores are calculated securely by the server.</span></article>
            </div>
          </section>

          <section className="dashboard-section">
            <div className="dashboard-section-heading"><div><h2>Quick Access</h2><p>Get to the tools you need faster.</p></div></div>
            <div className="quick-links-grid">
              {quickLinks.map((item) => (
                <Link to={item.link} className="quick-link-card" key={item.title}>
                  <span className="quick-link-icon">{item.icon}</span><h3>{item.title}</h3><p>{item.description}</p><span className="quick-link-arrow">Open →</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="dashboard-section">
            <div className="dashboard-section-heading"><div><h2>Your recent submissions</h2><p>Track document review status.</p></div></div>
            <div className="recent-documents">
              {documents.length ? documents.map((document) => (
                <article className="recent-document" key={document.id}>
                  <span className="document-icon">📄</span>
                  <div className="recent-document-info"><h3>{document.filename}</h3><p>{document.course.course_code} · {document.document_type}</p></div>
                  <span className={`verified-label status-${document.status.toLowerCase().replaceAll(' ', '-')}`}>{document.status}</span>
                </article>
              )) : <p className="dashboard-empty">You have not submitted any documents yet.</p>}
            </div>
          </section>

          <section className="dashboard-section">
            <div className="dashboard-section-heading"><div><h2>Recent quiz attempts</h2><p>Your server-scored quiz results.</p></div></div>
            <div className="recent-documents">
              {attempts.length ? attempts.map((attempt) => (
                <article className="recent-document" key={attempt.id}>
                  <span className="document-icon">📝</span>
                  <div className="recent-document-info"><h3>{attempt.quiz_title}</h3><p>{new Date(attempt.attempted_at).toLocaleString()} · {attempt.total_questions} questions</p></div>
                  <span className="verified-label">{attempt.score}%</span>
                </article>
              )) : <p className="dashboard-empty">You have not taken any quizzes yet.</p>}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
