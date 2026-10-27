# Backend Code Review

## Purpose

This guide supports backend pull-request reviews led by the Backend Team Lead. It is a review checklist, not evidence that a specific change has already been reviewed or approved.

## Review responsibilities

- Feature owners review correctness and tests in their area.
- The Backend Team Lead reviews architecture, API contract alignment, cross-module integration, permissions, error behavior, and delivery readiness.
- The database team reviews schema and migration changes.
- Frontend/backend representatives review changes affecting request or response contracts.

## Review checklist

### API and requirements

- [ ] The change traces to a PRD/SRS requirement or a documented team decision.
- [ ] `docs/API_SPEC.yaml` matches route paths, methods, parameters, permissions, status codes, and response schemas.
- [ ] Existing clients remain compatible, or a breaking-change plan and version decision are recorded.
- [ ] List endpoints preserve the pagination envelope and documented limits.
- [ ] Errors use the documented error envelope and include a request ID.

### Authentication and authorization

- [ ] Protected routes require a valid authenticated user.
- [ ] Role checks are enforced server-side and default to deny.
- [ ] Lecturer course assignment is checked for course-scoped actions.
- [ ] Students cannot read or modify another user's private records.
- [ ] Passwords, tokens, and secrets are not logged or returned.
- [ ] Elevated roles cannot be selected through public registration.

### Data and persistence

- [ ] Request data is validated; ORM/query parameters are used rather than SQL string concatenation.
- [ ] Database writes have clear transaction/rollback behavior.
- [ ] Foreign keys, uniqueness, indexes, and deletion behavior are considered.
- [ ] Model changes are paired with a reviewed migration and an updated schema reference.
- [ ] Shared MySQL compatibility is not inferred solely from SQLite test results.

### Documents and uploads

- [ ] Upload extension and content/MIME checks are enforced, with a size limit.
- [ ] User-supplied filenames cannot control storage paths.
- [ ] Unverified/rejected content is not returned from public reads or downloads.
- [ ] Download responses use the stored content type and safe response headers.
- [ ] Approval generates a unique stamp; revocation remains publicly verifiable as Revoked.
- [ ] Storage failures and database failures do not leave inconsistent orphan files/rows.

### Quizzes and reporting

- [ ] Correct-answer indexes are never returned by quiz read endpoints.
- [ ] Scores are calculated on the server and invalid/missing/duplicate answers are rejected.
- [ ] Attempt history is limited to the owning student unless an authorized policy says otherwise.
- [ ] Report/document status transitions are validated and permission-checked.

### Tests, operations, and maintainability

- [ ] Tests cover success, invalid input, unauthorized access, forbidden access, and relevant state transitions.
- [ ] Tests do not depend on production data or secrets.
- [ ] Configuration comes from environment variables; no real secret is committed.
- [ ] Logs are useful without exposing passwords, tokens, or uploaded file contents.
- [ ] New dependencies are justified, pinned/compatible with the supported runtime, and reflected in manifests.
- [ ] Setup and deployment documentation is updated when the workflow changes.

## Review outcome

Use one of these outcomes on the pull request:

- **Approve:** requirements, contract, implementation, tests, and deployment implications are acceptable.
- **Request changes:** list concrete issues, affected paths, expected behavior, and a way to verify each fix.
- **Comment:** non-blocking suggestions that do not prevent merge.

Do not approve based only on a passing unit test. For cross-cutting changes, verify the generated OpenAPI document, route/contract parity, and relevant end-to-end flows.
