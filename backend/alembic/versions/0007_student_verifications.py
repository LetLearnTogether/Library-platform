"""Add student verification submissions."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "0007_student_verifications"
down_revision = "0006_course_enrollments"
branch_labels = None
depends_on = None


def upgrade():
    if "Student_Verifications" in inspect(op.get_bind()).get_table_names():
        return
    op.create_table(
        "Student_Verifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("full_name", sa.String(length=100), nullable=False),
        sa.Column("student_number", sa.String(length=100), nullable=False),
        sa.Column("university", sa.String(length=150), nullable=False),
        sa.Column("college", sa.String(length=255), nullable=False),
        sa.Column("department", sa.String(length=255), nullable=False),
        sa.Column("academic_year", sa.String(length=20), nullable=False),
        sa.Column("front_image_path", sa.String(length=500), nullable=False),
        sa.Column("front_image_content_type", sa.String(length=50), nullable=False),
        sa.Column("back_image_path", sa.String(length=500), nullable=True),
        sa.Column("back_image_content_type", sa.String(length=50), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("review_note", sa.Text(), nullable=True),
        sa.Column("reviewed_by", sa.Integer(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["reviewed_by"], ["Users.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["Users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index("ix_Student_Verifications_id", "Student_Verifications", ["id"], unique=False)
    op.create_index("ix_Student_Verifications_user_id", "Student_Verifications", ["user_id"], unique=True)
    op.create_index("ix_Student_Verifications_status", "Student_Verifications", ["status"], unique=False)


def downgrade():
    if "Student_Verifications" in inspect(op.get_bind()).get_table_names():
        op.drop_table("Student_Verifications")
