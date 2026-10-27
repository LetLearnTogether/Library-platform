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

The API is available at `http://localhost:8000`; interactive documentation is at `http://localhost:8000/docs`. Without a configured `DB_HOST` or `DATABASE_URL`, local development uses SQLite.

Configure `SECRET_KEY`, `DATABASE_URL` or the `DB_*` values, `PUBLIC_API_BASE_URL`, `CORS_ORIGINS`, `UPLOAD_DIR`, and `MAX_UPLOAD_SIZE_BYTES` in `backend/.env`. Use a private random secret and do not commit this file.

## Frontend integration

Set the frontend API base URL to `http://localhost:8000/api/v1` for local development. The backend's default CORS origins allow Vite at `localhost:5173` and `127.0.0.1:5173`; configure production origins explicitly.

Frontend clients should:

- Send the JWT as a bearer token for protected endpoints.
- Use `multipart/form-data` for `POST /documents`, including `file`, `course_id`, and `document_type`.
- Expect new uploads to return `Under Review`; these files are not included in public library results until approved.
- Use `GET /documents/{document_id}/content?disposition=inline` to view and `disposition=attachment` to download verified files.
- Read page metadata from list responses and request pages using `page` and `page_size`.
- Submit quiz answers by question ID and option index; never send a client-computed score.
- Display the error `message` and retain `request_id` for support/debugging.

## Database integration

The application models live in `backend/app/models/entities.py`; the MySQL reference is [schema.sql](./schema.sql). Startup creates missing tables but does not update an existing schema. Before connecting to an existing shared MySQL database:

1. Compare model and schema changes with the database team.
2. Prepare and review a migration.
3. Back up the database.
4. Apply the migration in a non-production environment first.
5. Run the backend tests and verify the feature against MySQL.

Database changes must be compatible with deployed API versions or coordinated with the API change.

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
