LETLEARNTOGETHER

SOFTWARE REQUIREMENTS SPECIFICATION

Version 3.0 — Final Approved Draft

Date: 23 October 2026

| Document Information | Details |
| --- | --- |
| Project Name | LetLearnTogether |
| Organization Name | LetLearnTogether |
| GitHub Username | systemdesign11developers-cmyk |
| Project Email | systemdesign11developers@gmail.com |
| Date Established | 20 October 2026 |

Prepared for system design, development, testing, and project handover.

# 1. Project and Team Credentials

| Credential | Details |
| --- | --- |
| Organization Name | LetLearnTogether |
| GitHub Username | systemdesign11developers-cmyk |
| Project Email | systemdesign11developers@gmail.com |
| Date Established | 20 October 2026 |
| SRS Version | 3.0 — Final Approved Draft |
| Document Date | 23 October 2026 |

# 2. Introduction

This Software Requirements Specification (SRS) details the technical, functional, and non-functional requirements for the LetLearnTogether platform. It serves as the definitive guide for the Backend, Frontend, and Database teams, ensuring that the system is developed according to the agreed specification.

# 3. System Actors and Technical Permissions

| Actor | Technical Permissions and System Access |
| --- | --- |
| Visitor | GET public metadata and access the public verification page at /api/v1/verification/{token}. |
| Student | POST /auth/register; submit document upload requests; GET (read/view) and GET (download) verified documents and quizzes; POST quiz attempts. Cannot DELETE or UPDATE core data. |
| Lecturer | All Student permissions, plus PUT/PATCH document reviews (approve/reject) and POST/PUT quizzes. Access is restricted to assigned courses. |
| Moderator | GET/PUT reports, DELETE content, and PUT document status to revoke a stamp. |
| Admin | Full CRUD access for Users, Roles, Courses, and System Settings. |

# 4. Functional Requirements (Technical Detail)

| Req. ID | Module | Technical Implementation Detail |
| --- | --- | --- |
| FR-AUTH-01 | Authentication | The system shall allow registration using an email address and password. Passwords must be hashed using bcrypt. |
| FR-AUTH-02 | Authentication | The system shall issue a JWT (JSON Web Token) upon successful login. |
| FR-AUTH-03 | Authentication | The system shall enforce Role-Based Access Control (RBAC) on all protected API endpoints. |
| FR-DOC-01 | Upload Request | The system shall accept PDF/image uploads from Students. The database status column must default to “Under Review.” |
| FR-DOC-02 | Approval Logic | Lecturer/Moderator/Admin endpoints shall allow the status to be changed to “Verified” or “Rejected.” Lecturers may review documents for courses assigned to them; Moderators and Admins may review documents across courses. Changing the status to “Verified” triggers UUID and QR-code generation. |
| FR-DOC-03 | Read & Download | The system shall provide GET endpoints for students to view files inline or download them. The API shall return only files where status = 'Verified'. Files must be served with appropriate MIME types for browser viewing or download. |
| FR-VER-01 | Digital Stamp | When a document status changes to “Verified,” the system generates a unique UUID and a QR code linking to /verify/{token}. |
| FR-VER-02 | Verification | The public verification page shall display Document ID, Course, Approval Date, and Current Status (Verified/Revoked). |
| FR-QUIZ-01 | Quizzes | Lecturers can create multiple-choice (MCQ) quizzes with a question, options, and correct-answer index. |
| FR-QUIZ-02 | Quizzes | The system shall calculate scores on the server upon submission to prevent client-side cheating. |
| FR-QUIZ-03 | Quizzes | The system shall save attempt history (score, date, and quiz ID) linked to the Student user ID. |

# 5. Non-Functional Requirements (Technical Metrics)

| Req. ID | Category | Technical Constraint / Metric |
| --- | --- | --- |
| NFR-PERF-01 | Performance | API response time for search and list endpoints must be under 500 ms on standard 3G/4G connections. |
| NFR-PERF-02 | Performance | All list endpoints must support pagination, with a default of 20 items per page. |
| NFR-SEC-01 | Security | All traffic must be served over HTTPS via Cloudflare. |
| NFR-SEC-02 | Security | Input validation must be enforced on all API endpoints to help prevent SQL injection and cross-site scripting (XSS). |
| NFR-SEC-03 | Security | File uploads must be validated by MIME type and extension to help prevent malicious file execution. |
| NFR-REL-01 | Reliability | The database must be backed up daily. A restore procedure must be documented and tested. |

# 6. UI/UX and Folder Structure Implementation

To implement the virtual-folder structure without creating physical server folders, the system will use relational database filtering and frontend routing.

## 6.1 Frontend Routing

The user interface will use nested routes, for example: /courses/CS101/2025/First-Semester/Midterm.

## 6.2 Backend Querying

When a user selects a folder, the frontend sends a GET request with query parameters, for example: ?course_id=1&year=2025&semester=1&type=Midterm. The backend filters the MySQL database and returns only the relevant documents.

# 7. Data Requirements (MySQL Schema)

The Database team must implement the following core entities to support the hierarchical folder structure and lecturer tracking.

| Table Name | Key Columns and Data Types | Purpose |
| --- | --- | --- |
| Users | id (PK), name, email (Unique), password_hash, role (Enum) | Stores all system actors. |
| Courses | id (PK), course_code (Unique), course_title, year, semester, lecturer_id (FK to Users) | Represents the main folder and tracks who taught the course. |
| Documents | id (PK), course_id (FK), document_type (Enum: Midterm, Final, Quiz, etc.), file_path, status (Enum), verification_token (Unique) | Stores metadata for the papers inside each course folder. |
| Quizzes | id (PK), course_id (FK), title, type, is_published (Boolean) | Stores quizzes separately from regular papers to support auto-marking. |
| Quiz_Attempts | id (PK), user_id (FK), quiz_id (FK), score, attempted_at | Tracks student quiz history. |

# 8. API Specification and Contract

The API is a core product component and must follow these standards:

| API Standard | Requirement |
| --- | --- |
| Base URL | /api/v1/ |
| Format | JSON only. |
| Naming | Use plural resource names, for example /api/v1/documents and /api/v1/quizzes. |
| Standard Error Format | {"error_code": "DOC_NOT_FOUND", "message": "The requested document does not exist.", "request_id": "req_12345abc"} |
| Documentation | Auto-generated OpenAPI (Swagger UI) must be enabled at /docs. |

# 9. Infrastructure and Deployment Environment

To ensure consistency between development, testing, and production environments, the team shall follow the infrastructure standards below.

## 9.1 Operating System

The production VPS and all development environments will run on Ubuntu (Linux), providing stability, security, and compatibility with standard server tools.

## 9.2 Containerization

The application (Backend, Frontend, and Database) will be containerized using Docker. This helps the application run consistently on developers’ computers and the live VPS, reducing environment-related errors.

## 9.3 Environment Variables (.env.sample)

Sensitive data, including passwords, API keys, and database credentials, must never be committed to GitHub. The repository will include a .env.sample file listing required variables. Each developer must create a local .env file based on this sample.

# 10. Testing and Maintenance Strategy

## 10.1 User Acceptance Testing (UAT)

Before the final submission on 17 November 2026, the team will conduct formal UAT. Real students and lecturers will use the live system to perform core tasks—including uploading, verifying, and taking quizzes—to confirm that the system meets business requirements and is easy to use.

## 10.2 Maintenance and Handover

The system is designed for long-term maintenance by future cohorts. Major deployments and the final handover will require formal sign-off from the Project Lead and Lecturer. A complete Runbook will explain how to restart Docker containers, update the Ubuntu server, and restore database backups.

# 11. Phased Testing Strategy (Sprint-Based)

| Sprint | Phase | Testing Focus | Responsible Team |
| --- | --- | --- | --- |
| Sprint 1 | Setup & Unit | Verify environment setup; run basic unit tests for database schema and API routing. | Database & Backend |
| Sprint 2 | Integration | Test API integration to ensure frontend mock data matches backend JSON; test database connectivity. | Backend & Frontend |
| Sprint 3 | Feature Testing | Run end-to-end tests for authentication, document upload, and virtual-folder browsing. | QA & All Teams |
| Sprint 4 | UAT & Features | Test quizzes, digital stamps, and QR verification. Begin UAT with real students. | QA, UX & Product Owner |
| Sprint 5 | Final & Security | Run regression and performance tests on slow mobile networks, conduct a security audit, and obtain final UAT sign-off. | QA & Security |

# 12. Glossary of Terms

API (Application Programming Interface): The set of rules and endpoints that allows the Frontend (React) and Backend (FastAPI) to communicate.

ERD (Entity Relationship Diagram): A visual diagram showing database tables, such as Users, Courses, and Documents, and how they relate.

JWT (JSON Web Token): A digital token issued when a user logs in, proving identity and conveying claims to the server.

MVP (Minimum Viable Product): The simplest version of the app that includes the core required features: Library, Quizzes, and Stamps.

PWA (Progressive Web App): A website designed to feel like a mobile app and that can be installed on a phone’s home screen.

Pull Request (PR): A request to merge a developer’s code into the main project repository, typically following review and approval.

RBAC (Role-Based Access Control): A security method that restricts access based on a user’s role, such as Student or Lecturer.

Repository (Repo): The central project folder on GitHub where code and documents are stored.

VPS (Virtual Private Server): A rented cloud computer used to host the website and database so they are accessible over the internet.

# 13. Approvals and Signatures

| Role | Name | Signature | Date |
| --- | --- | --- | --- |
| Project Lead / Product Owner | Oliver D. Toe | ________________________ | ______________ |
| Database Team Lead | Oliver D. Toe | ________________________ | ______________ |
| Backend Team Lead | J. Philip Sleh | ________________________ | ______________ |
| Frontend Team Lead | Prince M Gbolon | ________________________ | ______________ |
| Lecturer / Supervisor | Kwitee D Gaylah | ________________________ | ______________ |
