"""Add persistent administrator activity log.

Revision ID: 0003_admin_activity_log
Revises: 0002_platform_settings
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision = "0003_admin_activity_log"
down_revision = "0002_platform_settings"
branch_labels = None
depends_on = None


def upgrade():
    if "Admin_Activity_Log" in inspect(op.get_bind()).get_table_names():
        return
    op.create_table(
        "Admin_Activity_Log",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("actor_id", sa.Integer(), nullable=True),
        sa.Column("actor_name", sa.String(length=100), nullable=False),
        sa.Column("actor_role", sa.String(length=20), nullable=False),
        sa.Column("action", sa.String(length=50), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["actor_id"], ["Users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_Admin_Activity_Log_actor_id", "Admin_Activity_Log", ["actor_id"])
    op.create_index("ix_Admin_Activity_Log_entity_type", "Admin_Activity_Log", ["entity_type"])
    op.create_index("ix_Admin_Activity_Log_id", "Admin_Activity_Log", ["id"])


def downgrade():
    if "Admin_Activity_Log" in inspect(op.get_bind()).get_table_names():
        op.drop_table("Admin_Activity_Log")
