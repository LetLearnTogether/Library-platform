from io import BytesIO

from conftest import login


def test_registration_login_and_error_envelope(api):
    response = api.post(
        "/api/v1/auth/register",
        json={"name": "New Student", "email": "new@example.com", "password": "long-password"},
    )
    assert response.status_code == 201
    assert response.json()["role"] == "Student"
    assert "password_hash" not in response.json()

    token_response = api.post(
        "/api/v1/auth/login",
        json={"email": "new@example.com", "password": "long-password"},
    )
    assert token_response.status_code == 200
    headers = {"Authorization": f"Bearer {token_response.json()['access_token']}"}
    assert api.get("/api/v1/auth/me", headers=headers).json()["email"] == "new@example.com"

    unauthenticated = api.get("/api/v1/users")
    assert unauthenticated.status_code == 401
    error = unauthenticated.json()
    assert error["error_code"] == "AUTH_REQUIRED"
    assert error["request_id"].startswith("req_")
    assert unauthenticated.headers["x-request-id"] == error["request_id"]


def test_documents_moderator_approval_verification_and_file(api):
    student_headers = login(api, "student@example.com")
    moderator_headers = login(api, "moderator@example.com")

    upload = api.post(
        "/api/v1/documents",
        headers=student_headers,
        data={"course_id": "1", "document_type": "Midterm"},
        files={"file": ("paper.pdf", BytesIO(b"%PDF-1.7\nsample"), "application/pdf")},
    )
    assert upload.status_code == 201, upload.text
    document = upload.json()
    assert document["status"] == "Under Review"

    reviewed = api.put(
        f"/api/v1/documents/{document['id']}/review",
        headers=moderator_headers,
        json={"action": "approve", "review_note": "Checked"},
    )
    assert reviewed.status_code == 200, reviewed.text
    verified = reviewed.json()
    assert verified["status"] == "Verified"
    assert verified["reviewed_by"] is not None
    assert verified["verification_token"]

    public = api.get(f"/api/v1/verification/{verified['verification_token']}")
    assert public.status_code == 200
    assert public.json()["status"] == "Verified"

    content = api.get(f"/api/v1/documents/{document['id']}/content")
    assert content.status_code == 200
    assert content.content.startswith(b"%PDF-")
    assert "inline" in content.headers["content-disposition"]

    qr = api.get(f"/api/v1/verification/{verified['verification_token']}/qr")
    assert qr.status_code == 200
    assert qr.headers["content-type"] == "image/png"
    assert qr.content.startswith(b"\x89PNG")

    revoked = api.put(f"/api/v1/documents/{document['id']}/revoke", headers=moderator_headers)
    assert revoked.status_code == 200
    assert revoked.json()["status"] == "Revoked"
    assert api.get(f"/api/v1/verification/{verified['verification_token']}").json()["status"] == "Revoked"
    assert api.get(f"/api/v1/documents/{document['id']}/content").status_code == 404


def test_upload_validation_and_course_scoped_review(api):
    student_headers = login(api, "student@example.com")
    lecturer_headers = login(api, "lecturer@example.com")
    other_lecturer_headers = login(api, "other-lecturer@example.com")

    bad_upload = api.post(
        "/api/v1/documents",
        headers=student_headers,
        data={"course_id": "1", "document_type": "Midterm"},
        files={"file": ("paper.pdf", BytesIO(b"not pdf"), "application/pdf")},
    )
    assert bad_upload.status_code == 415
    assert bad_upload.json()["error_code"] == "UNSUPPORTED_MEDIA_TYPE"

    upload = api.post(
        "/api/v1/documents",
        headers=student_headers,
        data={"course_id": "1", "document_type": "Final"},
        files={"file": ("paper.pdf", BytesIO(b"%PDF-1.7\nsample"), "application/pdf")},
    )
    document_id = upload.json()["id"]
    denied = api.put(
        f"/api/v1/documents/{document_id}/review",
        headers=other_lecturer_headers,
        json={"action": "approve"},
    )
    assert denied.status_code == 403
    approved = api.put(
        f"/api/v1/documents/{document_id}/review",
        headers=lecturer_headers,
        json={"action": "approve"},
    )
    assert approved.status_code == 200


def test_review_queue_and_pending_file_are_role_scoped(api):
    student_headers = login(api, "student@example.com")
    lecturer_headers = login(api, "lecturer@example.com")
    other_lecturer_headers = login(api, "other-lecturer@example.com")
    moderator_headers = login(api, "moderator@example.com")
    upload = api.post(
        "/api/v1/documents",
        headers=student_headers,
        data={"course_id": "1", "document_type": "Midterm"},
        files={"file": ("pending.pdf", BytesIO(b"%PDF-1.7\nreview"), "application/pdf")},
    )
    document_id = upload.json()["id"]
    assert api.get("/api/v1/documents/review-queue", headers=student_headers).status_code == 403
    assert api.get("/api/v1/documents/review-queue", headers=other_lecturer_headers).json()["total_items"] == 0
    assert api.get("/api/v1/documents/review-queue", headers=lecturer_headers).json()["total_items"] == 1
    assert api.get("/api/v1/documents/review-queue", headers=moderator_headers).json()["total_items"] == 1
    preview = api.get(f"/api/v1/documents/{document_id}/review-content", headers=lecturer_headers)
    assert preview.status_code == 200
    assert preview.content.startswith(b"%PDF-")
    assert api.get(f"/api/v1/documents/{document_id}/content").status_code == 404


def test_quiz_creation_server_scoring_and_attempt_history(api):
    lecturer_headers = login(api, "lecturer@example.com")
    student_headers = login(api, "student@example.com")
    created = api.post(
        "/api/v1/quizzes",
        headers=lecturer_headers,
        json={
            "course_id": 1,
            "title": "Intro quiz",
            "is_published": True,
            "questions": [
                {"question_text": "2 + 2?", "options": ["3", "4"], "correct_answer_index": 1},
                {"question_text": "Capital of Liberia?", "options": ["Monrovia", "Accra"], "correct_answer_index": 0},
            ],
        },
    )
    assert created.status_code == 201, created.text
    quiz = created.json()
    assert all("correct_answer_index" not in question for question in quiz["questions"])

    attempt = api.post(
        f"/api/v1/quizzes/{quiz['id']}/attempts",
        headers=student_headers,
        json={
            "answers": [
                {"question_id": quiz["questions"][0]["id"], "selected_option_index": 1},
                {"question_id": quiz["questions"][1]["id"], "selected_option_index": 1},
            ]
        },
    )
    assert attempt.status_code == 201, attempt.text
    assert attempt.json()["score"] == 50.0
    history = api.get("/api/v1/quiz-attempts/mine", headers=student_headers)
    assert history.status_code == 200
    assert history.json()["items"][0]["quiz_title"] == "Intro quiz"
    assert history.json()["items"][0]["total_questions"] == 2

    updated = api.put(
        f"/api/v1/quizzes/{quiz['id']}",
        headers=login(api, "lecturer@example.com"),
        json={
            "title": "Intro quiz revision",
            "is_published": True,
            "questions": [
                {"question_text": "Updated question?", "options": ["A", "B"], "correct_answer_index": 0}
            ],
        },
    )
    assert updated.status_code == 200
    refreshed_history = api.get("/api/v1/quiz-attempts/mine", headers=student_headers)
    assert refreshed_history.json()["items"][0]["total_questions"] == 2
    assert api.delete(
        f"/api/v1/quizzes/{quiz['id']}",
        headers=login(api, "lecturer@example.com"),
    ).status_code == 409

    incomplete = api.post(
        f"/api/v1/quizzes/{quiz['id']}/attempts",
        headers=student_headers,
        json={"answers": []},
    )
    assert incomplete.status_code == 422


def test_admin_catalog_and_user_management(api):
    admin_headers = login(api, "admin@example.com")
    course = api.post(
        "/api/v1/courses",
        headers=admin_headers,
        json={
            "course_code": "ENG201",
            "course_title": "Academic Writing",
            "year": 2026,
            "semester": "Second",
            "lecturer_id": 2,
        },
    )
    assert course.status_code == 201, course.text
    course_id = course.json()["id"]
    assert api.get("/api/v1/courses", params={"q": "academic", "page_size": 5}).json()["total_items"] == 1
    assert api.patch(
        f"/api/v1/courses/{course_id}",
        headers=admin_headers,
        json={"course_title": "Academic Writing II"},
    ).json()["course_title"] == "Academic Writing II"

    user = api.post(
        "/api/v1/users",
        headers=admin_headers,
        json={
            "name": "New Lecturer",
            "email": "new-lecturer@example.com",
            "password": "valid-password",
            "role": "Lecturer",
        },
    )
    assert user.status_code == 201, user.text
    assert api.get("/api/v1/users", headers=admin_headers, params={"role": "Lecturer"}).json()["total_items"] == 3
    assert api.patch(
        f"/api/v1/users/{user.json()['id']}",
        headers=admin_headers,
        json={"name": "Updated Lecturer"},
    ).status_code == 200
    assert api.delete(f"/api/v1/users/{user.json()['id']}", headers=admin_headers).status_code == 204
    assert api.delete(f"/api/v1/courses/{course_id}", headers=admin_headers).status_code == 204


def test_document_reports_and_quiz_management(api):
    student_headers = login(api, "student@example.com")
    moderator_headers = login(api, "moderator@example.com")
    lecturer_headers = login(api, "lecturer@example.com")
    upload = api.post(
        "/api/v1/documents",
        headers=student_headers,
        data={"course_id": "1", "document_type": "Assignment"},
        files={"file": ("assignment.pdf", BytesIO(b"%PDF-1.7\nsample"), "application/pdf")},
    )
    document_id = upload.json()["id"]
    report = api.post(
        f"/api/v1/documents/{document_id}/reports",
        headers=student_headers,
        json={"reason": "The material may be inaccurate."},
    )
    assert report.status_code == 201, report.text
    report_id = report.json()["id"]
    assert api.get("/api/v1/reports", headers=moderator_headers, params={"status": "Open"}).json()["total_items"] == 1
    updated_report = api.put(
        f"/api/v1/reports/{report_id}",
        headers=moderator_headers,
        json={"status": "Resolved", "moderator_note": "Reviewed"},
    )
    assert updated_report.status_code == 200
    assert updated_report.json()["status"] == "Resolved"

    quiz_body = {
        "course_id": 1,
        "title": "Draft quiz",
        "is_published": False,
        "questions": [{"question_text": "Question?", "options": ["A", "B"], "correct_answer_index": 0}],
    }
    quiz = api.post("/api/v1/quizzes", headers=lecturer_headers, json=quiz_body)
    assert quiz.status_code == 201, quiz.text
    quiz_id = quiz.json()["id"]
    assert api.get(f"/api/v1/quizzes/{quiz_id}").status_code == 404

    published = api.put(
        f"/api/v1/quizzes/{quiz_id}",
        headers=lecturer_headers,
        json={"title": "Published quiz", "type": None, "is_published": True, "questions": quiz_body["questions"]},
    )
    assert published.status_code == 200, published.text
    assert api.get(f"/api/v1/quizzes/{quiz_id}").status_code == 200
    assert api.delete(f"/api/v1/quizzes/{quiz_id}", headers=lecturer_headers).status_code == 204
