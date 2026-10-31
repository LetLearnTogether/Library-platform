import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import InstallAppButton from './InstallAppButton.jsx';
import './Navbar.css';

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="navbar">
      <Link
        className="navbar-brand"
        to="/"
        onClick={closeMenu}
        aria-label="LetLearnTogether home"
      >
        <img className="navbar-logo" src="/letlearn-together-mark.png" alt="" />
        <span className="navbar-brand-text">
          <strong>LetLearnTogether</strong>
          <small>Learn. Practice. Succeed.</small>
        </span>
      </Link>

      <button
        className="navbar-toggle"
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-expanded={menuOpen}
        aria-controls="navbar-links"
        aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
      >
        {menuOpen ? '✕' : '☰'}
      </button>

      <nav
        id="navbar-links"
        className={`navbar-links ${menuOpen ? 'navbar-links-open' : ''}`}
        aria-label="Main navigation"
      >
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `navbar-link ${isActive ? 'navbar-link-active' : ''}`
          }
          onClick={closeMenu}
        >
          Home
        </NavLink>

        <NavLink
          to="/library"
          className={({ isActive }) =>
            `navbar-link ${isActive ? 'navbar-link-active' : ''}`
          }
          onClick={closeMenu}
        >
          Document Library
        </NavLink>

        <NavLink
          to="/#about"
          className="navbar-link"
          onClick={closeMenu}
        >
          About
        </NavLink>

        <InstallAppButton />

        {user ? (
          <>
            {user.role === 'Admin' ? (
              <NavLink to="/admin" className="navbar-link" onClick={closeMenu}>
                Admin
              </NavLink>
            ) : null}
            {['Lecturer', 'Moderator', 'Admin'].includes(user.role) && (
              <NavLink to="/staff" className="navbar-link" onClick={closeMenu}>
                Staff
              </NavLink>
            )}
            <NavLink to={user.role === 'Student' ? '/student-dashboard' : user.role === 'Admin' ? '/admin' : user.role === 'Lecturer' ? '/lecturer' : '/library'} className="navbar-link" onClick={closeMenu}>
              {['Student', 'Admin', 'Lecturer'].includes(user.role) ? 'Dashboard' : 'Library'}
            </NavLink>
            <button
              type="button"
              className="navbar-link navbar-auth-button"
              onClick={() => {
                logout();
                closeMenu();
                navigate('/');
              }}
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <NavLink
              to="/login"
              className={({ isActive }) =>
                `navbar-link ${isActive ? 'navbar-link-active' : ''}`
              }
              onClick={closeMenu}
            >
              Login
            </NavLink>
            <NavLink
              to="/register"
              className={({ isActive }) =>
                `navbar-link navbar-register ${isActive ? 'navbar-link-active' : ''}`
              }
              onClick={closeMenu}
            >
              Register
            </NavLink>
          </>
        )}
      </nav>
    </header>
  );
}

export default Navbar;
