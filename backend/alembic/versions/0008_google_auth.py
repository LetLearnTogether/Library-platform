"""Support Google-authenticated accounts."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "0008_google_auth"
down_revision = "0007_student_verifications"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {column["name"]: column for column in inspector.get_columns("Users")}

    if "google_subject" not in columns:
        op.add_column("Users", sa.Column("google_subject", sa.String(length=255), nullable=True))

    if not columns["password_hash"]["nullable"]:
        with op.batch_alter_table("Users") as batch:
            batch.alter_column(
                "password_hash",
                existing_type=sa.String(length=255),
                nullable=True,
            )

    index_names = {index["name"] for index in inspector.get_indexes("Users")}
    if "ix_Users_google_subject" not in index_names:
        op.create_index("ix_Users_google_subject", "Users", ["google_subject"], unique=True)


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = {column["name"]: column for column in inspector.get_columns("Users")}

    if "password_hash" in columns and columns["password_hash"]["nullable"]:
        google_only_user = bind.execute(
            sa.text("SELECT 1 FROM Users WHERE password_hash IS NULL LIMIT 1")
        ).first()
        if google_only_user:
            raise RuntimeError("Cannot remove Google authentication while Google-only accounts exist.")

    if "google_subject" in columns:
        index_names = {index["name"] for index in inspector.get_indexes("Users")}
        if "ix_Users_google_subject" in index_names:
            op.drop_index("ix_Users_google_subject", table_name="Users")
        op.drop_column("Users", "google_subject")

    if "password_hash" in columns and columns["password_hash"]["nullable"]:
        with op.batch_alter_table("Users") as batch:
            batch.alter_column(
                "password_hash",
                existing_type=sa.String(length=255),
                nullable=False,
            )
