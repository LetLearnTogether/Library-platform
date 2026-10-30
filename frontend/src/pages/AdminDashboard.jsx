import { Link } from 'react-router-dom';
import './AdminDashboard.css';

export default function AdminDashboard() {
  return (
    <main className="staff-page admin-page">
      <header className="staff-heading">
        <p className="eyebrow">ADMINISTRATION</p>
        <h1>Admin overview</h1>
        <p>Manage platform access, academic courses, and content review from one workspace.</p>
      </header>

      <section className="admin-management-links" aria-label="Administration sections">
        <Link className="admin-management-card" to="/admin/accounts">
          <span className="admin-management-icon" aria-hidden="true">♙</span>
          <span>
            <strong>Accounts</strong>
            <small>Create accounts, review the user list, and manage roles.</small>
          </span>
          <span className="admin-management-arrow" aria-hidden="true">›</span>
        </Link>
        <Link className="admin-management-card" to="/admin/courses">
          <span className="admin-management-icon" aria-hidden="true">▤</span>
          <span>
            <strong>Courses</strong>
            <small>Create courses, view the catalog, and assign lecturers.</small>
          </span>
          <span className="admin-management-arrow" aria-hidden="true">›</span>
        </Link>
        <Link className="admin-management-card" to="/quiz-management">
          <span className="admin-management-icon" aria-hidden="true">✎</span>
          <span>
            <strong>Quiz management</strong>
            <small>Create, edit, publish, and remove practice quizzes.</small>
          </span>
          <span className="admin-management-arrow" aria-hidden="true">›</span>
        </Link>
        <Link className="admin-management-card" to="/staff">
          <span className="admin-management-icon" aria-hidden="true">✓</span>
          <span>
            <strong>Review &amp; reports</strong>
            <small>Approve documents and handle reported content.</small>
          </span>
          <span className="admin-management-arrow" aria-hidden="true">›</span>
        </Link>
      </section>
    </main>
  );
}
