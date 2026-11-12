from io import BytesIO

from PIL import Image

from conftest import login


def create_test_png():
    image = Image.new("RGB", (20, 20), "white")
    output = BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


def verification_form():
    return {
        "full_name": "Student Example",
        "student_number": "2026/CS/001",
        "university": "Williams V. S. Tubman University",
        "college": "College of Engineering & Technology",
        "department": "Computer Science",
        "academic_year": "2026-2027",
    }


def test_student_verification_submission_admin_review_and_access(api):
    student_headers = login(api, "student@example.com")
    admin_headers = login(api, "admin@example.com")

    assert api.get("/api/v1/student-verifications/mine", headers=student_headers).json() == {
        "submitted": False,
        "submission": None,
    }
    assert api.get("/api/v1/student-verifications/review-queue", headers=student_headers).status_code == 403

    invalid_form = verification_form()
    invalid_form["department"] = "Nursing and Midwifery"
    invalid = api.post(
        "/api/v1/student-verifications",
        headers=student_headers,
        data=invalid_form,
        files={"front_image": ("student-id.png", create_test_png(), "image/png")},
    )
    assert invalid.status_code == 422

    submitted = api.post(
        "/api/v1/student-verifications",
        headers=student_headers,
        data=verification_form(),
        files={"front_image": ("student-id.png", create_test_png(), "image/png")},
    )
    assert submitted.status_code == 201, submitted.text
    submission = submitted.json()
    assert submission["status"] == "Pending"
    assert submission["student_number"] == "2026/CS/001"

    admin_queue = api.get("/api/v1/student-verifications/review-queue?status=Pending", headers=admin_headers)
    assert admin_queue.status_code == 200
    assert admin_queue.json()["total_items"] == 1
    submission_id = submission["id"]

    image_url = f"/api/v1/student-verifications/{submission_id}/front-image"
    assert api.get(image_url, headers=student_headers).status_code == 403
    image_response = api.get(image_url, headers=admin_headers)
    assert image_response.status_code == 200
    assert image_response.headers["content-type"] == "image/png"
    assert image_response.headers["cache-control"] == "private, no-store"

    rejected = api.put(
        f"/api/v1/student-verifications/{submission_id}/review",
        headers=admin_headers,
        json={"action": "reject", "review_note": "Please upload a clearer image."},
    )
    assert rejected.status_code == 200
    assert rejected.json()["status"] == "Rejected"
    assert rejected.json()["review_note"] == "Please upload a clearer image."

    resubmitted = api.post(
        "/api/v1/student-verifications",
        headers=student_headers,
        data=verification_form(),
        files={"front_image": ("student-id.png", create_test_png(), "image/png")},
    )
    assert resubmitted.status_code == 201
    assert resubmitted.json()["id"] == submission_id
    assert resubmitted.json()["status"] == "Pending"

    approved = api.put(
        f"/api/v1/student-verifications/{submission_id}/review",
        headers=admin_headers,
        json={"action": "approve", "review_note": "Student ID confirmed."},
    )
    assert approved.status_code == 200
    assert approved.json()["status"] == "Approved"
    assert approved.json()["reviewer_name"] == "Admin"

    student_status = api.get("/api/v1/student-verifications/mine", headers=student_headers).json()
    assert student_status["submitted"] is True
    assert student_status["submission"]["status"] == "Approved"

    duplicate = api.post(
        "/api/v1/student-verifications",
        headers=student_headers,
        data=verification_form(),
        files={"front_image": ("student-id.png", create_test_png(), "image/png")},
    )
    assert duplicate.status_code == 409
