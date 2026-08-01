"""Comment system model with nested replies.

Comments can be attached to housing ads, co-location ads, carpool ads, and forum threads.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Boolean, DateTime, Text, Integer, ForeignKey, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Comment(Base):
    """Comment on various content types with support for nested replies."""

    __tablename__ = "comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # Polymorphic content reference
    content_type = Column(String(50), nullable=False, index=True)
    # content_type: housing, colocation, carpool, forum
    content_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    # Nested replies
    parent_id = Column(UUID(as_uuid=True), ForeignKey("comments.id", ondelete="CASCADE"), nullable=True)

    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_update = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Self-referential relationship for nested replies
    replies = relationship("Comment", backref="parent", remote_side="Comment.id", cascade="all, delete-orphan", single_parent=True)
    likes = relationship("CommentLike", backref="comment", cascade="all, delete-orphan")


class CommentLike(Base):
    """Like on a comment."""

    __tablename__ = "comment_likes"
    __table_args__ = (UniqueConstraint("comment_id", "user_id", name="uq_comment_like"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    comment_id = Column(UUID(as_uuid=True), ForeignKey("comments.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))