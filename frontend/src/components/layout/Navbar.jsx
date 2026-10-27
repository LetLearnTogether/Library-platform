import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

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
        <span className="navbar-logo">L</span>
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
      </nav>
    </header>
  );
}

export default Navbar;
