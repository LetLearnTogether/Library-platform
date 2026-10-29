# LetLearnTogether | SRS v3.0
## SOFTWARE REQUIREMENTS SPECIFICATION

| Document | Software Requirements Specification (SRS) |
| :--- | :--- |
| **Version** | 3.0 (Final Approved Draft) |
| **Date** | 23 October 2026 |
| **Audience** | Backend, Frontend and Database teams |
| **Project Lead** | Oliver D. Toee |
| **Supervisor** | Kwitee D Gaylah |

## 1. Introduction
This SRS details the technical, functional, and non-functional requirements for the LetLearnTogether platform. It serves as the definitive guide for the Backend, Frontend, and Database teams, ensuring the system is built to specification.

## 2. System Actors and Technical Permissions
| Actor | Technical Permissions & System Access |
| :--- | :--- |
| **Visitor** | GET public metadata, GET public verification page (`/api/v1/verification/{token}`). |
| **Student** | POST auth/register, POST document upload requests, GET (read/view) and GET (download) verified documents/quizzes, POST quiz attempts. Cannot DELETE or UPDATE core data. |
| **Lecturer** | All Student permissions + PUT/PATCH document reviews (approve/reject), POST/PUT quizzes. Restricted to assigned courses. |
| **Moderator** | GET/PUT reports, DELETE content, PUT document status (revoke stamp). |
| **Admin** | Full CRUD on Users, Roles, Courses, and System Settings. |

## 3. Functional Requirements (Technical Detail)
| Req ID | Module | Technical Implementation Detail |
| :--- | :--- | :--- |
| FR-AUTH-01 | Auth | System shall allow registration using email and password. Passwords must be hashed using bcrypt. |
| FR-AUTH-02 | Auth | System shall issue a JWT (JSON Web Token) upon successful login. |
| FR-AUTH-03 | Auth | System shall enforce Role-Based Access Control (RBAC) on all protected API endpoints. |
| FR-DOC-01 | Upload Request | System shall accept PDF/Image uploads from Students. The database status column must default to 'Under Review'. |
| FR-DOC-02 | Approval Logic | Lecturer/Admin endpoints shall allow changing the status to Verified or Rejected. Changing to Verified triggers UUID and QR code generation. |
| FR-DOC-03 | Read & Download | System shall provide GET endpoints for students to view (read inline) or download files. The API shall ONLY return files where status = 'Verified'. Files will be served with appropriate MIME types for browser viewing or download. |
| FR-VER-01 | Stamp | When status changes to Verified, system generates a unique UUID and a QR code linking to `/verify/{token}`. |
| FR-VER-02 | Verify | Public verification page shall display: Document ID, Course, Approval Date, and Current Status (Verified/Revoked). |
| FR-QUIZ-01 | Quizzes | Lecturers can create MCQ quizzes (Question, Options, Correct Answer Index). |
| FR-QUIZ-02 | Quizzes | System shall calculate the score server-side upon submission to prevent client-side cheating. |
| FR-QUIZ-03 | Quizzes | System shall save attempt history (Score, Date, Quiz ID) linked to the Student user ID. |

## 4. Non-Functional Requirements (Technical Metrics)
| Req ID | Category | Technical Constraint / Metric |
| :--- | :--- | :--- |
| NFR-PERF-01 | Performance | API response time for search and list endpoints must be < 500ms on standard 3G/4G connections. |
| NFR-PERF-02 | Performance | All list endpoints must support pagination (default 20 items per page). |
| NFR-SEC-01 | Security | All traffic must be served over HTTPS (via Cloudflare). |
| NFR-SEC-02 | Security | Input validation must be enforced on all API endpoints to prevent SQL Injection and XSS. |
| NFR-SEC-03 | Security | File uploads must be validated for MIME type and extension to prevent malicious file execution. |
| NFR-REL-01 | Reliability | Database must be backed up daily. A restore procedure must be documented and tested. |

## 5. UI/UX & Folder Structure Implementation
To implement the "virtual folder" structure without creating physical server folders, the system will use relational database filtering and frontend routing:

1. **Frontend Routing:** The UI will use nested routes (e.g., `/courses/CS101/2025/First-Semester/Midterm`).
2. **Backend Querying:** When a user clicks a "folder", the frontend sends a GET request with query parameters (e.g., `?course_id=1&year=2025&semester=1&type=Midterm`). The backend filters the MySQL database and returns only the relevant documents.

## 6. Data Requirements (MySQL Schema)
The Database team must implement the following core entities to support the hierarchical structure and lecturer tracking:

| Table Name | Key Columns & Data Types | Purpose |
| :--- | :--- | :--- |
| **Users** | id (PK), name, email (Unique), password_hash, role (Enum) | Stores all system actors. |
| **Courses** | id (PK), course_code (Unique), course_title, year, semester, lecturer_id (FK to Users) | Represents the "Main Folder". Tracks who taught it. |
| **Documents** | id (PK), course_id (FK), document_type (Enum: Midterm, Final, Quiz, etc.), file_path, status (Enum), verification_token (Unique) | The actual papers inside the folder. |
| **Quizzes** | id (PK), course_id (FK), title, type, is_published (Boolean) | Separate from regular papers for auto-marking. |
| **Quiz_Attempts** | id (PK), user_id (FK), quiz_id (FK), score, attempted_at | Tracks student quiz history. |

## 7. API Specification & Contract
The API is the core product. It must follow these rules:

1. **Base URL:** `/api/v1/`
2. **Format:** JSON only.
3. **Naming:** Plural resources (e.g., `/api/v1/documents`, `/api/v1/quizzes`).
4. **Standard Error Format:**
```json
{
  "error_code": "DOC_NOT_FOUND",
  "message": "The requested document does not exist.",
  "request_id": "req_12345abc"
}