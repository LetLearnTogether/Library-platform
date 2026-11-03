# LetLearnTogether frontend design specification

This document records the interfaces that are implemented in the frontend. It is
an implementation reference, not a proposal for a new visual design. When this
document and the running interface differ, update the document from the code (or
change the code and this document together).

## 1. Design source of truth

- Application entry and route definitions: `frontend/src/App.jsx`
- Public navigation: `frontend/src/components/layout/Navbar.jsx`
- Signed-in navigation and responsive workspace shell:
  `frontend/src/components/layout/AuthenticatedLayout.jsx`
- Shared colors and base typography: `frontend/src/index.css`
- Main public-page and library styles: `frontend/src/App.css`
- Interface-specific styles: the page/component CSS files imported by each page.

The application uses React Router. The same route can render inside the public
shell or the signed-in workspace shell depending on authentication. The route
tables below distinguish the underlying interface from the shell around it.

## 2. Shared visual language

| Element | Implemented design |
|---|---|
| Typeface | Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif |
| Primary blue | `#2459a4` |
| Dark brand blue | `#173b6c` |
| Body text | `#17243a` |
| Muted text | `#748197` |
| Page background | `#f7f9fc`; signed-in workspace background `#f4f7fb` |
| Surfaces and borders | White surfaces; pale blue/gray borders such as `#e7ecf3` |
| Controls | Rounded buttons and fields, visible keyboard-focus outlines, blue primary actions |
| Motion | Short page, section, and card entrance/hover transitions; animations are disabled or reduced when reduced motion is requested |

### Public shell

Unauthenticated pages use a white navigation bar with the LetLearnTogether
mark/name, Home, Document Library, About, install-app control, Login, and
Register. At widths of 700px and below, the navigation collapses behind a
menu button. Public pages also show the platform notice when one is configured.
The home and About pages finish with the site footer.

### Signed-in shell

Authenticated routes render inside a workspace layout with a sticky header,
brand, install-app control, user name/role, sign-out action, and a left-side
workspace navigation. Navigation links depend on the signed-in role. Students
also have a bottom mobile navigation for Library, Quizzes, Upload, and Me.
The workspace provides a light/dark theme toggle; its choice is stored in
`localStorage`. The sidebar becomes a responsive, dismissible menu on smaller
screens.

The platform notice remains above either shell when enabled. Loading the
session/settings and settings-load errors are application states, not separate
navigation destinations.

## 3. Home and public interfaces

| Order | Route | Interface and exact contents |
|---|---|---|
| 1 | `/` (signed out) | **Home.** Public navigation and optional platform notice; hero with “YOUR LEARNING LIBRARY,” “Learn more. Achieve more.”, a short resource description, and an “Explore documents” link to `/library`; the supplied study-group photograph with a “Verified resources” badge; public footer. The Document Library interface is not displayed on the home page. |
| 2 | `/library` (signed out or signed in) | **Document Library.** Dedicated searchable/filterable library page with course folders, announcements when a course is selected, reset filters, verified-resource notice, document cards, and pagination. Signed-in visitors see the authenticated shell. |
| 3 | `/courses/:courseCode` and deeper `/courses/:courseCode/:year`, `/courses/:courseCode/:year/:semester`, `/courses/:courseCode/:year/:semester/:documentType`, and `/courses/:courseCode/:year/:semester/:documentType/:lecturer` | **Course-folder library.** The same library interface, initialized from the route’s course/year/semester/type/lecturer folders. A selected course can show its public announcements. A document-type folder without a lecturer prompts the visitor to select the lecturer folder. |
| 4 | `/about` | **About LetLearnTogether.** About hero and calls to explore the library or join; who-we-are section; mission and vision cards; six offering cards; values and audience panels; why section and closing quote; public footer. Signed-in visitors receive this content inside their workspace shell. |
| 5 | `/verify` | **Verify a document.** Verification ID entry form and submit action; result area is initially empty. |
| 6 | `/verify/:token` | **Document verification result.** The same verification form, prefilled from the token route, plus the lookup status and either verification error or result with status, document/course/type/approval details and QR code; link back to the library. |
| 7 | `/quizzes` | **Published quiz catalogue.** Search, course/year/semester filters, clear filters, result count, quiz cards and pagination; empty and load-error states. This route is accessible without signing in. |
| 8 | `/login` | **Sign in.** Logo, “Welcome back,” email and password fields, show/hide password, sign-in action, inline validation/API feedback, and create-account link. After successful sign-in, the user is taken to their role dashboard or allowed requested destination. |
| 9 | `/register` | **Create account.** Full name, email, password, confirm password, show-password checkbox, inline validation, create-account action, and sign-in link. If registration is disabled in platform settings, the form is replaced by “Registration is paused” and a sign-in link. |

### Home hero image

- Asset: `frontend/public/study-group-hero.png` (the image supplied with the request).
- Displayed in the right column of the existing blue-gradient home hero.
- Cropped with `object-fit: cover`, rounded corners, and a subtle border/shadow;
  the image keeps its source aspect ratio. On narrow screens the existing hero
  stacks into one column.
- Accessible image description: “Students studying together outdoors.”
- The existing “Verified resources” badge overlays the photo. The existing
  headline, text, navigation, and overall color system remain unchanged.
- “Explore documents” navigates to the dedicated `/library` page. The home page
  does not render the Document Library section or send document-list requests.
- The public navigation still includes its separate “Document Library” link
  to `/library`.

## 4. Student interfaces

Students use the signed-in workspace shell unless a row identifies a shared
public interface.

| Order | Route | Interface and exact contents |
|---|---|---|
| 1 | `/student-dashboard` and signed-in `/` | **Student learning overview.** Personalized welcome and Explore Documents action; recent submission, quiz-attempt, and account-role summaries; Quick Access cards for My Courses, Browse Documents, Practice Quizzes, and Upload Materials; recent submissions and recent quiz attempts with links to their full histories. |
| 2 | `/student/courses` | **My courses.** Course catalogue with course, year, semester, lecturer, enrollment/progress information, and Enroll/Leave course action; enrolled courses also link to their library and quizzes. |
| 3 | `/library`, `/courses/...` | **Document Library.** Search, folder navigation, filters, verified document cards, view/download actions, verification link when available, and signed-in report-document action. |
| 4 | `/quizzes` | **Published quiz catalogue.** Shared catalogue described above. |
| 5 | `/quizzes/:quizId` | **Quiz attempt.** Course/title header, question position and progress bar, one question with selectable answer options, answered count, Previous/Next, and Submit Quiz when every question is answered. Submission requires confirmation. |
| 6 | `/quizzes/:quizId` after submission | **Quiz result.** “Your Results,” quiz and course, server-calculated score, Try Again, and Back to Dashboard. |
| 7 | `/quiz-history` | **Quiz history.** Paginated attempts with quiz title, date, question count, and score; empty/loading/error states and a link back to quizzes. |
| 8 | `/document-history` | **Document submissions.** Upload action; submissions list with status filter, file/course/type/date, review note, verified-document and verification links where applicable, pagination, and empty/loading/error states. |
| 9 | `/upload` | **My uploads.** Course and document-type selectors, accepted file selection (PDF/JPEG/PNG/WebP; 10 MiB limit), file summary/removal, upload action, validation/submission feedback, and embedded upload-history panel. If student uploads are disabled, the upload form is replaced with the paused notice while history remains available. |
| 10 | `/verify` and `/verify/:token` | **Document verification.** Shared verification form and result states described above. |

## 5. Lecturer interfaces

Lecturers use the signed-in workspace shell. The teaching overview scopes its
course and performance information to courses assigned to the lecturer.

| Order | Route | Interface and exact contents |
|---|---|---|
| 1 | `/lecturer` and signed-in `/` | **Teaching overview.** Review, quiz, assigned-course, student-attempt, and average-score summaries; assigned-course cards and actions for roster/progress, quiz reports, course-material upload, quiz management, and course announcements; learning-insights list for challenging questions. |
| 2 | `/staff` | **Review workspace.** Pending document cards with file preview, optional student-visible review note, Approve and Reject actions, and review-queue pagination. |
| 3 | `/quiz-management` and `/quiz-management?course_id=:id` | **Quiz management.** Paginated quiz list and create/edit form states; course/title/type/publication controls, question and answer-option editor, correct-answer selection, and save/delete actions. Lecturer course choices are limited to assigned courses. |
| 4 | `/quiz-results/:quizId` | **Quiz performance report.** Attempt count, average score, question-level correct-response/answer-choice breakdown, student attempts, and pagination. |
| 5 | `/lecturer/courses/:courseId/students` | **Course student progress.** Enrollment, published-quiz, and page summaries; expandable student roster with enrollment date, quiz attempts, scores, and last activity; pagination. |
| 6 | `/lecturer/announcements?course_id=:id` | **Course announcements.** Course selector, publish/edit title and message form, announcements list with author/time, and edit/delete actions. |
| 7 | `/upload?course_id=:id` | **Course materials.** Shared upload interface initialized for the selected course; lecturers can publish to assigned courses and remove their verified materials from the library through submission history. |
| 8 | `/library`, `/courses/...`, `/quizzes`, `/verify` | **Shared library, quiz catalogue, and verification interfaces.** These use the same content and controls described in the public/student sections, inside the signed-in shell. |

## 6. Moderator and review interfaces

| Order | Route | Interface and exact contents |
|---|---|---|
| 1 | `/staff` and signed-in `/` for Moderator | **Moderation center.** Review queue plus moderation overview counts and report status shortcuts; report-management section with status filter, document/report details, moderator note, status actions, verified-file access, and pagination. |
| 2 | `/library`, `/courses/...` | **Document Library.** Shared searchable/filterable library inside the workspace shell. |
| 3 | `/verify` and `/verify/:token` | **Document verification.** Shared public verification interface inside the workspace shell. |

Lecturers also use `/staff`, but see the review queue without moderator-only
report-management controls. Administrators can use the same review/report
interface.

## 7. Administrator interfaces

| Order | Route | Interface and exact contents |
|---|---|---|
| 1 | `/admin` and signed-in `/` | **Platform overview.** Account, course, awaiting-review, and open-report totals; administrator responsibility cards; platform management links; role-scope cards. |
| 2 | `/admin/accounts` | **Account management.** Create account tab with name, email, initial password, and role; View accounts tab with role editing, save, delete (except current account), and refresh. |
| 3 | `/admin/courses` | **Course management.** Create course tab with code/title/year/semester/lecturer; View courses tab with lecturer assignment, delete, and refresh. |
| 4 | `/admin/settings` | **System settings.** Announcement enable/message, support contact, public registration toggle, student uploads toggle, and Save settings with success/error feedback. |
| 5 | `/admin/activity` | **Activity log.** Paginated account, course, document-review, and settings activity with actor, role, time, and load/error/empty states. |
| 6 | `/staff` | **Review and reports.** Review queue, and the report-management interface available to administrators for report filtering, notes, status updates, file access, and moderation actions. |
| 7 | `/quiz-management` and `/quiz-results/:quizId` | **Quiz management and performance report.** Shared administrator quiz creation/editing and performance-report interfaces. |
| 8 | `/library`, `/courses/...`, `/upload`, `/lecturer/announcements` | **Shared library, upload, and course-announcement interfaces.** Administrators can use the shared upload interface and manage announcements for available courses. |

## 8. Route behavior and access

- When signed out, `/` displays the public home. When signed in, `/` redirects
  to the user's role landing page: Student `/student-dashboard`, Lecturer
  `/lecturer`, Moderator `/staff`, Admin `/admin`.
- Signed-in visitors who open `/login` or `/register` are redirected to the
  role landing page.
- `RequireAuth` protects student, lecturer, moderator, and administrator
  destinations. A user without the required role is redirected according to
  the existing route guard.
- `/quizzes` is the published catalogue; `/quizzes/:quizId` is the protected
  student attempt flow.
- `/courses/...` folder depth changes the selected library folder; it does not
  introduce a separate visual page.
- Public and signed-in views of `/about`, the library, and verification share
  the same page content but retain their respective shells.
- The frontend does not define separate password-reset, user-profile, or
  standalone quiz-completion routes.

## 9. Shared interface states and behaviors

Data-backed pages expose their implemented loading, empty, and error states.
Where the page provides retry, the retry action remains visible with the error.
Mutations provide inline success/error feedback. Lists use their existing
pagination controls. The following overlays/dialogs are part of the interface:

- Document report dialog from a library document card.
- Quiz submission confirmation before final submission.
- Native confirmation dialogs for destructive enrollment, document, course,
  account, quiz, and announcement actions.

Forms retain their existing field labels, validation, disabled/loading button
labels, and settings-dependent states. These states should be included when
producing screenshots or presenting the interfaces; they are part of the
implemented frontend, not additional pages.

## 10. Change-control checklist

Before changing a screen, check its route in `frontend/src/App.jsx`, its
navigation entry, the shared shell, and the page component/CSS. After a visual
change, update the matching route and visual details here in the same change.
Do not add interface elements to this document unless they are present in the
running application.
