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


def test_platform_settings_are_publicly_readable_and_admin_managed(api):
    admin_headers = login(api, "admin@example.com")
    moderator_headers = login(api, "moderator@example.com")
    public = api.get("/api/v1/settings/public")
    assert public.status_code == 200
    assert public.json() == {
        "announcement_enabled": False,
        "announcement_message": None,
        "support_contact": None,
        "registration_enabled": True,
        "uploads_enabled": True,
    }

    assert api.get("/api/v1/settings").status_code == 401
    assert api.get("/api/v1/settings", headers=moderator_headers).status_code == 403
    updated = api.patch(
        "/api/v1/settings",
        headers=admin_headers,
        json={
            "announcement_enabled": True,
            "announcement_message": "Maintenance tonight",
            "support_contact": "help@example.com",
            "registration_enabled": False,
            "uploads_enabled": False,
        },
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["updated_at"]
    assert api.get("/api/v1/settings/public").json()["announcement_message"] == "Maintenance tonight"
    assert api.patch("/api/v1/settings", headers=moderator_headers, json={"uploads_enabled": True}).status_code == 403
    partial_update = api.patch(
        "/api/v1/settings",
        headers=admin_headers,
        json={"support_contact": "https://help.example.com/contact"},
    )
    assert partial_update.status_code == 200
    assert partial_update.json()["registration_enabled"] is False
    assert partial_update.json()["uploads_enabled"] is False
    assert partial_update.json()["support_contact"] == "https://help.example.com/contact"

    assert api.patch(
        "/api/v1/settings",
        headers=admin_headers,
        json={"announcement_enabled": True, "announcement_message": "   "},
    ).status_code == 422
    assert api.patch(
        "/api/v1/settings",
        headers=admin_headers,
        json={"support_contact": "https://example.com:bad"},
    ).status_code == 422
    assert api.patch("/api/v1/settings", headers=admin_headers, json={}).status_code == 422


def test_platform_settings_enforce_registration_and_student_uploads(api):
    admin_headers = login(api, "admin@example.com")
    assert api.patch(
        "/api/v1/settings",
        headers=admin_headers,
        json={"registration_enabled": False, "uploads_enabled": False},
    ).status_code == 200

    registration = api.post(
        "/api/v1/auth/register",
        json={"name": "New Student", "email": "new@example.com", "password": "long-password"},
    )
    assert registration.status_code == 403
    assert registration.json()["message"] == "Public registration is currently paused."

    upload = api.post(
        "/api/v1/documents",
        headers=login(api, "student@example.com"),
        data={"course_id": "1", "document_type": "Midterm"},
        files={"file": ("paper.pdf", BytesIO(b"%PDF-1.7\nsample"), "application/pdf")},
    )
    assert upload.status_code == 403
    assert upload.json()["message"] == "Student document uploads are currently paused."

    staff_upload = api.post(
        "/api/v1/documents",
        headers=login(api, "lecturer@example.com"),
        data={"course_id": "1", "document_type": "Midterm"},
        files={"file": ("paper.pdf", BytesIO(b"%PDF-1.7\nsample"), "application/pdf")},
    )
    assert staff_upload.status_code == 201
    assert staff_upload.json()["status"] == "Verified"
    assert staff_upload.json()["verification_token"]

    reenabled = api.patch(
        "/api/v1/settings",
        headers=admin_headers,
        json={"registration_enabled": True, "uploads_enabled": True},
    )
    assert reenabled.status_code == 200
    registration = api.post(
        "/api/v1/auth/register",
        json={"name": "Enabled Student", "email": "enabled@example.com", "password": "long-password"},
    )
    assert registration.status_code == 201
    student_upload = api.post(
        "/api/v1/documents",
        headers=login(api, "student@example.com"),
        data={"course_id": "1", "document_type": "Midterm"},
        files={"file": ("paper.pdf", BytesIO(b"%PDF-1.7\nsample"), "application/pdf")},
    )
    assert student_upload.status_code == 201


def test_admin_activity_log_tracks_privileged_changes(api):
    admin_headers = login(api, "admin@example.com")
    lecturer_headers = login(api, "lecturer@example.com")
    moderator_headers = login(api, "moderator@example.com")

    created_user = api.post(
        "/api/v1/users",
        headers=admin_headers,
        json={
            "name": "Activity Test User",
            "email": "activity-user@example.com",
            "password": "long-password",
            "role": "Student",
        },
    )
    assert created_user.status_code == 201
    user_id = created_user.json()["id"]
    role_change = api.patch(
        f"/api/v1/users/{user_id}",
        headers=admin_headers,
        json={"role": "Lecturer"},
    )
    assert role_change.status_code == 200

    course_update = api.patch(
        "/api/v1/courses/1",
        headers=admin_headers,
        json={"course_title": "Updated course title"},
    )
    assert course_update.status_code == 200

    upload = api.post(
        "/api/v1/documents",
        headers=login(api, "student@example.com"),
        data={"course_id": "1", "document_type": "Midterm"},
        files={"file": ("paper.pdf", BytesIO(b"%PDF-1.7\nsample"), "application/pdf")},
    )
    assert upload.status_code == 201
    reviewed = api.put(
        f"/api/v1/documents/{upload.json()['id']}/review",
        headers=moderator_headers,
        json={"action": "approve", "review_note": "Checked"},
    )
    assert reviewed.status_code == 200

    setting_update = api.patch(
        "/api/v1/settings",
        headers=admin_headers,
        json={"registration_enabled": False},
    )
    assert setting_update.status_code == 200

    assert api.get("/api/v1/activity").status_code == 401
    assert api.get("/api/v1/activity", headers=lecturer_headers).status_code == 403
    activity = api.get("/api/v1/activity", headers=admin_headers, params={"page_size": 100})
    assert activity.status_code == 200, activity.text
    assert activity.json()["total_items"] == 5
    entries = activity.json()["items"]
    assert entries[0]["summary"] == "Updated platform settings: registration_enabled."
    assert entries[0]["actor_name"] == "Admin"
    assert entries[1]["summary"] == "Approved document #1 for CS101."
    assert entries[1]["actor_role"] == "Moderator"
    assert entries[2]["summary"] == f"Updated course CS101 (#1) fields: course_title."
    assert entries[3]["summary"] == f"Changed account #{user_id} role from Student to Lecturer."
    assert entries[4]["summary"] == f"Created account #{user_id} with role Student."
    assert all("password" not in entry["summary"].lower() for entry in entries)


def test_course_responses_include_public_lecturer_name(api):
    courses = api.get("/api/v1/courses?page=1&page_size=100")
    assert courses.status_code == 200
    assigned_course = courses.json()["items"][0]
    assert assigned_course["lecturer_name"] == "Lecturer"
    assert "email" not in assigned_course
    assert "password_hash" not in assigned_course

    created = api.post(
        "/api/v1/courses",
        headers=login(api, "admin@example.com"),
        json={
            "course_code": "BIO101",
            "course_title": "Biology",
            "year": 2026,
            "semester": "First",
        },
    )
    assert created.status_code == 201
    assert created.json()["lecturer_id"] is None
    assert created.json()["lecturer_name"] is None


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
    revoked_qr = api.get(f"/api/v1/verification/{verified['verification_token']}/qr")
    assert revoked_qr.status_code == 200
    assert revoked_qr.headers["content-type"] == "image/png"
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


def test_lecturer_uploads_only_to_assigned_courses_and_manages_own_materials(api):
    admin_headers = login(api, "admin@example.com")
    lecturer_headers = login(api, "lecturer@example.com")
    other_lecturer_headers = login(api, "other-lecturer@example.com")
    student_headers = login(api, "student@example.com")

    other_course = api.post(
        "/api/v1/courses",
        headers=admin_headers,
        json={
            "course_code": "BIO202",
            "course_title": "Biology",
            "year": 2026,
            "semester": "First",
            "lecturer_id": 5,
        },
    )
    assert other_course.status_code == 201
    denied_upload = api.post(
        "/api/v1/documents",
        headers=lecturer_headers,
        data={"course_id": str(other_course.json()["id"]), "document_type": "Syllabus"},
        files={"file": ("biology.pdf", BytesIO(b"%PDF-1.7\nsample"), "application/pdf")},
    )
    assert denied_upload.status_code == 403

    material = api.post(
        "/api/v1/documents",
        headers=lecturer_headers,
        data={"course_id": "1", "document_type": "Syllabus"},
        files={"file": ("course-notes.pdf", BytesIO(b"%PDF-1.7\nnotes"), "application/pdf")},
    )
    assert material.status_code == 201, material.text
    assert material.json()["status"] == "Verified"
    assert material.json()["approved_by"] == 2
    assert material.json()["verification_token"]
    public_list = api.get("/api/v1/documents", params={"course_id": 1})
    assert material.json()["id"] in [document["id"] for document in public_list.json()["items"]]
    assert api.get("/api/v1/documents/mine", headers=lecturer_headers).json()["items"][0]["id"] == material.json()["id"]

    student_submission = api.post(
        "/api/v1/documents",
        headers=student_headers,
        data={"course_id": "1", "document_type": "Assignment"},
        files={"file": ("student-work.pdf", BytesIO(b"%PDF-1.7\nwork"), "application/pdf")},
    )
    assert student_submission.status_code == 201
    assert student_submission.json()["status"] == "Under Review"
    assert api.delete(
        f"/api/v1/documents/{student_submission.json()['id']}",
        headers=lecturer_headers,
    ).status_code == 403
    assert api.delete(
        f"/api/v1/documents/{material.json()['id']}",
        headers=other_lecturer_headers,
    ).status_code == 403
    assert api.delete(
        f"/api/v1/documents/{material.json()['id']}",
        headers=lecturer_headers,
    ).status_code == 204
    assert api.get(f"/api/v1/documents/{material.json()['id']}").status_code == 404


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
    assert api.post(
        "/api/v1/courses/1/enrollment",
        headers=student_headers,
    ).status_code == 201

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


def test_student_course_enrollment_gates_quiz_attempts_and_can_be_left(api):
    student_headers = login(api, "student@example.com")
    lecturer_headers = login(api, "lecturer@example.com")
    admin_headers = login(api, "admin@example.com")
    quiz_response = api.post(
        "/api/v1/quizzes",
        headers=lecturer_headers,
        json={
            "course_id": 1,
            "title": "Enrollment quiz",
            "is_published": True,
            "questions": [{"question_text": "Question?", "options": ["A", "B"], "correct_answer_index": 0}],
        },
    )
    assert quiz_response.status_code == 201
    quiz = quiz_response.json()
    answer_payload = {
        "answers": [{"question_id": quiz["questions"][0]["id"], "selected_option_index": 0}]
    }

    assert api.get("/api/v1/enrollments/mine", headers=student_headers).json() == []
    assert api.get("/api/v1/enrollments/mine", headers=lecturer_headers).status_code == 403
    assert api.post("/api/v1/courses/1/enrollment", headers=lecturer_headers).status_code == 403
    assert api.post("/api/v1/courses/999/enrollment", headers=student_headers).status_code == 404
    assert api.post(
        f"/api/v1/quizzes/{quiz['id']}/attempts",
        headers=student_headers,
        json=answer_payload,
    ).status_code == 403

    enrolled = api.post("/api/v1/courses/1/enrollment", headers=student_headers)
    assert enrolled.status_code == 201, enrolled.text
    assert enrolled.json()["course"]["course_code"] == "CS101"
    assert enrolled.json()["quiz_count"] == 1
    assert api.post("/api/v1/courses/1/enrollment", headers=student_headers).status_code == 409
    assert api.post(
        f"/api/v1/quizzes/{quiz['id']}/attempts",
        headers=student_headers,
        json=answer_payload,
    ).status_code == 201

    my_courses = api.get("/api/v1/enrollments/mine", headers=student_headers)
    assert my_courses.status_code == 200
    assert my_courses.json()[0]["quizzes_attempted"] == 1
    assert my_courses.json()[0]["attempt_count"] == 1
    assert my_courses.json()[0]["average_score"] == 100.0

    roster = api.get("/api/v1/courses/1/students", headers=lecturer_headers)
    assert roster.status_code == 200
    assert roster.json()["students"][0]["quizzes"][0]["latest_score"] == 100.0
    assert api.get("/api/v1/courses/1/students", headers=admin_headers).status_code == 200

    assert api.delete("/api/v1/courses/1/enrollment", headers=student_headers).status_code == 204
    assert api.get("/api/v1/enrollments/mine", headers=student_headers).json() == []
    assert api.get("/api/v1/quiz-attempts/mine", headers=student_headers).json()["total_items"] == 1
    assert api.post(
        f"/api/v1/quizzes/{quiz['id']}/attempts",
        headers=student_headers,
        json=answer_payload,
    ).status_code == 403


def test_quiz_results_report_is_course_scoped_and_preserves_answer_snapshots(api):
    lecturer_headers = login(api, "lecturer@example.com")
    other_lecturer_headers = login(api, "other-lecturer@example.com")
    student_headers = login(api, "student@example.com")
    created = api.post(
        "/api/v1/quizzes",
        headers=lecturer_headers,
        json={
            "course_id": 1,
            "title": "English grammar",
            "is_published": True,
            "questions": [
                {"question_text": "Choose the noun", "options": ["quickly", "river"], "correct_answer_index": 1},
                {"question_text": "Choose the verb", "options": ["write", "blue"], "correct_answer_index": 0},
            ],
        },
    )
    assert created.status_code == 201, created.text
    quiz = created.json()
    assert api.post(
        "/api/v1/courses/1/enrollment",
        headers=student_headers,
    ).status_code == 201

    for submitted_answers in (
        [1, 0],
        [0, 1],
    ):
        attempt = api.post(
            f"/api/v1/quizzes/{quiz['id']}/attempts",
            headers=student_headers,
            json={
                "answers": [
                    {"question_id": question["id"], "selected_option_index": selected_index}
                    for question, selected_index in zip(quiz["questions"], submitted_answers, strict=True)
                ]
            },
        )
        assert attempt.status_code == 201, attempt.text

    other_course = api.post(
        "/api/v1/courses",
        headers=login(api, "admin@example.com"),
        json={
            "course_code": "BIO202",
            "course_title": "Biology",
            "year": 2026,
            "semester": "First",
            "lecturer_id": 5,
        },
    )
    assert other_course.status_code == 201
    unrelated_quiz = api.post(
        "/api/v1/quizzes",
        headers=other_lecturer_headers,
        json={
            "course_id": other_course.json()["id"],
            "title": "Biology test",
            "is_published": False,
            "questions": [{"question_text": "Question?", "options": ["A", "B"], "correct_answer_index": 0}],
        },
    )
    assert unrelated_quiz.status_code == 201

    results = api.get(f"/api/v1/quizzes/{quiz['id']}/results", headers=lecturer_headers)
    assert results.status_code == 200, results.text
    report = results.json()
    assert report["quiz_title"] == "English grammar"
    assert report["course"]["course_code"] == "CS101"
    assert report["attempt_count"] == 2
    assert report["average_score"] == 50.0
    assert len(report["attempts"]) == 2
    assert report["attempts"][0]["student_name"] == "Student"
    assert report["questions"][0]["question_text"] == "Choose the noun"
    assert report["questions"][0]["total_responses"] == 2
    assert report["questions"][0]["correct_count"] == 1
    assert report["questions"][0]["correct_percentage"] == 50.0
    assert report["questions"][0]["options"] == [
        {"option_text": "quickly", "selection_count": 1, "percentage": 50.0, "is_correct": False},
        {"option_text": "river", "selection_count": 1, "percentage": 50.0, "is_correct": True},
    ]

    performance = api.get("/api/v1/lecturer/performance", headers=lecturer_headers)
    assert performance.status_code == 200, performance.text
    overview = performance.json()
    assert overview["quiz_count"] == 1
    assert overview["attempt_count"] == 2
    assert overview["average_score"] == 50.0
    assert overview["courses"][0]["course"]["course_code"] == "CS101"
    assert overview["courses"][0]["average_score"] == 50.0
    assert overview["challenging_questions"][0]["question_text"] == "Choose the noun"
    assert overview["challenging_questions"][0]["correct_percentage"] == 50.0
    assert api.get(
        "/api/v1/lecturer/performance",
        headers=other_lecturer_headers,
    ).json()["quiz_count"] == 1
    assert api.get(
        "/api/v1/lecturer/performance",
        headers=login(api, "student@example.com"),
    ).status_code == 403
    assert api.get(
        "/api/v1/lecturer/performance",
        headers=login(api, "admin@example.com"),
    ).status_code == 403
    roster = api.get("/api/v1/courses/1/students", headers=lecturer_headers)
    assert roster.status_code == 200, roster.text
    assert roster.json()["total_items"] == 1
    assert roster.json()["students"][0]["student_name"] == "Student"
    assert roster.json()["students"][0]["attempt_count"] == 2
    assert roster.json()["students"][0]["quizzes_attempted"] == 1
    assert roster.json()["students"][0]["average_score"] == 50.0
    assert roster.json()["students"][0]["quizzes"][0]["best_score"] == 100.0
    assert api.get(
        "/api/v1/courses/1/students",
        headers=other_lecturer_headers,
    ).status_code == 403
    assert api.get(
        "/api/v1/courses/1/students",
        headers=login(api, "student@example.com"),
    ).status_code == 403

    revised = api.put(
        f"/api/v1/quizzes/{quiz['id']}",
        headers=lecturer_headers,
        json={
            "title": "English grammar revised",
            "is_published": True,
            "questions": [
                {"question_text": "New question", "options": ["new", "old"], "correct_answer_index": 0},
            ],
        },
    )
    assert revised.status_code == 200
    historical_results = api.get(f"/api/v1/quizzes/{quiz['id']}/results", headers=lecturer_headers)
    assert historical_results.status_code == 200
    assert historical_results.json()["questions"][0]["question_text"] == "Choose the noun"
    assert historical_results.json()["questions"][0]["total_responses"] == 2

    assert api.get(f"/api/v1/quizzes/{quiz['id']}/results").status_code == 401
    assert api.get(f"/api/v1/quizzes/{quiz['id']}/results", headers=student_headers).status_code == 403
    assert api.get(f"/api/v1/quizzes/{quiz['id']}/results", headers=other_lecturer_headers).status_code == 403
    assert api.get(
        f"/api/v1/quizzes/{quiz['id']}/results",
        headers=lecturer_headers,
        params={"page_size": 0},
    ).status_code == 422


def test_quiz_management_lists_drafts_and_protects_answer_keys(api):
    lecturer_headers = login(api, "lecturer@example.com")
    other_lecturer_headers = login(api, "other-lecturer@example.com")
    student_headers = login(api, "student@example.com")
    created = api.post(
        "/api/v1/quizzes",
        headers=lecturer_headers,
        json={
            "course_id": 1,
            "title": "Private draft",
            "is_published": False,
            "questions": [
                {"question_text": "Choose A", "options": ["A", "B"], "correct_answer_index": 0}
            ],
        },
    )
    assert created.status_code == 201, created.text
    quiz_id = created.json()["id"]

    managed = api.get("/api/v1/quizzes/manage", headers=lecturer_headers)
    assert managed.status_code == 200
    assert managed.json()["total_items"] == 1
    assert managed.json()["items"][0]["is_published"] is False
    assert "correct_answer_index" not in managed.json()["items"][0]["questions"][0]

    editable = api.get(f"/api/v1/quizzes/{quiz_id}/manage", headers=lecturer_headers)
    assert editable.status_code == 200
    assert editable.json()["questions"][0]["correct_answer_index"] == 0
    assert api.get(f"/api/v1/quizzes/{quiz_id}").status_code == 404
    assert api.get("/api/v1/quizzes/manage", headers=student_headers).status_code == 403
    assert api.get("/api/v1/quizzes/manage", headers=other_lecturer_headers).json()["total_items"] == 0
    assert api.get(f"/api/v1/quizzes/{quiz_id}/manage", headers=other_lecturer_headers).status_code == 403


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


def test_course_announcements_are_public_and_course_scoped_for_editors(api):
    lecturer_headers = login(api, "lecturer@example.com")
    other_lecturer_headers = login(api, "other-lecturer@example.com")
    student_headers = login(api, "student@example.com")
    course_id = api.get("/api/v1/courses").json()["items"][0]["id"]
    payload = {"title": "Lecture moved", "body": "Next class begins at 10:00."}

    forbidden_create = api.post(
        f"/api/v1/courses/{course_id}/announcements",
        headers=student_headers,
        json=payload,
    )
    assert forbidden_create.status_code == 403

    created = api.post(
        f"/api/v1/courses/{course_id}/announcements",
        headers=lecturer_headers,
        json={"title": "  Lecture moved  ", "body": "  Next class begins at 10:00.  "},
    )
    assert created.status_code == 201, created.text
    announcement = created.json()
    assert announcement["title"] == "Lecture moved"
    assert announcement["author_name"] == "Lecturer"

    public_list = api.get(f"/api/v1/courses/{course_id}/announcements")
    assert public_list.status_code == 200
    assert [item["id"] for item in public_list.json()] == [announcement["id"]]

    assert api.get(
        f"/api/v1/courses/{course_id}/announcements/manage",
        headers=other_lecturer_headers,
    ).status_code == 403
    assert api.put(
        f"/api/v1/course-announcements/{announcement['id']}",
        headers=other_lecturer_headers,
        json=payload,
    ).status_code == 403
    assert api.delete(
        f"/api/v1/course-announcements/{announcement['id']}",
        headers=other_lecturer_headers,
    ).status_code == 403

    updated = api.put(
        f"/api/v1/course-announcements/{announcement['id']}",
        headers=lecturer_headers,
        json={"title": "Updated schedule", "body": "The lecture starts at 11:00."},
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Updated schedule"
    assert api.delete(
        f"/api/v1/course-announcements/{announcement['id']}",
        headers=lecturer_headers,
    ).status_code == 204
    assert api.get(f"/api/v1/courses/{course_id}/announcements").json() == []
    assert api.post(
        f"/api/v1/courses/{course_id}/announcements",
        headers=lecturer_headers,
        json={"title": "   ", "body": "Blank title is invalid."},
    ).status_code == 422


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
