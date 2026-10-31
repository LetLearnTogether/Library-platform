import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import hash_password
from app.main import app
from app.models import Course, PlatformSettings, User


@pytest.fixture
def api(tmp_path, monkeypatch):
    import app.main as main_module
    import app.routers.documents as documents_module

    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=test_engine)
    test_session = sessionmaker(bind=test_engine, autoflush=False, expire_on_commit=False)

    def override_get_db():
        db = test_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr(main_module, "engine", test_engine)
    upload_dir = tmp_path / "uploads"
    monkeypatch.setattr(main_module, "UPLOAD_DIR", upload_dir)
    monkeypatch.setattr(documents_module, "UPLOAD_DIR", upload_dir)

    with test_session() as db:
        admin = User(name="Admin", email="admin@example.com", password_hash=hash_password("password-123"), role="Admin")
        lecturer = User(name="Lecturer", email="lecturer@example.com", password_hash=hash_password("password-123"), role="Lecturer")
        student = User(name="Student", email="student@example.com", password_hash=hash_password("password-123"), role="Student")
        moderator = User(name="Moderator", email="moderator@example.com", password_hash=hash_password("password-123"), role="Moderator")
        other_lecturer = User(name="Other Lecturer", email="other-lecturer@example.com", password_hash=hash_password("password-123"), role="Lecturer")
        db.add_all([admin, lecturer, student, moderator, other_lecturer])
        db.commit()
        db.add(PlatformSettings(id=1))
        db.commit()
        db.refresh(lecturer)
        db.add(Course(course_code="CS101", course_title="Computer Science", year=2026, semester="First", lecturer_id=lecturer.id))
        db.commit()

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()
    test_engine.dispose()


def login(api, email):
    response = api.post("/api/v1/auth/login", json={"email": email, "password": "password-123"})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}
