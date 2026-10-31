"""Add student course enrollments."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision = "0006_course_enrollments"
down_revision = "0005_course_announcements"
branch_labels = None
depends_on = None


def upgrade():
    if "Course_Enrollments" in inspect(op.get_bind()).get_table_names():
        return
    op.create_table(
        "Course_Enrollments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("enrolled_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["Courses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["Users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("course_id", "student_id", name="uq_course_enrollment_student"),
    )
    op.create_index("ix_Course_Enrollments_course_id", "Course_Enrollments", ["course_id"])
    op.create_index("ix_Course_Enrollments_id", "Course_Enrollments", ["id"])
    op.create_index("ix_Course_Enrollments_student_id", "Course_Enrollments", ["student_id"])


def downgrade():
    if "Course_Enrollments" in inspect(op.get_bind()).get_table_names():
        op.drop_table("Course_Enrollments")
