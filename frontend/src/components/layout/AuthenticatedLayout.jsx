import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import InstallAppButton from './InstallAppButton.jsx';
import './AuthenticatedLayout.css';

function AuthenticatedLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = user.role === 'Admin';
  const isStaff = ['Lecturer', 'Moderator', 'Admin'].includes(user.role);
  const isStudent = user.role === 'Student';
  const links = isAdmin
    ? [
      { to: '/admin', label: 'Overview', icon: '▦', end: true },
      { to: '/admin/accounts', label: 'Accounts', icon: '♙' },
      { to: '/admin/courses', label: 'Courses', icon: '▤' },
      { to: '/quiz-management', label: 'Quiz management', icon: '✎' },
      { to: '/staff', label: 'Review & reports', icon: '✓' },
      { to: '/library', label: 'Document library', icon: '▤' },
      { to: '/upload', label: 'Upload document', icon: '↑' },
    ]
    : isStaff
      ? [
        { to: '/staff', label: 'Review workspace', icon: '✓', end: true },
        { to: '/quiz-management', label: 'Quiz management', icon: '✎' },
        { to: '/library', label: 'Document library', icon: '▤' },
        { to: '/upload', label: 'Upload document', icon: '↑' },
      ]
      : [
        { to: '/student-dashboard', label: 'Overview', icon: '▦', end: true },
        { to: '/library', label: 'Document library', icon: '▤' },
        { to: '/quizzes', label: 'Quizzes', icon: '✎' },
        { to: '/quiz-history', label: 'Quiz history', icon: '◷' },
        { to: '/document-history', label: 'My submissions', icon: '▤' },
        { to: '/upload', label: 'Upload document', icon: '↑' },
      ];

  function signOut() {
    logout();
    setSidebarOpen(false);
    navigate('/', { replace: true });
  }

  return (
    <div className={`portal-shell${isStudent ? ' portal-shell-student' : ''}`}>
      <header className="portal-header">
        <button
          className="portal-menu-toggle"
          type="button"
          onClick={() => setSidebarOpen((open) => !open)}
          aria-expanded={sidebarOpen}
          aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
        >
          <span aria-hidden="true">{sidebarOpen ? '×' : '☰'}</span>
        </button>
        <NavLink className="portal-brand" to={isAdmin ? '/admin' : isStaff ? '/staff' : '/student-dashboard'}>
          <span className="portal-brand-mark">L</span>
          <span><strong>LetLearnTogether</strong><small>Learning portal</small></span>
        </NavLink>
        <InstallAppButton />
        <div className="portal-account">
          <span className="portal-avatar" aria-hidden="true">{user.name.trim().charAt(0).toUpperCase()}</span>
          <span className="portal-account-copy"><strong>{user.name}</strong><small>{user.role}</small></span>
          <button type="button" className="portal-signout" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <div className="portal-body">
        <aside className={`portal-sidebar ${sidebarOpen ? 'portal-sidebar-open' : ''}`}>
          <div className="portal-sidebar-label">WORKSPACE</div>
          <nav className="portal-nav" aria-label="Workspace navigation">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `portal-nav-link${isActive ? ' portal-nav-link-active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="portal-nav-icon" aria-hidden="true">{link.icon}</span>
                <span>{link.label}</span>
                <span className="portal-nav-arrow" aria-hidden="true">›</span>
              </NavLink>
            ))}
          </nav>
          <div className="portal-sidebar-bottom">
            <div className="portal-support-mark">L</div>
            <strong>Learn together</strong>
            <p>Your resources, all in one place.</p>
          </div>
        </aside>

        {sidebarOpen && (
          <button
            type="button"
            className="portal-sidebar-backdrop"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="portal-main">{children}</main>
      </div>
      {isStudent && (
        <nav className="portal-mobile-nav" aria-label="Student navigation">
          {[
            { to: '/library', label: 'Library', icon: '▤', active: location.pathname === '/library' || location.pathname.startsWith('/courses/') },
            { to: '/quizzes', label: 'Quizzes', icon: '✎' },
            { to: '/upload', label: 'Upload', icon: '↑', active: location.pathname === '/upload' || location.pathname === '/document-history' },
            { to: '/student-dashboard', label: 'Me', icon: '♙', end: true },
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `portal-mobile-nav-link${isActive || item.active ? ' portal-mobile-nav-link-active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="portal-mobile-nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}

export default AuthenticatedLayout;
