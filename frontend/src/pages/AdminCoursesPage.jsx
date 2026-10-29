import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import './AdminDashboard.css';

const initialForm = {
  course_code: '',
  course_title: '',
  year: new Date().getFullYear(),
  semester: 'First',
  lecturer_id: '',
};

export default function AdminCoursesPage() {
  const [tab, setTab] = useState('view');
  const [courses, setCourses] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    const [coursePage, userPage] = await Promise.all([
      apiRequest('/courses?page=1&page_size=100'),
      apiRequest('/users?page=1&page_size=100&role=Lecturer'),
    ]);
    setCourses(coursePage.items);
    setLecturers(userPage.items);
  }, []);

  useEffect(() => {
    let active = true;
    refresh()
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Could not load courses.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [refresh]);

  async function createCourse(event) {
    event.preventDefault();
    setWorking(true);
    setError('');
    setMessage('');
    try {
      await apiRequest('/courses', {
        method: 'POST',
        body: {
          ...form,
          year: Number(form.year),
          lecturer_id: form.lecturer_id ? Number(form.lecturer_id) : null,
        },
      });
      setForm(initialForm);
      await refresh();
      setMessage('Course created successfully.');
      setTab('view');
    } catch (requestError) {
      setError(requestError.message || 'The course could not be created.');
    } finally {
      setWorking(false);
    }
  }

  async function assignLecturer(course, value) {
    setWorking(true);
    setError('');
    setMessage('');
    try {
      await apiRequest(`/courses/${course.id}`, {
        method: 'PATCH',
        body: { lecturer_id: value ? Number(value) : null },
      });
      await refresh();
      setMessage(`Updated lecturer for ${course.course_code}.`);
    } catch (requestError) {
      setError(requestError.message || 'The lecturer assignment could not be updated.');
    } finally {
      setWorking(false);
    }
  }

  async function deleteCourse(course) {
    if (!window.confirm(`Delete ${course.course_code} — ${course.course_title}? This cannot be undone.`)) return;
    setWorking(true);
    setError('');
    setMessage('');
    try {
      await apiRequest(`/courses/${course.id}`, { method: 'DELETE' });
      await refresh();
      setMessage('Course deleted.');
    } catch (requestError) {
      setError(requestError.message || 'The course could not be deleted.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="staff-page admin-page">
      <header className="staff-heading">
        <p className="eyebrow">ADMINISTRATION · COURSES</p>
        <h1>Course management</h1>
        <p>Create courses, browse the catalog, and assign lecturers to courses.</p>
      </header>

      {error && <p className="app-status" role="alert">{error}</p>}
      {message && <p className="app-status" role="status">{message}</p>}

      <nav className="admin-tabs" aria-label="Course management views">
        <button type="button" className={tab === 'create' ? 'admin-tab admin-tab-active' : 'admin-tab'} aria-pressed={tab === 'create'} onClick={() => setTab('create')}>Create course</button>
        <button type="button" className={tab === 'view' ? 'admin-tab admin-tab-active' : 'admin-tab'} aria-pressed={tab === 'view'} onClick={() => setTab('view')}>View courses <span>{courses.length}</span></button>
      </nav>

      {tab === 'create' ? (
        <section className="admin-tab-panel">
          <h2>Create a course</h2>
          <p>Add the course to the library catalog and optionally assign a lecturer.</p>
          <form className="admin-form" onSubmit={createCourse}>
            <label>Course code<input required maxLength="50" value={form.course_code} onChange={(event) => setForm({ ...form, course_code: event.target.value })} /></label>
            <label>Course title<input required maxLength="255" value={form.course_title} onChange={(event) => setForm({ ...form, course_title: event.target.value })} /></label>
            <label>Academic year<input required type="number" min="1900" max="2200" value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} /></label>
            <label>Semester<select value={form.semester} onChange={(event) => setForm({ ...form, semester: event.target.value })}><option>First</option><option>Second</option></select></label>
            <label>Lecturer<select value={form.lecturer_id} onChange={(event) => setForm({ ...form, lecturer_id: event.target.value })}><option value="">Unassigned</option>{lecturers.map((lecturer) => <option key={lecturer.id} value={lecturer.id}>{lecturer.name}</option>)}</select></label>
            <button className="primary-button" type="submit" disabled={working}>{working ? 'Creating…' : 'Create course'}</button>
          </form>
        </section>
      ) : (
        <section className="admin-tab-panel">
          <div className="admin-list-heading">
            <div><h2>Course catalog</h2><p>Assign a lecturer or remove a course from the catalog.</p></div>
            <button className="secondary-button" type="button" disabled={working || loading} onClick={() => { setLoading(true); refresh().catch((requestError) => setError(requestError.message)).finally(() => setLoading(false)); }}>Refresh list</button>
          </div>
          {loading ? <p className="app-status" role="status">Loading courses…</p> : courses.length ? courses.map((course) => (
            <article className="staff-card admin-card" key={course.id}>
              <div>
                <span className="course-code">{course.course_code}</span>
                <h3>{course.course_title}</h3>
                <p>{course.year} · {course.semester} semester</p>
              </div>
              <div className="staff-actions">
                <label className="admin-lecturer-select">
                  Lecturer
                  <select aria-label={`Lecturer for ${course.course_code}`} value={course.lecturer_id ?? ''} disabled={working} onChange={(event) => assignLecturer(course, event.target.value)}>
                    <option value="">Unassigned</option>
                    {lecturers.map((lecturer) => <option key={lecturer.id} value={lecturer.id}>{lecturer.name}</option>)}
                  </select>
                </label>
                <button className="admin-danger-button" type="button" disabled={working} onClick={() => deleteCourse(course)}>Delete</button>
              </div>
            </article>
          )) : <p className="dashboard-empty">No courses have been created yet.</p>}
          {courses.length === 100 && <p className="admin-note">Showing the first 100 courses.</p>}
        </section>
      )}
    </main>
  );
}
