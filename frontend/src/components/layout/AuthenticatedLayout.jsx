import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import './AuthenticatedLayout.css';

function AuthenticatedLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user.role === 'Admin';
  const isStaff = ['Lecturer', 'Moderator', 'Admin'].includes(user.role);
  const links = isAdmin
    ? [
      { to: '/admin', label: 'Overview', icon: '▦', end: true },
      { to: '/admin/accounts', label: 'Accounts', icon: '♙' },
      { to: '/admin/courses', label: 'Courses', icon: '▤' },
      { to: '/staff', label: 'Review & reports', icon: '✓' },
      { to: '/library', label: 'Document library', icon: '▤' },
      { to: '/upload', label: 'Upload document', icon: '↑' },
    ]
    : isStaff
      ? [
        { to: '/staff', label: 'Review workspace', icon: '✓', end: true },
        { to: '/library', label: 'Document library', icon: '▤' },
        { to: '/upload', label: 'Upload document', icon: '↑' },
      ]
      : [
        { to: '/student-dashboard', label: 'Overview', icon: '▦', end: true },
        { to: '/library', label: 'Document library', icon: '▤' },
        { to: '/quizzes', label: 'Quizzes', icon: '✎' },
        { to: '/upload', label: 'Upload document', icon: '↑' },
      ];

  function signOut() {
    logout();
    setSidebarOpen(false);
    navigate('/', { replace: true });
  }

  return (
    <div className="portal-shell">
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
    </div>
  );
}

export default AuthenticatedLayout;
