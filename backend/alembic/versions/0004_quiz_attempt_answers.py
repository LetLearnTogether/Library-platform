"""Store answer snapshots for quiz performance reporting.

Revision ID: 0004_quiz_attempt_answers
Revises: 0003_admin_activity_log
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision = "0004_quiz_attempt_answers"
down_revision = "0003_admin_activity_log"
branch_labels = None
depends_on = None


def upgrade():
    if "Quiz_Attempt_Answers" in inspect(op.get_bind()).get_table_names():
        return
    op.create_table(
        "Quiz_Attempt_Answers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("attempt_id", sa.Integer(), nullable=False),
        sa.Column("question_order", sa.Integer(), nullable=False),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("options", sa.JSON(), nullable=False),
        sa.Column("selected_option_index", sa.Integer(), nullable=False),
        sa.Column("correct_option_index", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["attempt_id"], ["Quiz_Attempts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_Quiz_Attempt_Answers_attempt_id", "Quiz_Attempt_Answers", ["attempt_id"])
    op.create_index("ix_Quiz_Attempt_Answers_id", "Quiz_Attempt_Answers", ["id"])


def downgrade():
    if "Quiz_Attempt_Answers" in inspect(op.get_bind()).get_table_names():
        op.drop_table("Quiz_Attempt_Answers")
