# LetLearnTogether | PRD v3.0
## PRODUCT REQUIREMENTS DOCUMENT

| Version | 3.0 (Final Approved Draft) |
| :--- | :--- |
| **Date** | 23 October 2026 |
| **Final Submission Deadline** | Tuesday, 17 November 2026 |
| **Project Lead / Product Owner** | Oliver D. Toee |
| **Supervisor** | Kwitee D Gaylah |

## 1. Project Overview: What We Are Building and Why
**The Problem:** Students currently prepare for exams using past papers scattered across WhatsApp chats and personal phones. These files are often incomplete, unverified, and impossible to search, causing stress and academic disadvantage.

**The Solution:** LetLearnTogether is a mobile-first, phone-friendly web platform where students can find, download, and verify past examination papers, and practice multiple-choice quizzes. It replaces messy chat files with a trusted, searchable, and moderated archive.

**The 4 Main Portions of the Project:**
1. **The Document Library (The Core):** A hierarchical, folder-like browsing system for PDFs and photos, tagged by Course, Year, Semester, and Exam Type.
2. **The Verification & Digital Stamp (The Trust):** A unique ID and QR code for every approved paper, linking to a public page showing its "Verified" or "Revoked" status.
3. **The Quizzes (The Practice):** Multiple-choice quizzes created by lecturers, auto-marked by the system, with saved score history.
4. **The Infrastructure (The Engine):** A fast API (FastAPI), solid database (MySQL), and mobile-friendly frontend (React PWA), hosted on a real VPS with a Cloudflare domain.

## 2. The "Folder" Structure (UI & Organization)
To avoid overwhelming users with a massive list of files, the system will use a hierarchical "virtual folder" structure:

| Level | Category | Example |
| :--- | :--- | :--- |
| Level 1 | Course | CS101 - Intro to Programming |
| Level 2 | Year & Semester | 2025, First Semester |
| Level 3 | Document Type | Midterm, Final, Assignment, Quiz, Syllabus |
| Level 4 | Lecturer | Prof. Kwitee D Gaylah |

**Why?** This mimics a physical filing cabinet, making it incredibly easy for students to find exactly what they need on a small mobile screen without stress.

## 3. Methodology and Principles
1. **Agile Scrum (1-Week Sprints):** Aligned with the university's weekly deliverables for rapid iteration and grading checkpoints.
2. **API-First & Contract-First Design:** The API contract is defined before coding, allowing Frontend, Backend, and Database teams to work in parallel.
3. **Mobile-First & Low-Bandwidth Design:** UI designed for mobile screens and slow 3G/4G networks first.

## 4. Technology Stack and Infrastructure
| Component | Technology | Justification (Why we chose it) |
| :--- | :--- | :--- |
| Frontend | React + Vite | Component-based, fast build times, excellent ecosystem for Progressive Web Apps (PWAs). |
| Backend | Python + FastAPI | Automatically generates interactive OpenAPI (Swagger) docs, high performance, easy to learn. |
| Database | MySQL | Relational structure is perfect for complex relationships (Users, Courses, Documents). |
| Domain | Cloudflare | Registered via Cloudflare as per course rules. Industry standard for DNS and free SSL/HTTPS. |
| Hosting | VPS (DigitalOcean) | Provides full root access for custom deployment, reverse proxy (Nginx), and database hosting. |

**Infrastructure Cost Estimate:**
| Item | Cost |
| :--- | :--- |
| Domain Name (Cloudflare) | $10.00 / year |
| VPS Hosting (DigitalOcean) | $24.00 / month |
| **Total Initial Cost** | **$34.00** |

## 5. Sprint Schedule (4 Weeks)
All deliverables are due on Tuesdays.

| Sprint | Dates | Deliverables |
| :--- | :--- | :--- |
| Sprint 1 | Week 1: 21 - 27 Oct | Team setup, PRD/SRS approval, GitHub repo creation, API contract draft, VPS/Domain research. |
| Sprint 2 | Week 2: 28 Oct - 3 Nov | System Design Document, Domain bought, VPS provisioned & live, ERD finalized, Mock API running. |
| Sprint 3 | Week 3: 4 - 10 Nov | Auth (Login/Register) live, Document Library (Upload/Search/Download) live, PWA shell installed. |
| Sprint 4 | Week 4: 11 - 17 Nov | Digital Stamp & Verification page live, Quizzes (MCQ + Auto-marking) live, Final polish, User Manual, Final Submission. |

## 6. Team Structure, Roles, and Tasks

**Team 1 - Database**
| Student ID | Member Name | Role / Responsibility | Tasks |
| :--- | :--- | :--- | :--- |
| 35816 | Oliver D. Toee | Database Team Lead | Oversee DB design, coordinate with Backend, manage backups. |
| 27367 | Albert D.T Doe | ERD & Data Dictionary | Design Entity Relationship Diagram, define data types. |
| 31468 | Alice Kuoh | Schema & Indexes | Write SQL schema, set constraints, optimize search indexes. |
| 30577 | Alvin S. Zem | Migrations & Seed Data | Write migration scripts, create dummy data, test restore. |

**Team 2 - Backend**
| Student ID | Member Name | Role / Responsibility | Tasks |
| :--- | :--- | :--- | :--- |
| 30270 | J. Philip Sleh | Backend Team Lead | API architecture, code reviews, merge PRs. |
| 39305 | Edwin M Snogba | Identity & Access | Registration, Login, JWT tokens, Role-Based Access Control. |
| 34181 | Richard Trueh | Core Services (Docs) | Upload, Browse, Search, Download, Review workflow APIs. |
| 32847 | Ernest B Nyema | Quizzes & Stamps | Quiz logic, auto-marking, Digital Stamp generation, QR API. |

**Team 3 - Frontend**
| Student ID | Member Name | Role / Responsibility | Tasks |
| :--- | :--- | :--- | :--- |
| 41327 | Prince M Gbolon | Frontend Team Lead | PWA setup, routing, state management, code reviews. |
| 34488 | Kim F Karmbor | UI Components | Layout, Navigation, Reusable buttons/forms, Mobile styling. |
| 15818 | Estella Tugbe | Student Library | Upload screen, Search/Filter screen, Document download UI. |
| 40915 | Jerome Allison | Dashboards & Quizzes | User dashboards, Quiz taking UI, Verification page UI. |

## 7. Functional Requirements
| Req ID | Module | Description | Priority |
| :--- | :--- | :--- | :--- |
| FR-01 | Auth | System shall allow registration/login with hashed passwords and issue JWT tokens. | Must |
| FR-02 | Roles | System shall enforce Role-Based Access Control (Student, Lecturer, Moderator, Admin). | Must |
| FR-03 | Upload & Request | Students can upload PDFs/Images, but this only creates a "Request to Publish". The document is placed in an "Under Review" state and is NOT visible to others until approved. | Must |
| FR-04 | Approval Workflow | Only Lecturers, Admins, or Moderators can approve a document request. Once approved, the system generates a unique Digital Stamp and QR code. | Must |
| FR-05 | Read & Download | Students can read (view online) and download approved papers, tests, midterms, and quizzes. The system shall display these in a hierarchical "folder" view to reduce stress. | Must |
| FR-06 | Verify | Public page shall display "Verified" or "Revoked" status when a QR code is scanned. | Must |
| FR-07 | Quizzes | Lecturers shall create MCQ quizzes. Students can take them, and the system shall auto-mark submissions and save score history. | Must |
| FR-08 | Search | Users shall search/filter by keyword, course, year, type, and verification status. | Should |

## 8. Non-Functional Requirements
| Req ID | Category | Description | Acceptance Metric / Target |
| :--- | :--- | :--- | :--- |
| NFR-01 | Performance | API response time for search and list endpoints. | < 500ms on standard 3G/4G connections. |
| NFR-02 | Performance | All list endpoints must support pagination. | Default 20 items per page. |
| NFR-03 | Security | All traffic must be served over HTTPS. | Enforced via Cloudflare SSL. |
| NFR-04 | Security | Passwords must be hashed. | Using bcrypt or argon2. |
| NFR-05 | Security | File uploads must be validated. | Check MIME type and extension to prevent malware. |
| NFR-06 | Reliability | Database must be backed up. | Daily automated backups with a tested restore procedure. |
| NFR-07 | Usability | Frontend must be mobile-friendly and installable. | Must function as a Progressive Web App (PWA). |

## 9. Acceptance Criteria (Definition of Done)
- ☐ **AC-01:** User can register/login; unauthorized users are blocked from protected API routes.
-  **AC-02:** Permitted user can upload a file with metadata and see its review status.
- ☐ **AC-03:** Lecturer can approve/reject a document; action is logged with timestamp.
- ☐ **AC-04:** Approved document has a unique QR stamp; public page shows correct status.
- ☐ **AC-05:** Student can search/filter, read, and download an approved file on a mobile device.
- ☐ **AC-06:** Student can take a quiz, receive an auto-calculated score, and view history.
-  **AC-07:** Platform is installable as a PWA and hosted over HTTPS on the registered domain.

## 10. Glossary of Terms
| Term | Meaning |
| :--- | :--- |
| API | Application Programming Interface: The set of rules and endpoints that allows the Frontend (React) and Backend (FastAPI) to communicate. |
| ERD | Entity Relationship Diagram: A visual diagram showing the database tables (Users, Courses, Documents) and how they link together. |
| JWT | JSON Web Token: A secure digital "badge" given to a user when they log in, proving their identity and role to the server. |
| MVP | Minimum Viable Product: The simplest version of the app that includes only the core required features (Library, Quizzes, Stamps). |
| PWA | Progressive Web App: A website built to look and feel like a mobile app, which can be installed on a phone's home screen. |
| Pull Request (PR) | A request made by a developer to merge their code into the main project. It requires approval before merging. |
| RBAC | Role-Based Access Control: A security method that restricts system access based on a user's role (e.g., Students can upload, but only Lecturers can approve). |
| Repository (Repo) | The central folder on GitHub where all the project's code and documents are stored. |
| VPS | Virtual Private Server: A rented cloud computer used to host the website and database so it is accessible to the public over the internet. |

## 11. Approvals and Signatures
**Project Lead / Product Owner**  
Name: Oliver D. Toee  
Signature: ___________________________ Date: ______________

**Database Team Lead**  
Name: Oliver D. Toee  
Signature: ___________________________ Date: ______________

**Backend Team Lead**  
Name: J. Philip Sleh  
Signature: ___________________________ Date: ______________

**Frontend Team Lead**  
Name: Prince M Gbolon  
Signature: ___________________________ Date: ______________

**Lecturer / Supervisor**  
Name: Kwitee D Gaylah  
Signature: ___________________________ Date: ______________