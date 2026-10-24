# Library-platform
11Developers Library-platform
# LetLearnTogether 📚

**Open Student Past Papers & Library Platform**

## 🛠️ Tech Stack
- **Frontend:** React + Vite (PWA)
- **Backend:** Python + FastAPI
- **Database:** MySQL
- **Hosting:** DigitalOcean VPS + Cloudflare

## 👥 Team & Roles

### 🗄️ Database Team
| Name | Role / Responsibility |
| --- | --- |
| **Oliver D. Toee** | Project Lead / Database Team Lead |
| Albert D.T Doe | ERD & Data Dictionary |
| Alice Kuoh | Schema & Indexes |
| Alvin S. Zem | Migrations & Seed Data |

### ⚙️ Backend Team
| Name | Role / Responsibility |
| --- | --- |
| **J. Philip Sleh** | Backend Team Lead |
| Edwin M Snogba | Identity & Access |
| Richard Trueh | Core Services (Docs) |
| Ernest B Nyema | Quizzes & Stamps |

### 🎨 Frontend Team
| Name | Role / Responsibility |
| --- | --- |
| **Prince M Gbolon** | Frontend Team Lead |
| Kim F Karmbor | UI Components |
| Estella Tugbe | Student Library |
| Jerome Allison | Dashboards & Quizzes |

**Supervisor:** Kwitee D Gaylah

##  Methodology & Principles
- **Agile Scrum (1-Week Sprints):** Rapid iteration aligned with university deliverables and grading checkpoints.
- **API-First & Contract-First:** The API contract is defined before coding, allowing Frontend, Backend, and Database teams to work in parallel without blocking each other.
- **Mobile-First & Low-Bandwidth:** UI designed for mobile screens and slow 3G/4G networks first to ensure accessibility for all students.

## 📂 Project Structure
- `docs/` - PRD, SRS, API Contract, and Schema
- `backend/` - FastAPI application, models, routers, and services
- `frontend/` - React UI components, pages, and hooks

## 🗺️ Database Schema (ERD)
The visual relationship between our core database tables:

```mermaid
erDiagram
    USERS ||--o{ COURSES : "lectures"
    USERS ||--o{ DOCUMENTS : "uploads"
    USERS ||--o{ DOCUMENTS : "approves"
    USERS ||--o{ QUIZZES : "creates"
    USERS ||--o{ QUIZ_ATTEMPTS : "takes"
    COURSES ||--o{ DOCUMENTS : "contains"
    COURSES ||--o{ QUIZZES : "contains"
    QUIZZES ||--o{ QUIZ_QUESTIONS : "has"
    QUIZZES ||--o{ QUIZ_ATTEMPTS : "records"

    USERS {
        int id PK
        string name
        string email UK
        string password_hash
        enum role
    }
    COURSES {
        int id PK
        string course_code UK
        string course_title
        int year
        enum semester
    }
    DOCUMENTS {
        int id PK
        int course_id FK
        enum document_type
        enum status
        string verification_token
    }
    QUIZZES {
        int id PK
        int course_id FK
        string title
        boolean is_published
    }