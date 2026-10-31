import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import './LoginPage.css';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');

    if (!email.trim() || !password) {
      setMessage('Please enter your email address and password.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setMessage('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      const isStaff = ['Lecturer', 'Moderator', 'Admin'].includes(user.role);
      const requestedPath = location.state?.from?.pathname;
      const requestedPathIsRestricted = requestedPath === '/student-dashboard'
        ? user.role !== 'Student'
        : requestedPath === '/staff'
          ? !isStaff
          : requestedPath?.startsWith('/quizzes/')
            ? user.role !== 'Student'
            : false;
      navigate(
        requestedPath && !requestedPathIsRestricted
          ? requestedPath
          : user.role === 'Admin' ? '/admin' : isStaff ? '/staff' : '/student-dashboard',
        { replace: true },
      );
    } catch (error) {
      setMessage(error.message || 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-heading">
          <img className="login-logo" src="/letlearn-together-logo.png" alt="LetLearnTogether — Learn, Share, Grow" />
          <h1>Welcome back</h1>
          <p className="login-subtitle">
            Sign in to continue your learning journey.
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <div className="password-input-wrap">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                className="password-toggle"
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {message && (
            <p className="login-message" role="status" aria-live="polite">
              {message}
            </p>
          )}

          <button className="login-submit" type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="login-register">
          Don&apos;t have an account? <Link to="/register">Create an account</Link>
        </p>

      </section>
    </main>
  );
}

export default LoginPage;
