import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { apiRequest } from '../lib/api.js';
import './CourseAnnouncementsPage.css';

const emptyForm = { title: '', body: '' };

export default function CourseAnnouncementsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [courseId, setCourseId] = useState(searchParams.get('course_id') || '');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    apiRequest('/courses?page=1&page_size=100')
      .then((result) => {
        if (!active) return;
        const availableCourses = user.role === 'Lecturer'
          ? result.items.filter((course) => course.lecturer_id === user.id)
          : result.items;
        setCourses(availableCourses);
        const requestedCourseId = searchParams.get('course_id');
        setCourseId((current) => {
          const preferred = requestedCourseId || current;
          if (preferred && availableCourses.some((course) => String(course.id) === preferred)) return preferred;
          return availableCourses[0] ? String(availableCourses[0].id) : '';
        });
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Courses could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [retry, searchParams, user.id, user.role]);

  useEffect(() => {
    let active = true;
    if (!courseId) {
      return () => { active = false; };
    }

    apiRequest(`/courses/${courseId}/announcements/manage`)
      .then((items) => {
        if (active) {
          setAnnouncements(items);
          setError('');
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Announcements could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [courseId, retry]);

  function chooseCourse(value) {
    setCourseId(value);
    setSearchParams(value ? { course_id: value } : {});
    setLoading(true);
    setEditingId(null);
    setForm(emptyForm);
    setMessage('');
  }

  async function submitAnnouncement(event) {
    event.preventDefault();
    setWorking(true);
    setError('');
    setMessage('');
    try {
      if (editingId) {
        await apiRequest(`/course-announcements/${editingId}`, { method: 'PUT', body: form });
      } else {
        await apiRequest(`/courses/${courseId}/announcements`, { method: 'POST', body: form });
      }
      const updated = await apiRequest(`/courses/${courseId}/announcements/manage`);
      setAnnouncements(updated);
      setForm(emptyForm);
      setEditingId(null);
      setMessage(editingId ? 'Announcement updated.' : 'Announcement published.');
    } catch (requestError) {
      setError(requestError.message || 'The announcement could not be saved.');
    } finally {
      setWorking(false);
    }
  }

  function editAnnouncement(announcement) {
    setEditingId(announcement.id);
    setForm({ title: announcement.title, body: announcement.body });
    setError('');
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteAnnouncement(announcement) {
    if (!window.confirm(`Delete "${announcement.title}"? This cannot be undone.`)) return;
    setWorking(true);
    setError('');
    setMessage('');
    try {
      await apiRequest(`/course-announcements/${announcement.id}`, { method: 'DELETE' });
      setAnnouncements((current) => current.filter((item) => item.id !== announcement.id));
      setMessage('Announcement deleted.');
      if (editingId === announcement.id) {
        setEditingId(null);
        setForm(emptyForm);
      }
    } catch (requestError) {
      setError(requestError.message || 'The announcement could not be deleted.');
    } finally {
      setWorking(false);
    }
  }

  const selectedCourse = courses.find((course) => String(course.id) === courseId);
  const retryLoading = useCallback(() => {
    setLoading(true);
    setError('');
    setRetry((current) => current + 1);
  }, []);

  return (
    <main className="course-announcements-page">
      <header className="course-announcements-page-header">
        <div>
          <p className="eyebrow">LECTURER WORKSPACE · COURSE UPDATES</p>
          <h1>Course announcements</h1>
          <p>Share important updates with students visiting your course in the library.</p>
        </div>
        <Link to={user.role === 'Admin' ? '/admin' : '/lecturer'}>Back to dashboard</Link>
      </header>

      {error && (
        <div className="course-announcements-page-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={retryLoading}>Retry</button>
        </div>
      )}
      {message && <p className="course-announcements-page-message" role="status">{message}</p>}

      {loading && courses.length === 0 ? (
        <p className="course-announcements-page-status" role="status">Loading your courses…</p>
      ) : courses.length === 0 ? (
        <section className="course-announcements-page-panel">
          <h2>No courses available</h2>
          <p>{user.role === 'Lecturer' ? 'Ask an administrator to assign you to a course.' : 'Create a course before posting an announcement.'}</p>
        </section>
      ) : (
        <>
          <section className="course-announcements-page-panel">
            <label className="course-announcements-course-select">
              <span>Course</span>
              <select value={courseId} onChange={(event) => chooseCourse(event.target.value)}>
                {courses.map((course) => (
                  <option value={course.id} key={course.id}>{course.course_code} — {course.course_title}</option>
                ))}
              </select>
            </label>

            <form className="course-announcement-form" onSubmit={submitAnnouncement}>
              <h2>{editingId ? 'Edit announcement' : 'Publish an announcement'}</h2>
              <label>
                <span>Title</span>
                <input
                  required
                  maxLength={160}
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="e.g. Change to next week's lecture"
                />
              </label>
              <label>
                <span>Message</span>
                <textarea
                  required
                  maxLength={5000}
                  rows={5}
                  value={form.body}
                  onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                  placeholder="Write the update students need to know..."
                />
              </label>
              <div className="course-announcement-form-actions">
                {editingId && (
                  <button
                    type="button"
                    className="course-announcements-secondary"
                    disabled={working}
                    onClick={() => { setEditingId(null); setForm(emptyForm); }}
                  >
                    Cancel edit
                  </button>
                )}
                <button type="submit" className="course-announcements-primary" disabled={working}>
                  {working ? 'Saving…' : editingId ? 'Save changes' : 'Publish announcement'}
                </button>
              </div>
            </form>
          </section>

          <section className="course-announcements-page-panel">
            <div className="course-announcements-list-heading">
              <div>
                <h2>{selectedCourse?.course_code} announcements</h2>
                <p>Newest posts appear first and are visible to visitors of this course.</p>
              </div>
              {loading && <span role="status">Refreshing…</span>}
            </div>
            {announcements.length === 0 && !loading ? (
              <p className="course-announcements-page-status">No announcements have been published for this course.</p>
            ) : (
              <div className="course-announcements-manage-list">
                {announcements.map((announcement) => (
                  <article className="course-announcements-manage-card" key={announcement.id}>
                    <div>
                      <h3>{announcement.title}</h3>
                      <p>{announcement.body}</p>
                      <span>
                        Posted by {announcement.author_name} · {new Date(announcement.created_at).toLocaleString()}
                        {announcement.updated_at !== announcement.created_at ? ' · Edited' : ''}
                      </span>
                    </div>
                    <div className="course-announcements-card-actions">
                      <button type="button" className="course-announcements-secondary" onClick={() => editAnnouncement(announcement)} disabled={working}>Edit</button>
                      <button type="button" className="course-announcements-danger" onClick={() => deleteAnnouncement(announcement)} disabled={working}>Delete</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
