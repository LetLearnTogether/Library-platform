import { Link } from 'react-router-dom';
import './StudentDashboard.css';

const recentDocuments = [
  {
    id: 1,
    title: 'Introduction to Programming',
    course: 'Computer Science',
    type: 'Lecture Notes',
    status: 'Verified',
  },
  {
    id: 2,
    title: 'Database Management Systems',
    course: 'Computer Science',
    type: 'Past Paper',
    status: 'Verified',
  },
  {
    id: 3,
    title: 'Engineering Mathematics',
    course: 'Mathematics',
    type: 'Revision Material',
    status: 'Verified',
  },
];

const quickLinks = [
  {
    icon: '📚',
    title: 'Browse Documents',
    description: 'Find notes and past examination papers.',
    link: '/library',
  },
  {
    icon: '📝',
    title: 'Practice Quizzes',
    description: 'Prepare for exams with practice questions.',
    link: '/quizzes',
  },
  {
    icon: '📤',
    title: 'Upload Materials',
    description: 'Contribute learning resources.',
    link: '/upload',
  },
];

export default function StudentDashboard() {
  return (
    <main className="student-dashboard">
      <section className="dashboard-welcome">
        <div>
          <span className="dashboard-eyebrow">STUDENT LEARNING SPACE</span>
          <h1>Welcome back, Student! 👋</h1>
          <p>
            Keep learning, explore study materials, and prepare for your next
            examination.
          </p>
          <Link to="/library" className="dashboard-primary-button">
            Explore Documents
          </Link>
        </div>

        <div className="dashboard-illustration" aria-hidden="true">
          📖
        </div>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section-heading">
          <div>
            <h2>Your Learning Overview</h2>
            <p>A quick look at your learning space.</p>
          </div>
        </div>

        <div className="dashboard-stats">
          <article className="dashboard-stat">
            <span className="stat-icon">📚</span>
            <p>Available Documents</p>
            <h3>Browse Library</h3>
            <Link to="/library">Explore library →</Link>
          </article>

          <article className="dashboard-stat">
            <span className="stat-icon">📝</span>
            <p>Practice Quizzes</p>
            <h3>Test Your Knowledge</h3>
            <Link to="/quizzes">Explore quizzes →</Link>
          </article>

          <article className="dashboard-stat">
            <span className="stat-icon">🎯</span>
            <p>Your Progress</p>
            <h3>Ready to Learn</h3>
            <span className="stat-note">Progress tracking coming soon</span>
          </article>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section-heading">
          <div>
            <h2>Quick Access</h2>
            <p>Get to the tools you need faster.</p>
          </div>
        </div>

        <div className="quick-links-grid">
          {quickLinks.map((item) => (
            <Link
              to={item.link}
              className="quick-link-card"
              key={item.title}
            >
              <span className="quick-link-icon">{item.icon}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <span className="quick-link-arrow">Open →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section-heading">
          <div>
            <h2>Recently Added Materials</h2>
            <p>Example resources from our sample data.</p>
          </div>

          <Link to="/library" className="dashboard-text-link">
            View library →
          </Link>
        </div>

        <div className="recent-documents">
          {recentDocuments.map((document) => (
            <article className="recent-document" key={document.id}>
              <span className="document-icon">📄</span>

              <div className="recent-document-info">
                <h3>{document.title}</h3>
                <p>
                  {document.course} · {document.type}
                </p>
              </div>

              <span className="verified-label">{document.status}</span>
            </article>
          ))}
        </div>
      </section>

      <p className="dashboard-demo-note">
        Demonstration dashboard: the resources and learning information shown
        here are sample data, not live student records.
      </p>
    </main>
  );
}
