# Backend API Contracts

## Canonical contract

[API_SPEC.yaml](./API_SPEC.yaml) is the authoritative machine-readable OpenAPI contract. Update it when a route, permission, parameter, status code, or response shape changes. Review contract changes with frontend, backend, and database representatives before implementation so the teams can work against the same interface.

The requirements source is the [PRD](../LetLearnTogether_PRD_v3.md) and [SRS](../LetLearnTogether_SRS_v3.md). If those documents conflict, record the decision with the team and update the agreed source documents and contract together.

## Conventions

- Base path: `/api/v1`.
- JSON is used for API requests and responses, except multipart uploads, document file content, and QR-code image responses.
- Use plural resource names and stable integer resource identifiers.
- List responses contain `page`, `page_size`, `total_items`, `total_pages`, and `items`. Pages are 1-based; the default page size is 20 and the maximum is 100.
- Errors use `{ "error_code": "...", "message": "...", "request_id": "..." }`.
- Protected operations use `Authorization: Bearer <JWT>`. Public operations explicitly disable bearer authentication in the OpenAPI contract.
- Passwords are bcrypt-hashed. Because bcrypt accepts at most 72 UTF-8 bytes, inputs beyond that limit are rejected.
- Uploads are restricted to PDF, JPEG, PNG, and WebP, with both extension and content validation. The current default maximum size is 10 MiB.
- Quiz read responses never expose correct-answer indexes. The server calculates submitted scores from stored answer keys.

## Endpoint groups

| Group | Contract routes | Access summary |
| --- | --- | --- |
| Authentication | `/auth/register`, `/auth/login`, `/auth/me` | Registration/login public; profile authenticated. |
| Users | `/users`, `/users/{user_id}` | Admin only. |
| Courses | `/courses`, `/courses/{course_id}` | Reads public; create/update/delete Admin only. |
| Documents | `/documents`, `/documents/mine`, `/documents/{document_id}`, `/documents/{document_id}/content`, review, revoke | Verified library reads public; upload authenticated; review by assigned Lecturer, Moderator, or Admin; revocation/removal by Moderator or Admin. |
| Verification | `/verification/{token}`, `/verification/{token}/qr` | Public. |
| Reports | document report submission, `/reports`, `/reports/{report_id}` | Submission authenticated; report management Moderator or Admin. |
| Quizzes | `/quizzes`, `/quizzes/{quiz_id}` | Published quiz reads public; authoring by assigned Lecturer or Admin. |
| Quiz attempts | `/quizzes/{quiz_id}/attempts`, `/quiz-attempts/mine` | Student only; attempts scored server-side. |

The full schemas, responses, and parameters are in [API_SPEC.yaml](./API_SPEC.yaml).

## Authorization rules

1. Public registration must not accept a caller-selected elevated role.
2. Lecturer access to course-scoped actions must check the lecturer assignment on the requested course.
3. Moderator and Admin permissions are distinct from Lecturer permissions; follow the endpoint descriptions in the contract.
4. A caller may access only their own document submission list and quiz attempt history unless an explicitly authorized admin/report route permits broader access.
5. Unverified or rejected documents must not be disclosed through public metadata or file-content routes.

## Contract change workflow

1. Identify the PRD/SRS requirement and affected consumers.
2. Update the OpenAPI request, response, permissions, and error definitions.
3. Discuss breaking changes with frontend and backend owners; coordinate data changes with the database team.
4. Implement the API and tests against the updated contract.
5. Verify the contract parses and compare declared route/method pairs with implemented FastAPI routes.
6. Document any agreed deviation and its owner before merge.

## Versioning

Non-breaking additions can remain in `/api/v1` when existing clients continue to work. A breaking request/response or behavior change requires team review, a compatibility/migration plan, and a new API version decision before implementation.
