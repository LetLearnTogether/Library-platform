# 📚 LetLearnTogether: Open Student Past Papers & Library Platform

![Status](https://img.shields.io/badge/Status-Active-green)
![License](https://img.shields.io/badge/License-MIT-blue)
![Version](https://img.shields.io/badge/Version-1.0.0-orange)

## 📖 Project Overview
**LetLearnTogether** is a mobile-first, phone-friendly web platform where students can find, read, download, and verify past examination papers, and practice multiple-choice quizzes. It replaces scattered, unverified chat files with a trusted, searchable, and moderated archive.

Administrators can use the `/admin` overview, with separate `/admin/accounts` and `/admin/courses` pages. Each management page has Create and View tabs for adding records and managing existing accounts, roles, courses, and lecturer assignments. Document review and report moderation are available in the separate `/staff` workspace.
Signed-in users use a dedicated workspace header and role-based sidebar. Public landing, login, and registration pages are only shown while signed out; signed-in users can open the document library inside their portal without the public landing page.

**Live Site:** [https://your-domain.com](https://your-domain.com) *(Update this when deployed)*  
**API Docs:** [https://your-domain.com/docs](https://your-domain.com/docs)

## 🛠️ Tech Stack & Infrastructure
*   **Frontend:** React + Vite (Progressive Web App)
*   **Backend:** Python + FastAPI
*   **Database:** MySQL
*   **OS & Deployment:** Ubuntu Linux, Docker (Containerized)
*   **Domain & DNS:** Cloudflare

## 📁 Documentation
Project requirements and engineering references:
* [Product Requirements Document](LetLearnTogether_PRD_v3.md)
* [Software Requirements Specification](LetLearnTogether_SRS_v3.md)
* [Backend architecture](docs/backend-architecture.md)
* [Backend API contracts](docs/backend-api-contracts.md) and [OpenAPI specification](docs/API_SPEC.yaml)
* [Backend integration guide](docs/backend-integration.md)
* [Backend code review guide](docs/backend-code-review.md)
* [Backend team coordination](docs/backend-coordination.md)
* [Backend delivery checklist](docs/backend-delivery.md)
* [MySQL schema reference](docs/schema.sql)
* [Production deployment runbook](docs/production-deployment.md)

## 🚀 Getting Started (Local Development)

### Prerequisites
Before you begin, ensure you have the following installed on your machine:
*   **Docker & Docker Compose** (Recommended for consistent environments)
*   **Node.js** (v18 or higher) - *If running frontend locally without Docker*
*   **Python** (v3.10 or higher) - *If running backend locally without Docker*
*   **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/LetLearnTogether/library-platform.git
cd library-platform
```

### 2. Environment Variables (CRITICAL SECURITY RULE)
⚠️ **NEVER commit real passwords or API keys to GitHub.** 
We use a `.env.sample` file to show the required variables. You must create your own local `.env` files.

**Backend Setup:**
```bash
cd backend
copy .env.example .env
# Set a long random SECRET_KEY. Fill in DB_HOST and the other DB_* values to use MySQL.
# The example defaults to SQLite for local development.
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend Setup:**
```bash
cd frontend
cp .env.sample .env.local
# Open .env.local and set VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### 3. Run with Docker (Recommended)
Since our production environment is Ubuntu, we use Docker to ensure the app runs exactly the same on your laptop as it does on the server.
```bash
# From the root directory
docker-compose up --build
```

### 4. Run Locally (Without Docker)
**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

On first startup, SQLAlchemy creates missing tables in the configured database. The MySQL schema reference is in [docs/schema.sql](docs/schema.sql). For a stable deployment, set `SECRET_KEY`, `DATABASE_URL` (or the `DB_*` values), `PUBLIC_API_BASE_URL`, `PUBLIC_FRONTEND_URL`, `CORS_ORIGINS`, and `UPLOAD_DIR` in `backend/.env`. Uploaded files are limited to 10 MiB by default and stored in `backend/uploads/`.

Apply the database migration with `alembic upgrade head` from `backend/` before running the API locally. Migrations do not automatically change an existing production schema; coordinate all schema updates with the database team.

For a fresh install, create the first administrator interactively from the `backend` directory with `python -m app.create_admin`. Public registration intentionally creates Student accounts only.

**Backend tests:**
```bash
cd backend
pip install -r requirements-dev.txt
python -m pytest tests -q
```

### Production deployment (DigitalOcean + Cloudflare)

The repository includes a Docker Compose deployment with MySQL, persistent database/document volumes, Nginx, and Caddy-managed HTTPS. Read the [production deployment runbook](docs/production-deployment.md) before deploying. It requires a provisioned VPS, DNS, a Cloudflare Full (strict) configuration, and secrets created on the host. A deployment has not been performed from this development workspace.

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## 🧪 Testing Strategy
We follow a phased, sprint-based testing approach to ensure continuous quality:
*   **Sprint 1-2:** Unit & Integration Testing (API and Database).
*   **Sprint 3-4:** Feature Testing & User Acceptance Testing (UAT).
*   **Sprint 5:** Final Regression, Security, and Performance Testing.
*   *See the [SRS Document](LetLearnTogether_SRS_v3.md) for the full testing checklist.*

## 👥 Team Members
| Role | Name | GitHub Username |
| :--- | :--- | :--- |
| **Project/DB Lead** | Oliver D. Toe | [Link to profile] |
| **DB Engineer** | Albert D.T Doe | [Link to profile] |
| **DB Engineer** | Alice Kuoh | [Link to profile] |
| **DB Engineer** | Alvin S. Zem | [Link to profile] |
| **Backend Lead** | J. Philip Sleh | [Link to profile] |
| **Backend Dev** | Edwin M Snogba | [Link to profile] |
| **Backend Dev** | Richard Trueh | [Link to profile] |
| **Backend Dev** | Ernest B Nyema | [Link to profile] |
| **Frontend Lead** | Prince M Gbolon | [Link to profile] |
| **Frontend Dev** | Kim F Karmbor | [Link to profile] |
| **Frontend Dev** | Estella Tugbe | [Link to profile] |
| **Frontend Dev** | Jerome Allison | [Link to profile] |

## 🤝 Contributing
We use a strict **API-First** and **Pull Request** workflow.
1. No direct commits to the `main` branch.
2. Create a feature branch: `git checkout -b feat/your-feature-name`
3. Submit a Pull Request (PR) and request a review from a Team Lead.
4. *See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed rules.*

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.