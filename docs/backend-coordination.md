# Backend Team Coordination

## Team ownership

| Team member | Responsibility | Primary work |
| --- | --- | --- |
| **J. Philip Sleh** | Backend Team Lead | Architecture, API contracts, integration, code review, coordination, and delivery. |
| **Edwin M Snogba** | Identity & Access | Registration, login, authentication, authorization, and user roles. |
| **Richard Trueh** | Core Services (Docs) | Document upload, approval, browsing, downloads, and document management. |
| **Ernest B Nyema** | Quizzes & Stamps | Multiple-choice quizzes, automatic marking, and document verification stamps. |

## Working agreements

1. Treat [API_SPEC.yaml](./API_SPEC.yaml) as the shared implementation contract.
2. Keep feature work in focused branches and submit pull requests for review; do not merge directly to the shared default branch.
3. Before implementation, agree on route shape, request/response schemas, role permissions, status transitions, and error behavior.
4. Feature owners write or update tests for their changes and state how the feature was validated in the pull request.
5. The Backend Team Lead checks integration, contract parity, cross-feature behavior, and delivery notes.
6. Changes affecting tables, indexes, constraints, or migrations must be coordinated with the database team before merge.
7. Changes affecting API consumers must be shared with the frontend team before implementation or merge.
8. Never commit credentials, local `.env` files, databases, or uploaded documents.

## Feature ownership and integration boundaries

- **Identity & Access:** Edwin owns identity and access behavior. Coordinate the shared `User` model, token claims, role names, and authorization dependency with the other feature owners.
- **Core Services (Docs):** Richard owns document lifecycle behavior. Coordinate upload metadata, course assignment checks, status transitions, safe storage, and the stamp/verification integration with Ernest.
- **Quizzes & Stamps:** Ernest owns quiz behavior and stamp/QR workflows. Coordinate verification-token shape and public response with Richard and the frontend verification page.
- **Backend Team Lead:** J. Philip owns the API contract and cross-feature decisions, resolves integration conflicts with the team, reviews changes, and tracks delivery evidence.

Ownership assigns implementation responsibility; it does not replace cross-review for permission, schema, or API changes.

## Pull-request handoff template

Include the following in every backend pull request:

```text
Requirement or issue:
Feature owner:
API contract changed? (link paths):
Database/model changes and migration:
Authorization/status-transition impact:
Tests run and results:
Frontend/database coordination:
Known limitations or follow-up work:
```

## Weekly coordination

At the start of a sprint, confirm the contract and feature dependencies. During the sprint, raise route/schema conflicts early and keep pull requests small enough to review. Before the sprint demo, jointly verify the end-to-end user journey and record what was not tested. At handoff, update the API, setup, and delivery documents so other team members can reproduce the result.
