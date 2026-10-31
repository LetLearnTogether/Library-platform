import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { apiRequest } from '../lib/api.js';
import './CourseAnnouncements.css';

export default function CourseAnnouncements({ course }) {
  const { user } = useAuth();
  const courseId = course?.id;
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const canManage = user && ['Lecturer', 'Admin'].includes(user.role)
    && (user.role === 'Admin' || course?.lecturer_id === user.id);

  useEffect(() => {
    let active = true;
    if (!courseId) return () => { active = false; };

    apiRequest(`/courses/${courseId}/announcements`)
      .then((items) => {
        if (active) {
          setAnnouncements(items);
          setError('');
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Course announcements could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [courseId, retry]);

  const retryLoading = useCallback(() => {
    setLoading(true);
    setError('');
    setRetry((current) => current + 1);
  }, []);

  if (!course) return null;

  return (
    <section className="course-announcements" aria-labelledby="course-announcements-title">
      <div className="course-announcements-heading">
        <div>
          <p className="eyebrow">COURSE UPDATES</p>
          <h2 id="course-announcements-title">Announcements</h2>
        </div>
        {canManage && (
          <Link className="course-announcements-manage" to={`/lecturer/announcements?course_id=${course.id}`}>
            Manage announcements
          </Link>
        )}
      </div>

      {loading ? (
        <p className="course-announcement-feedback" role="status">Loading announcements…</p>
      ) : error ? (
        <div className="course-announcement-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={retryLoading}>Retry</button>
        </div>
      ) : announcements.length === 0 ? (
        <p className="course-announcement-feedback">There are no announcements for this course yet.</p>
      ) : (
        <div className="course-announcement-list">
          {announcements.map((announcement) => (
            <article className="course-announcement-card" key={announcement.id}>
              <div className="course-announcement-card-heading">
                <h3>{announcement.title}</h3>
                <time dateTime={announcement.created_at}>
                  {new Date(announcement.created_at).toLocaleDateString()}
                </time>
              </div>
              <p>{announcement.body}</p>
              <span>Posted by {announcement.author_name}</span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
