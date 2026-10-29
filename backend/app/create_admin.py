from getpass import getpass

from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy import func

from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models import User
from app.schemas.api import RegisterRequest


def main():
    Base.metadata.create_all(bind=engine)
    name = input("Admin name: ").strip()
    try:
        email = str(TypeAdapter(EmailStr).validate_python(input("Admin email: ").strip())).lower()
    except ValidationError as exc:
        raise SystemExit("Enter a valid email address.") from exc
    password = getpass("Admin password (minimum 8 characters, maximum 72 UTF-8 bytes): ")
    if password != getpass("Confirm admin password: "):
        raise SystemExit("The passwords did not match.")
    try:
        RegisterRequest(name=name, email=email, password=password)
    except ValidationError as exc:
        raise SystemExit(str(exc)) from exc

    with SessionLocal() as db:
        if db.query(User).filter(func.lower(User.role) == "admin").first():
            raise SystemExit("An Admin account already exists; use the authenticated API to manage accounts.")
        db.add(User(name=name, email=email, password_hash=hash_password(password), role="Admin"))
        db.commit()
    print(f"Created the initial Admin account for {email}.")


if __name__ == "__main__":
    main()
