"""Add parent_id to forum_replies for nested replies.

Revision ID: 0001_add_parent_id
Revises:
Create Date: 2026-08-05 00:04:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001_add_parent_id"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "forum_replies",
        sa.Column(
            "parent_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("forum_replies.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )
    op.create_index("ix_forum_replies_parent_id", "forum_replies", ["parent_id"])


def downgrade() -> None:
    op.drop_index("ix_forum_replies_parent_id", table_name="forum_replies")
    op.drop_column("forum_replies", "parent_id")