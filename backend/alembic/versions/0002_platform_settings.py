"""Add persistent platform settings.

Revision ID: 0002_platform_settings
Revises: 0001_initial
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision = "0002_platform_settings"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    if "Platform_Settings" not in inspect(bind).get_table_names():
        op.create_table(
            "Platform_Settings",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("announcement_enabled", sa.Boolean(), server_default=sa.false(), nullable=False),
            sa.Column("announcement_message", sa.String(length=500), nullable=True),
            sa.Column("support_contact", sa.String(length=254), nullable=True),
            sa.Column("registration_enabled", sa.Boolean(), server_default=sa.true(), nullable=False),
            sa.Column("uploads_enabled", sa.Boolean(), server_default=sa.true(), nullable=False),
            sa.Column("updated_by", sa.Integer(), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["updated_by"], ["Users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

    settings_table = sa.table(
        "Platform_Settings",
        sa.column("id", sa.Integer()),
        sa.column("announcement_enabled", sa.Boolean()),
        sa.column("announcement_message", sa.String(length=500)),
        sa.column("support_contact", sa.String(length=254)),
        sa.column("registration_enabled", sa.Boolean()),
        sa.column("uploads_enabled", sa.Boolean()),
    )
    if bind.execute(sa.select(settings_table.c.id).where(settings_table.c.id == 1)).first() is None:
        bind.execute(
            settings_table.insert().values(
                id=1,
                announcement_enabled=False,
                announcement_message=None,
                support_contact=None,
                registration_enabled=True,
                uploads_enabled=True,
            )
        )


def downgrade():
    op.drop_table("Platform_Settings")
