import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import './AdminDashboard.css';

const managementAreas = [
  {
    to: '/admin/activity',
    icon: '◷',
    label: 'Activity log',
    description: 'Review who changed accounts, courses, document decisions, and platform settings.',
    action: 'View recent activity',
  },
  {
    to: '/admin/accounts',
    icon: '♙',
    label: 'Accounts & roles',
    description: 'Create platform accounts, assign roles, and remove accounts that are no longer needed.',
    action: 'Manage accounts',
  },
  {
    to: '/admin/courses',
    icon: '▤',
    label: 'Academic courses',
    description: 'Maintain the course catalog and assign lecturers to the courses they teach.',
    action: 'Manage courses',
  },
  {
    to: '/staff',
    icon: '✓',
    label: 'Document review & reports',
    description: 'Review publication requests, handle content reports, and protect the trusted library.',
    action: 'Open review workspace',
  },
  {
    to: '/quiz-management',
    icon: '✎',
    label: 'Quiz oversight',
    description: 'Create, edit, publish, and remove practice quizzes for students.',
    action: 'Manage quizzes',
  },
];

const roleResponsibilities = [
  {
    role: 'Student',
    tone: 'student',
    description: 'Find verified study resources, submit papers for review, and take quizzes with saved scores.',
  },
  {
    role: 'Lecturer',
    tone: 'lecturer',
    description: 'Review submissions for assigned courses and create course quizzes.',
  },
  {
    role: 'Moderator',
    tone: 'moderator',
    description: 'Review submissions across courses, resolve content reports, and revoke or remove material that violates platform standards.',
  },
  {
    role: 'Admin',
    tone: 'admin',
    description: 'Manage accounts, platform roles, the course catalog, and overall content operations.',
  },
];

const initialOverview = { accounts: null, courses: null, reviews: null, reports: null };

export default function AdminDashboard() {
  const [overview, setOverview] = useState(initialOverview);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest('/users?page=1&page_size=1'),
      apiRequest('/courses?page=1&page_size=1'),
      apiRequest('/documents/review-queue?page=1&page_size=1'),
      apiRequest('/reports?page=1&page_size=1&status=Open'),
    ])
      .then(([accounts, courses, reviews, reports]) => {
        if (!active) return;
        setOverview({
          accounts: accounts.total_items,
          courses: courses.total_items,
          reviews: reviews.total_items,
          reports: reports.total_items,
        });
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'The administration overview could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [retry]);

  function retryOverview() {
    setLoading(true);
    setError('');
    setRetry((current) => current + 1);
  }

  const summaryItems = [
    { label: 'Platform accounts', value: overview.accounts, icon: '♙' },
    { label: 'Courses', value: overview.courses, icon: '▤' },
    { label: 'Awaiting review', value: overview.reviews, icon: '◷', to: '/staff' },
    { label: 'Open reports', value: overview.reports, icon: '⚑', to: '/staff' },
  ];

  return (
    <main className="staff-page admin-page admin-dashboard">
      <header className="staff-heading">
        <div>
          <p className="eyebrow">ADMINISTRATOR WORKSPACE</p>
          <h1>Platform overview</h1>
          <p>Manage access, keep academic information organized, and help maintain a trusted learning library.</p>
        </div>
        <span className="admin-access-badge"><span aria-hidden="true">✓</span> Admin access</span>
      </header>

      {error && (
        <div className="admin-overview-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={retryOverview}>Retry overview</button>
        </div>
      )}

      <section className="admin-overview-stats" aria-label="Platform totals">
        {summaryItems.map((item) => (
          <article className="admin-overview-stat" key={item.label}>
            <span className="admin-overview-stat-icon" aria-hidden="true">{item.icon}</span>
            <div>
              <span>{item.label}</span>
              {item.to && !loading && item.value > 0
                ? <Link to={item.to} className="admin-overview-stat-value">{item.value}</Link>
                : <strong className="admin-overview-stat-value">{loading ? '—' : item.value ?? '—'}</strong>}
            </div>
          </article>
        ))}
      </section>
      {loading && <p className="admin-overview-loading" role="status">Loading platform totals…</p>}

      <section className="admin-responsibility-panel" aria-labelledby="admin-responsibility-title">
        <div className="admin-panel-heading">
          <span className="admin-panel-kicker">YOUR ROLE</span>
          <h2 id="admin-responsibility-title">What an administrator is responsible for</h2>
          <p>Use administrator access for platform-wide work. Give each team member only the role needed for their duties.</p>
        </div>
        <div className="admin-responsibility-grid">
          <article>
            <span className="admin-responsibility-number">01</span>
            <h3>Manage people and access</h3>
            <p>Create accounts, set appropriate roles, and keep access limited to trusted team members.</p>
          </article>
          <article>
            <span className="admin-responsibility-number">02</span>
            <h3>Maintain the course catalog</h3>
            <p>Keep course details accurate and ensure lecturers are assigned to the right courses.</p>
          </article>
          <article>
            <span className="admin-responsibility-number">03</span>
            <h3>Protect content quality</h3>
            <p>Support document review, respond to reports, and preserve the integrity of verified materials.</p>
          </article>
        </div>
      </section>

      <section className="admin-management-section" aria-labelledby="admin-management-title">
        <div className="admin-panel-heading admin-management-heading">
          <div>
            <span className="admin-panel-kicker">ADMIN TOOLS</span>
            <h2 id="admin-management-title">Manage the platform</h2>
          </div>
          <p>Choose an area to continue.</p>
        </div>
        <div className="admin-management-links">
          {managementAreas.map((area) => (
            <Link className="admin-management-card" to={area.to} key={area.label}>
              <span className="admin-management-icon" aria-hidden="true">{area.icon}</span>
              <span className="admin-management-copy">
                <strong>{area.label}</strong>
                <small>{area.description}</small>
                <span className="admin-management-action">{area.action} <span aria-hidden="true">→</span></span>
              </span>
              <span className="admin-management-arrow" aria-hidden="true">›</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="admin-role-section" aria-labelledby="admin-role-title">
        <div className="admin-panel-heading">
          <span className="admin-panel-kicker">ROLE-BASED ACCESS</span>
          <h2 id="admin-role-title">Know each role’s scope</h2>
          <p>These roles separate student learning, course review, moderation, and platform administration.</p>
        </div>
        <div className="admin-role-grid">
          {roleResponsibilities.map((item) => (
            <article className={`admin-role-card admin-role-${item.tone}`} key={item.role}>
              <span className="admin-role-dot" aria-hidden="true" />
              <h3>{item.role}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
