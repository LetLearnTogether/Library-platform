# Backend Delivery and Release Checklist

## Current implementation snapshot

The backend implementation is organized as FastAPI feature routers and is intended to match [API_SPEC.yaml](./API_SPEC.yaml). The integration test suite has been exercised against SQLite. This is a development validation result, not proof of MySQL or production readiness.

## Development delivery checks

- [ ] Confirm the API contract and permission decisions are agreed by backend and frontend teams.
- [ ] Confirm model changes have a reviewed database migration and the MySQL schema reference is current.
- [ ] Install the documented runtime and development requirements.
- [ ] Run `python -m pytest tests -q` from `backend/`.
- [ ] Run Python compile checks and validate `docs/API_SPEC.yaml`.
- [ ] Compare generated FastAPI routes and methods with the OpenAPI contract.
- [ ] Exercise registration/login, protected routes, document upload/review/download, verification/revocation, reporting, and quiz scoring.
- [ ] Review all changed files and confirm no `.env`, secrets, local databases, or uploaded files are staged.
- [ ] Ensure feature owners and the Backend Team Lead have reviewed the pull request.
- [ ] Confirm setup and user-facing API instructions are up to date.

## MySQL and deployment gates

These are required before production release; SQLite integration tests do not replace them:

- [ ] Apply reviewed migrations to a clean test MySQL instance and to a copy of the current schema.
- [ ] Run backend tests and key workflows against MySQL.
- [ ] Configure production `SECRET_KEY`, database connection, CORS origins, public URL, and persistent upload storage.
- [ ] Verify HTTPS and reverse-proxy limits/timeouts, including the configured upload-size limit.
- [ ] Verify uploaded documents and database backups, and perform a restore test.
- [ ] Check database constraints, indexes, query performance, and expected concurrent use.
- [ ] Review logs, request-ID tracing, health checks, and error responses for production operations.
- [ ] Complete security review and user acceptance testing with the team.

## Release and handoff

1. Merge the reviewed feature pull request according to the repository workflow.
2. Apply the database migration before deploying API code that requires it.
3. Deploy the API and verify `/`, `/docs`, authentication, and a safe read-only workflow.
4. Verify the frontend against the deployed base URL and configured CORS origins.
5. Record release version, migration identifier, test evidence, deployment owner, rollback plan, and known issues.
6. Keep the prior compatible API available until consumers have transitioned when a breaking change is approved.

## Rollback considerations

Coordinate API rollback with migration rollback and stored-file behavior. Do not remove columns or files that the deployed version may still need. If a data migration is not safely reversible, document a forward-repair plan and take a verified backup before release.
