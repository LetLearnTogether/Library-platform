import { useState } from 'react';
import { Link } from 'react-router-dom';
import './RegisterPage.css';

export default function RegisterPage() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    setMessageType('');

    if (form.fullName.trim().length < 2) {
      setMessage('Please enter your full name.');
      setMessageType('error');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setMessage('Please enter a valid email address.');
      setMessageType('error');
      return;
    }

    if (form.password.length < 8) {
      setMessage('Your password must contain at least 8 characters.');
      setMessageType('error');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setMessage('Your passwords do not match.');
      setMessageType('error');
      return;
    }

    setMessage(
      'Your information passed validation. Account creation will be available when the backend is connected.'
    );
    setMessageType('success');
  }

  return (
    <main className="register-page">
      <section className="register-card">
        <div className="register-heading">
          <span className="register-icon" aria-hidden="true">
            📚
          </span>
          <h1>Create your account</h1>
          <p>Join LetLearnTogether and access learning resources.</p>
        </div>

        {message && (
          <div
            className={`register-message ${messageType}`}
            role="status"
            aria-live="polite"
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="register-field">
            <label htmlFor="fullName">Full name</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="Enter your full name"
              value={form.fullName}
              onChange={handleChange}
              autoComplete="name"
              required
            />
          </div>

          <div className="register-field">
            <label htmlFor="registerEmail">Email address</label>
            <input
              id="registerEmail"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </div>

          <div className="register-field">
            <label htmlFor="registerPassword">Password</label>
            <input
              id="registerPassword"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 8 characters"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <div className="register-field">
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password again"
              value={form.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
          </div>

          <label className="register-show-password">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
            />
            Show passwords
          </label>

          <button className="register-submit" type="submit">
            Create Account
          </button>
        </form>

        <p className="register-login-link">
          Already have an account? <Link to="/login">Log in</Link>
        </p>

        <p className="register-note">
          Account registration is currently a frontend demonstration.
        </p>
      </section>
    </main>
  );
}
