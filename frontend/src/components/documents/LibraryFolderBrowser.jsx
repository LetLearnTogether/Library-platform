import { Link } from 'react-router-dom';

const documentTypes = ['Midterm', 'Final', 'Assignment', 'Quiz', 'Syllabus'];

function semesterSlug(semester) {
  return `${semester.toLowerCase()}-semester`;
}

function semesterLabel(slug) {
  const normalized = slug.toLowerCase().replace(/-semester$/, '');
  if (normalized === 'first') return 'First';
  if (normalized === 'second') return 'Second';
  return null;
}

function lecturerFolderSegment(course) {
  return course.lecturer_id == null ? 'unassigned' : `lecturer-${course.lecturer_id}`;
}

function folderLink(courseCode, year, semester, documentType, lecturer) {
  const coursePath = `/courses/${encodeURIComponent(courseCode)}`;
  if (year === undefined) return coursePath;
  if (semester === undefined) return `${coursePath}/${year}`;
  if (documentType === undefined) return `${coursePath}/${year}/${semesterSlug(semester)}`;
  const documentTypePath = `${coursePath}/${year}/${semesterSlug(semester)}/${encodeURIComponent(documentType)}`;
  return lecturer === undefined ? documentTypePath : `${documentTypePath}/${lecturer}`;
}

function FolderCard({ to, icon, title, description }) {
  return (
    <Link className="library-folder-card" to={to}>
      <span className="library-folder-icon" aria-hidden="true">{icon}</span>
      <span className="library-folder-copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <span className="library-folder-arrow" aria-hidden="true">›</span>
    </Link>
  );
}

export default function LibraryFolderBrowser({
  courses,
  loading,
  error,
  courseCode,
  year,
  semester: semesterPath,
  documentType,
  lecturer,
}) {
  const selectedCourse = courses.find((course) => course.course_code === courseCode);
  const selectedSemester = semesterPath ? semesterLabel(semesterPath) : null;
  const invalidPath = Boolean(courseCode) && (
    !selectedCourse
    || (year !== undefined && String(selectedCourse?.year) !== year)
    || (semesterPath !== undefined && selectedCourse?.semester !== selectedSemester)
    || (documentType !== undefined && !documentTypes.includes(documentType))
    || (lecturer !== undefined && (
      documentType === undefined
      || lecturer.toLowerCase() !== lecturerFolderSegment(selectedCourse).toLowerCase()
    ))
  );

  if (courseCode && !selectedCourse && loading) {
    return (
      <section className="library-folder-browser" aria-labelledby="folder-browser-title">
        <p className="eyebrow">BROWSE BY FOLDER</p>
        <h2 id="folder-browser-title">Course folders</h2>
        <p className="library-folder-feedback" role="status">Loading course folders…</p>
      </section>
    );
  }

  if (courseCode && !selectedCourse && error) {
    return (
      <section className="library-folder-browser" aria-labelledby="folder-browser-title">
        <p className="eyebrow">BROWSE BY FOLDER</p>
        <h2 id="folder-browser-title">Course folders unavailable</h2>
        <p className="library-folder-feedback">The course catalog couldn’t be loaded. Please try again later.</p>
      </section>
    );
  }

  if (invalidPath) {
    return (
      <section className="library-folder-browser" aria-labelledby="folder-browser-title">
        <p className="eyebrow">BROWSE BY FOLDER</p>
        <h2 id="folder-browser-title">Folder not found</h2>
        <p className="library-folder-feedback">This folder path doesn’t match a course in the library.</p>
        <Link className="library-folder-back" to="/library">Browse all courses</Link>
      </section>
    );
  }

  const coursePath = selectedCourse
    ? folderLink(selectedCourse.course_code)
    : '/library';
  const yearPath = selectedCourse
    ? folderLink(selectedCourse.course_code, selectedCourse.year)
    : '';
  const semesterPathLink = selectedCourse
    ? folderLink(selectedCourse.course_code, selectedCourse.year, selectedCourse.semester)
    : '';
  const lecturerPath = selectedCourse && documentType
    ? folderLink(
      selectedCourse.course_code,
      selectedCourse.year,
      selectedCourse.semester,
      documentType,
      lecturerFolderSegment(selectedCourse),
    )
    : '';
  const lecturerLabel = selectedCourse?.lecturer_name || 'Unassigned lecturer';
  const currentLabel = lecturer !== undefined
    ? lecturerLabel
    : documentType
    || (semesterPath ? `${selectedCourse.semester} semester` : '')
    || (year ? `${selectedCourse.year} academic year` : '')
    || selectedCourse?.course_code
    || 'All courses';

  let folders;
  if (!selectedCourse) {
    const uniqueCourses = [...new Map(courses.map((course) => [course.course_code, course])).values()]
      .sort((left, right) => left.course_code.localeCompare(right.course_code));
    folders = uniqueCourses.map((course) => (
      <FolderCard
        key={course.id}
        to={folderLink(course.course_code)}
        icon="▰"
        title={course.course_code}
        description={course.course_title}
      />
    ));
  } else if (year === undefined) {
    folders = (
      <FolderCard
        to={yearPath}
        icon="▰"
        title={String(selectedCourse.year)}
        description="Academic year"
      />
    );
  } else if (semesterPath === undefined) {
    folders = (
      <FolderCard
        to={semesterPathLink}
        icon="▰"
        title={`${selectedCourse.semester} semester`}
        description="Semester"
      />
    );
  } else if (documentType === undefined) {
    folders = documentTypes.map((type) => (
      <FolderCard
        key={type}
        to={folderLink(selectedCourse.course_code, selectedCourse.year, selectedCourse.semester, type)}
        icon="▤"
        title={type}
        description="Verified study documents"
      />
    ));
  } else if (lecturer === undefined) {
    folders = (
      <FolderCard
        to={lecturerPath}
        icon="♙"
        title={lecturerLabel}
        description="Lecturer"
      />
    );
  } else {
    folders = null;
  }

  return (
    <section className="library-folder-browser" aria-labelledby="folder-browser-title">
      <div className="library-folder-heading">
        <div>
          <p className="eyebrow">BROWSE BY FOLDER</p>
          <h2 id="folder-browser-title">{selectedCourse ? 'Course folders' : 'Browse courses'}</h2>
        </div>
        <span className="library-folder-current">{currentLabel}</span>
      </div>

      <nav className="library-folder-breadcrumbs" aria-label="Folder path">
        <Link to="/library">All courses</Link>
        {selectedCourse && (
          <>
            <span aria-hidden="true">›</span>
            {year === undefined
              ? <span aria-current="page">{selectedCourse.course_code}</span>
              : <Link to={coursePath}>{selectedCourse.course_code}</Link>}
          </>
        )}
        {year !== undefined && (
          <>
            <span aria-hidden="true">›</span>
            {semesterPath === undefined
              ? <span aria-current="page">{selectedCourse.year}</span>
              : <Link to={yearPath}>{selectedCourse.year}</Link>}
          </>
        )}
        {semesterPath !== undefined && (
          <>
            <span aria-hidden="true">›</span>
            {documentType === undefined
              ? <span aria-current="page">{selectedCourse.semester} semester</span>
              : <Link to={semesterPathLink}>{selectedCourse.semester} semester</Link>}
          </>
        )}
        {documentType !== undefined && (
          <>
            <span aria-hidden="true">›</span>
            {lecturer === undefined
              ? <span aria-current="page">{documentType}</span>
              : <Link to={folderLink(selectedCourse.course_code, selectedCourse.year, selectedCourse.semester, documentType)}>{documentType}</Link>}
          </>
        )}
        {lecturer !== undefined && (
          <>
            <span aria-hidden="true">›</span>
            <span aria-current="page">{lecturerLabel}</span>
          </>
        )}
      </nav>

      {folders ? (
        folders.length === 0 ? (
          <p className="library-folder-feedback">No courses are available yet.</p>
        ) : (
          <div className="library-folder-grid">{folders}</div>
        )
      ) : (
        <p className="library-folder-feedback">Showing verified documents in this folder below.</p>
      )}
    </section>
  );
}
