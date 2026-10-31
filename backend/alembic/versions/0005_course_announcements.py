"""Add course announcements."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision = "0005_course_announcements"
down_revision = "0004_quiz_attempt_answers"
branch_labels = None
depends_on = None


def upgrade():
    if "Course_Announcements" in inspect(op.get_bind()).get_table_names():
        return
    op.create_table(
        "Course_Announcements",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("author_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["Courses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["author_id"], ["Users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_Course_Announcements_course_id", "Course_Announcements", ["course_id"])
    op.create_index("ix_Course_Announcements_id", "Course_Announcements", ["id"])


def downgrade():
    if "Course_Announcements" in inspect(op.get_bind()).get_table_names():
        op.drop_table("Course_Announcements")
