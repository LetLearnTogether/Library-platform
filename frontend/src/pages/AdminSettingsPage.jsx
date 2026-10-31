import { useState } from 'react';
import { ApiError, apiRequest } from '../lib/api.js';
import { usePlatformSettings } from '../settings/PlatformSettingsContext.js';
import './AdminSettingsPage.css';

function settingsForm(settings) {
  return {
    announcement_enabled: settings.announcement_enabled,
    announcement_message: settings.announcement_message || '',
    support_contact: settings.support_contact || '',
    registration_enabled: settings.registration_enabled,
    uploads_enabled: settings.uploads_enabled,
  };
}

export default function AdminSettingsPage() {
  const { settings, applySettings } = usePlatformSettings();
  const [form, setForm] = useState(() => settingsForm(settings));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function updateField(event) {
    const { name, value, checked, type } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
    setMessage('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const updatedSettings = await apiRequest('/settings', {
        method: 'PATCH',
        body: {
          ...form,
          announcement_message: form.announcement_message.trim() || null,
          support_contact: form.support_contact.trim() || null,
        },
      });
      applySettings(updatedSettings);
      setForm(settingsForm(updatedSettings));
      setMessage('System settings saved.');
    } catch (requestError) {
      setError(requestError instanceof ApiError
        ? requestError.message
        : 'Settings could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="admin-settings-page">
      <header className="admin-settings-heading">
        <p className="eyebrow">ADMINISTRATION</p>
        <h1>System settings</h1>
        <p>Manage public notices and control access to account registration and student uploads.</p>
      </header>

      <form className="admin-settings-form" onSubmit={handleSubmit}>
        <section className="admin-settings-card">
          <div className="admin-settings-card-heading">
            <span aria-hidden="true">▰</span>
            <div>
              <h2>Announcement banner</h2>
              <p>Show a message to visitors and signed-in users across the platform.</p>
            </div>
          </div>
          <label className="settings-toggle">
            <input
              type="checkbox"
              name="announcement_enabled"
              checked={form.announcement_enabled}
              onChange={updateField}
            />
            <span><strong>Display announcement</strong><small>Visitors will see this notice at the top of the page.</small></span>
          </label>
          <label className="admin-settings-field">
            Announcement message
            <textarea
              name="announcement_message"
              value={form.announcement_message}
              onChange={updateField}
              maxLength={500}
              rows={3}
              placeholder="For example: The library will be unavailable on Saturday."
            />
            <small>{form.announcement_message.length}/500 characters</small>
          </label>
        </section>

        <section className="admin-settings-card">
          <div className="admin-settings-card-heading">
            <span aria-hidden="true">✉</span>
            <div>
              <h2>Support contact</h2>
              <p>Provide a support email address or an HTTPS/HTTP help page.</p>
            </div>
          </div>
          <label className="admin-settings-field">
            Email address or help URL
            <input
              name="support_contact"
              type="text"
              value={form.support_contact}
              onChange={updateField}
              maxLength={254}
              placeholder="support@example.com"
            />
          </label>
        </section>

        <section className="admin-settings-card">
          <div className="admin-settings-card-heading">
            <span aria-hidden="true">⚙</span>
            <div>
              <h2>Platform access</h2>
              <p>These controls are enforced by the API, not only by the interface.</p>
            </div>
          </div>
          <label className="settings-toggle">
            <input
              type="checkbox"
              name="registration_enabled"
              checked={form.registration_enabled}
              onChange={updateField}
            />
            <span><strong>Public registration</strong><small>Allow new students to create an account.</small></span>
          </label>
          <label className="settings-toggle">
            <input
              type="checkbox"
              name="uploads_enabled"
              checked={form.uploads_enabled}
              onChange={updateField}
            />
            <span><strong>Student document uploads</strong><small>Allow students to submit resources for review.</small></span>
          </label>
        </section>

        {error && <p className="admin-settings-error" role="alert">{error}</p>}
        {message && <p className="admin-settings-success" role="status">{message}</p>}
        <div className="admin-settings-actions">
          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </form>
    </main>
  );
}
