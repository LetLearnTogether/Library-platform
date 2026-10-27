import { useState } from 'react';
import { Link } from 'react-router-dom';
import './LoginPage.css';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');

  function handleSubmit(event) {
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

    setMessage(
      'Your form is valid. Sign-in will be available when the backend is connected.'
    );
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-heading">
          <span className="login-logo" aria-hidden="true">L</span>
          <p className="login-eyebrow">LETLEARNTOGETHER</p>
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

          <button className="login-submit" type="submit">
            Sign in
          </button>
        </form>

        <p className="login-register">
          Don&apos;t have an account? <Link to="/register">Create an account</Link>
        </p>

        <p className="login-demo-note">
          Secure sign-in will be enabled when the backend is connected.
        </p>
      </section>
    </main>
  );
}

export default LoginPage;
