LETLEARNTOGETHER

PRODUCT REQUIREMENTS DOCUMENT

Open Student Past Papers & Library Platform

| Document Detail | Value |
| --- | --- |
| Version | 3.0 — Final Approved Draft |
| Document Date | 23 October 2026 |
| Final Submission Deadline | Tuesday, 17 November 2026 |
| Project Lead / Product Owner | Oliver D. Toe |
| Lecturer / Supervisor | Kwitee D Gaylah |

Prepared for academic project planning and implementation

# 1. Project Overview: What We Are Building and Why

## The Problem

Students currently prepare for exams using past papers scattered across WhatsApp chats and personal phones. These files are often incomplete, unverified, and difficult to search, causing stress and academic disadvantage.

## The Solution

LetLearnTogether is a mobile-first, phone-friendly web platform where students can find, read, download, and verify past examination papers and practice multiple-choice quizzes. It replaces disorganized chat files with a trusted, searchable, and moderated archive.

## The Four Main Portions of the Project

1. The Document Library (The Core): A hierarchical, folder-like browsing system for PDFs and photos, tagged by Course, Year, Semester, and Exam Type.

2. Verification & Digital Stamp (The Trust): A unique ID and QR code for every approved paper, linking to a public page showing its “Verified” or “Revoked” status.

3. Quizzes (The Practice): Multiple-choice quizzes created by lecturers, auto-marked by the system, with saved score history.

4. Infrastructure (The Engine): A fast API (FastAPI), solid database (MySQL), and mobile-friendly frontend (React PWA), hosted on a real VPS (Ubuntu/Docker) with a Cloudflare domain.

# 2. The “Folder” Structure (UI & Organization)

To avoid overwhelming users with a massive list of files, the system will use a hierarchical virtual-folder structure:

| Level | Organization | Example |
| --- | --- | --- |
| Level 1 | Course | CS101 — Introduction to Programming |
| Level 2 | Year & Semester | 2025, First Semester |
| Level 3 | Document Type | Midterm, Final, Assignment, Quiz, Syllabus |
| Level 4 | Lecturer | Prof. Kwitee D Gaylah |

Rationale: This structure mimics a physical filing cabinet, making it easy for students to find the exact materials they need on a small mobile screen without unnecessary stress.

# 3. Methodology and Principles

| Principle | Description |
| --- | --- |
| Agile Scrum (1-Week Sprints) | Aligned with the university’s weekly deliverables for rapid iteration and grading checkpoints. |
| API-First & Contract-First Design | The API contract is defined before coding, allowing Frontend, Backend, and Database teams to work in parallel. |
| Mobile-First & Low-Bandwidth Design | The UI is designed for mobile screens and slow 3G/4G networks first. |

# 4. Technology Stack and Infrastructure

| Component | Technology | Justification |
| --- | --- | --- |
| Frontend | React + Vite | Component-based, fast build times, and an excellent ecosystem for Progressive Web Apps (PWAs). |
| Backend | Python + FastAPI | Automatically generates interactive OpenAPI (Swagger) documentation, offers high performance, and is easy to learn. |
| Database | MySQL | A relational database suited to complex relationships among Users, Courses, and Documents. |
| Domain | Cloudflare | Registered via Cloudflare as required by course rules; provides industry-standard DNS and free SSL/HTTPS. |
| Hosting | VPS (DigitalOcean) | Provides root access for custom deployment, a reverse proxy (Nginx), and database hosting. |

## Infrastructure Cost Estimate

| Item | Estimated Cost |
| --- | --- |
| Domain Name | $10.00 per year (Cloudflare) |
| VPS Hosting | $24.00 per month (DigitalOcean) |
| Total Initial Cost | $34.00 |

# 5. Sprint Schedule (4 Weeks)

All deliverables are due on Tuesdays.

| Sprint | Period | Planned Deliverables |
| --- | --- | --- |
| Sprint 1 (Week 1) | 14–20 October | Team setup, PRD/SRS approval, GitHub repository creation, API contract draft, and VPS/domain research. |
| Sprint 2 (Week 2) | 21–27 October | System Design Document, domain purchased, VPS provisioned and live, ERD finalized, and mock API running. |
| Sprint 3 (Week 3) | 28 October–3 November | Authentication (login/register) live, Document Library (upload/search/download) live, and PWA shell installed. |
| Sprint 4 (Week 4) | 4–10 November | Digital Stamp and verification page live, quizzes (MCQ and auto-marking) live, final polish, User Manual, and final submission. |

# 6. Team Structure, Roles, and Tasks

## Team 1 — Database

| Student ID | Member Name | Role / Responsibility | Tasks | Notes |
| --- | --- | --- | --- | --- |
| [Insert ID] | Oliver D. Toe | Database Team Lead | Oversee database design, coordinate with Backend, and manage backups. |  |
| [Insert ID] | Albert D.T Doe | ERD & Data Dictionary | Design the Entity Relationship Diagram and define data types. |  |
| [Insert ID] | Alice Kuoh | Schema & Indexes | Write SQL schema, set constraints, and optimize search indexes. |  |
| [Insert ID] | Alvin S. Zem | Migrations & Seed Data | Write migration scripts, create dummy data, and test restoration. |  |

## Team 2 — Backend

| Student ID | Member Name | Role / Responsibility | Tasks | Notes |
| --- | --- | --- | --- | --- |
| [Insert ID] | J. Philip Sleh | Backend Team Lead | Manage API architecture, code reviews, and pull-request merges. |  |
| [Insert ID] | Edwin M Snogba | Identity & Access | Implement registration, login, JWT tokens, and Role-Based Access Control. |  |
| [Insert ID] | Richard Trueh | Core Services (Docs) | Build upload, browse, search, download, and review-workflow APIs. |  |
| [Insert ID] | Ernest B Nyema | Quizzes & Stamps | Implement quiz logic, auto-marking, Digital Stamp generation, and QR API. |  |

## Team 3 — Frontend

| Student ID | Member Name | Role / Responsibility | Tasks | Notes |
| --- | --- | --- | --- | --- |
| [Insert ID] | Prince M Gbolon | Frontend Team Lead | Manage PWA setup, routing, state management, and code reviews. |  |
| [Insert ID] | Kim F Karmbor | UI Components | Build layout, navigation, reusable buttons/forms, and mobile styling. |  |
| [Insert ID] | Estella Tugbe | Student Library | Build upload, search/filter, and document-download screens. |  |
| [Insert ID] | Jerome Allison | Dashboards & Quizzes | Build user dashboards, quiz-taking UI, and verification-page UI. |  |

# 7. Functional Requirements

| Req. ID | Module | Description | Priority |
| --- | --- | --- | --- |
| FR-01 | Authentication | The system shall allow registration and login with hashed passwords and issue JWT tokens. | Must |
| FR-02 | Roles | The system shall enforce Role-Based Access Control (Student, Lecturer, Moderator, Admin). | Must |
| FR-03 | Upload & Request | Students can upload PDFs/images, but this creates only a “Request to Publish.” The document remains “Under Review” and is not visible to others until approved. | Must |
| FR-04 | Approval Workflow | Only Lecturers, Admins, or Moderators can approve a document request. Once approved, the system generates a unique Digital Stamp and QR code. | Must |
| FR-05 | Read & Download | Students can read (view online) and download approved papers, tests, midterms, and quizzes. The system shall display these in a hierarchical folder view. | Must |
| FR-06 | Verification | The public page shall display “Verified” or “Revoked” status when a QR code is scanned. | Must |
| FR-07 | Quizzes | Lecturers shall create MCQ quizzes. Students can take them, and the system shall auto-mark submissions and save score history. | Must |
| FR-08 | Search | Users shall search and filter by keyword, course, year, type, and verification status. | Should |

# 8. Non-Functional Requirements

| Req. ID | Category | Description | Acceptance Metric / Target |
| --- | --- | --- | --- |
| NFR-01 | Performance | API response time for search and list endpoints. | Under 500 ms on standard 3G/4G connections. |
| NFR-02 | Performance | All list endpoints must support pagination. | Default: 20 items per page. |
| NFR-03 | Security | All traffic must be served over HTTPS. | Enforced via Cloudflare SSL. |
| NFR-04 | Security | Passwords must be hashed. | Use bcrypt or Argon2. |
| NFR-05 | Security | File uploads must be validated. | Check MIME type and extension to help prevent malware. |
| NFR-06 | Reliability | The database must be backed up. | Daily automated backups with a tested restore procedure. |
| NFR-07 | Usability | The frontend must be mobile-friendly and installable. | Must function as a Progressive Web App (PWA). |

# 9. Acceptance Criteria (Definition of Done)

☐  AC-01: User can register/login; unauthorized users are blocked from protected API routes.

☐  AC-02: A permitted user can upload a file with metadata and see its review status.

☐  AC-03: A lecturer can approve/reject a document; the action is logged with a timestamp.

☐  AC-04: An approved document has a unique QR stamp; the public page shows the correct status.

☐  AC-05: A student can search/filter, read, and download an approved file on a mobile device.

☐  AC-06: A student can take a quiz, receive an automatically calculated score, and view score history.

☐  AC-07: The platform is installable as a PWA and hosted over HTTPS on the registered domain.

# 10. Glossary of Terms

API (Application Programming Interface): A set of rules and endpoints that allows the Frontend (React) and Backend (FastAPI) to communicate.

ERD (Entity Relationship Diagram): A visual diagram showing database tables (such as Users, Courses, and Documents) and how they relate.

JWT (JSON Web Token): A secure digital token issued when a user logs in, proving identity and conveying claims to the server.

MVP (Minimum Viable Product): The simplest version of the app that includes the core required features: Library, Quizzes, and Stamps.

PWA (Progressive Web App): A website built to look and feel like a mobile app and that can be installed on a phone’s home screen.

Pull Request (PR): A request to merge a developer’s code into the main project repository, typically after review and approval.

RBAC (Role-Based Access Control): A security method that restricts access based on a user’s role, such as Student or Lecturer.

Repository (Repo): The central project folder on GitHub where code and documents are stored.

VPS (Virtual Private Server): A rented cloud computer used to host the website and database so they are accessible over the internet.

# 11. Approvals and Signatures

| Role | Name | Signature | Date |
| --- | --- | --- | --- |
| Project Lead / Product Owner | Oliver D. Toe | ____________________________ | ________________ |
| Database Team Lead | Oliver D. Toe | ____________________________ | ________________ |
| Backend Team Lead | J. Philip Sleh | ____________________________ | ________________ |
| Frontend Team Lead | Prince M Gbolon | ____________________________ | ________________ |
| Lecturer / Supervisor | Kwitee D Gaylah | ____________________________ | ________________ |
