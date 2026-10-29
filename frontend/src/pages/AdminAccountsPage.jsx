import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../auth/useAuth';
import './AdminDashboard.css';

const roles = ['Student', 'Lecturer', 'Moderator', 'Admin'];
const initialForm = { name: '', email: '', password: '', role: 'Student' };

export default function AdminAccountsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('view');
  const [accounts, setAccounts] = useState([]);
  const [roleChanges, setRoleChanges] = useState({});
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    const page = await apiRequest('/users?page=1&page_size=100');
    setAccounts(page.items);
    setRoleChanges({});
  }, []);

  useEffect(() => {
    let active = true;
    refresh()
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Could not load accounts.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [refresh]);

  async function createAccount(event) {
    event.preventDefault();
    setWorking(true);
    setError('');
    setMessage('');
    try {
      await apiRequest('/users', { method: 'POST', body: form });
      setForm(initialForm);
      await refresh();
      setMessage('Account created successfully.');
      setTab('view');
    } catch (requestError) {
      setError(requestError.message || 'The account could not be created.');
    } finally {
      setWorking(false);
    }
  }

  async function updateRole(account) {
    const role = roleChanges[account.id];
    if (!role || role === account.role) return;
    setWorking(true);
    setError('');
    setMessage('');
    try {
      await apiRequest(`/users/${account.id}`, { method: 'PATCH', body: { role } });
      await refresh();
      setMessage(`Updated ${account.name}'s role.`);
    } catch (requestError) {
      setError(requestError.message || 'The role could not be updated.');
    } finally {
      setWorking(false);
    }
  }

  async function deleteAccount(account) {
    if (!window.confirm(`Delete the account for ${account.name}? This cannot be undone.`)) return;
    setWorking(true);
    setError('');
    setMessage('');
    try {
      await apiRequest(`/users/${account.id}`, { method: 'DELETE' });
      await refresh();
      setMessage('Account deleted.');
    } catch (requestError) {
      setError(requestError.message || 'The account could not be deleted.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="staff-page admin-page">
      <header className="staff-heading">
        <p className="eyebrow">ADMINISTRATION · ACCOUNTS</p>
        <h1>Account management</h1>
        <p>Create platform accounts or view existing users and manage their roles.</p>
      </header>

      {error && <p className="app-status" role="alert">{error}</p>}
      {message && <p className="app-status" role="status">{message}</p>}

      <nav className="admin-tabs" aria-label="Account management views">
        <button type="button" className={tab === 'create' ? 'admin-tab admin-tab-active' : 'admin-tab'} aria-pressed={tab === 'create'} onClick={() => setTab('create')}>Create account</button>
        <button type="button" className={tab === 'view' ? 'admin-tab admin-tab-active' : 'admin-tab'} aria-pressed={tab === 'view'} onClick={() => setTab('view')}>View accounts <span>{accounts.length}</span></button>
      </nav>

      {tab === 'create' ? (
        <section className="admin-tab-panel">
          <h2>Create a new account</h2>
          <p>Set an initial password and assign the account’s platform role.</p>
          <form className="admin-form" onSubmit={createAccount}>
            <label>Name<input required maxLength="100" autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label>Email<input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <label>Initial password<input required type="password" minLength="8" maxLength="72" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
            <label>Role<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>{roles.map((role) => <option key={role}>{role}</option>)}</select></label>
            <button className="primary-button" type="submit" disabled={working}>{working ? 'Creating…' : 'Create account'}</button>
          </form>
        </section>
      ) : (
        <section className="admin-tab-panel">
          <div className="admin-list-heading">
            <div><h2>Platform accounts</h2><p>Change roles or remove accounts that are no longer needed.</p></div>
            <button className="secondary-button" type="button" disabled={working || loading} onClick={() => { setLoading(true); refresh().catch((requestError) => setError(requestError.message)).finally(() => setLoading(false)); }}>Refresh list</button>
          </div>
          {loading ? <p className="app-status" role="status">Loading accounts…</p> : accounts.length ? accounts.map((account) => (
            <article className="staff-card admin-card" key={account.id}>
              <div>
                <h3>{account.name}{account.id === user.id ? ' (you)' : ''}</h3>
                <p>{account.email}</p>
              </div>
              <div className="staff-actions">
                <select aria-label={`Role for ${account.name}`} value={roleChanges[account.id] ?? account.role} onChange={(event) => setRoleChanges({ ...roleChanges, [account.id]: event.target.value })}>
                  {roles.map((role) => <option key={role}>{role}</option>)}
                </select>
                <button className="secondary-button" type="button" disabled={working || (roleChanges[account.id] ?? account.role) === account.role} onClick={() => updateRole(account)}>Save role</button>
                {account.id !== user.id && <button className="admin-danger-button" type="button" disabled={working} onClick={() => deleteAccount(account)}>Delete</button>}
              </div>
            </article>
          )) : <p className="dashboard-empty">No accounts found.</p>}
          {accounts.length === 100 && <p className="admin-note">Showing the first 100 accounts.</p>}
        </section>
      )}
    </main>
  );
}
