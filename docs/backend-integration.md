# Backend Integration Guide

## Local startup

From the repository root:

```powershell
cd backend
copy .env.example .env
python -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API is available at `http://localhost:8000`; interactive documentation is at `http://localhost:8000/docs`. Without a configured `DB_HOST` or `DATABASE_URL`, local development uses SQLite. The Vite development server proxies API requests to this local server.

Configure `SECRET_KEY`, `DATABASE_URL` or the `DB_*` values, `PUBLIC_API_BASE_URL`, `CORS_ORIGINS`, `UPLOAD_DIR`, and `MAX_UPLOAD_SIZE_BYTES` in `backend/.env`. Use a private random secret and do not commit this file.

Run `alembic upgrade head` from the `backend` directory before starting the API. The application does not mutate the database schema automatically. For the DigitalOcean + Cloudflare target, follow the [production deployment runbook](./production-deployment.md).

## Frontend integration

Set the frontend API base URL to `http://localhost:8000/api/v1` for local development. The backend's default CORS origins allow Vite at `localhost:5173` and `127.0.0.1:5173`; configure production origins explicitly.

Frontend clients should:

- Load `GET /settings/public` before rendering registration/upload controls and provide a retry state if settings cannot be fetched. Administrators manage these values through `GET/PATCH /settings`.
- Administrators can read the paginated, newest-first change history at `GET /activity`; entries include the actor and timestamp and exclude credentials.
- Treat `registration_enabled` and `uploads_enabled` as display hints; the API rejects public registration and Student uploads when their respective controls are disabled.
- Display the announcement when `announcement_enabled` is true and render `support_contact` as an email or HTTP(S) link when present.
- Send the JWT as a bearer token for protected endpoints.
- Use the public course `lecturer_name` display field to render the lecturer level of the virtual library; it is `null` when the course is unassigned and does not expose lecturer email or credentials.
- Use `multipart/form-data` for `POST /documents`, including `file`, `course_id`, and `document_type`. Lecturers can upload only to their assigned courses; their materials are published as `Verified`. Student submissions remain `Under Review` for Lecturer/moderator review.
- Lecturers can remove only their own materials from their assigned courses with `DELETE /documents/{document_id}`; other document removals remain restricted to Moderators/Admins.
- Use `GET /documents/{document_id}/content?disposition=inline` to view and `disposition=attachment` to download verified files.
- Read page metadata from list responses and request pages using `page` and `page_size`.
- Submit quiz answers by question ID and option index; never send a client-computed score.
- Quiz editors use `GET /quizzes/manage` to list published and draft quizzes in their authorized courses and `GET /quizzes/{quiz_id}/manage` to load a quiz for editing. Only the editor-specific detail response contains correct-answer indexes; public quiz responses must never expose them.
- Lecturers assigned to a quiz's course and Administrators can use `GET /quizzes/{quiz_id}/results` for quiz average score, paginated student attempts, and question/option performance. Historical attempts keep their scores; per-question analysis applies to attempts submitted after answer snapshots were introduced.
- Lecturers can use `GET /lecturer/performance` for attempt-weighted score averages and quiz counts across their assigned courses, plus the five lowest-accuracy questions with recorded responses. The Lecturer dashboard uses this course-scoped overview; quiz reports remain available per quiz.
- Course announcements are public at `GET /courses/{course_id}/announcements`; assigned Lecturers and Administrators can publish announcements and manage them through the course-scoped announcement endpoints. The library displays the announcements on the selected course page.
- Students can enroll in and leave courses with `POST/DELETE /courses/{course_id}/enrollment`, and view their enrolled courses and published-quiz progress with `GET /enrollments/mine`. A student must be enrolled before submitting a quiz attempt; leaving keeps the attempt history. Assigned Lecturers and Administrators can use `GET /courses/{course_id}/students` to view paginated enrollment and quiz progress.
- Display the error `message` and retain `request_id` for support/debugging.

## Database integration

The application models live in `backend/app/models/entities.py`; the MySQL reference is [schema.sql](./schema.sql). Startup creates missing tables but does not update an existing schema. Apply the Alembic migration `0005_course_announcements` before enabling course announcements on an existing database. Before connecting to an existing shared MySQL database:

1. Compare model and schema changes with the database team.
2. Prepare and review a migration.
3. Back up the database.
4. Apply the migration in a non-production environment first.
5. Run the backend tests and verify the feature against MySQL.

Apply Alembic migration `0006_course_enrollments` to existing databases before enabling enrollment and quiz enrollment checks. Database changes must be compatible with deployed API versions or coordinated with the API change.

## File storage integration

Documents are stored under `UPLOAD_DIR` and the database stores metadata and a storage path. Production requires persistent storage, access controls, disk-capacity monitoring, and a backup/restore plan for uploaded files. Do not treat ephemeral container storage as durable. File paths and uploaded content must not be exposed directly; serve files through the verified-document endpoint.

## Initial administrator

On a fresh installation, from the `backend` directory run:

```powershell
python -m app.create_admin
```

The command prompts for credentials and refuses to create another initial Admin after one exists. Public registration remains Student-only.

## Integration checks

```powershell
python -m pip install -r requirements-dev.txt
python -m pytest tests -q
```

Before delivery, also check `/docs`, frontend CORS, login/token flow, upload/review/download, QR verification, quiz scoring, and database behavior in the target environment.
