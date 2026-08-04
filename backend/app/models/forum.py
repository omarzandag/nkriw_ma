"""Forum models: threads, replies, reply likes, and thread follows."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Boolean, DateTime, Text, Integer, ForeignKey, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class ForumThread(Base):
    """Forum discussion thread."""

    __tablename__ = "forum_threads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    title = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False, index=True)
    # Categories: housing, colocation, transportation, universities, student_life, general, help
    content = Column(Text, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_update = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    views = Column(Integer, default=0)
    is_pinned = Column(Boolean, default=False)
    is_closed = Column(Boolean, default=False)

    # Relationships
    replies = relationship("ForumReply", backref="thread", cascade="all, delete-orphan")
    follows = relationship("ForumFollow", backref="thread", cascade="all, delete-orphan")


class ForumReply(Base):
    """Reply to a forum thread (supports nested replies via parent_id)."""

    __tablename__ = "forum_replies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id = Column(UUID(as_uuid=True), ForeignKey("forum_threads.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("forum_replies.id", ondelete="CASCADE"), nullable=True, index=True)

    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_update = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    likes = relationship("ReplyLike", backref="reply", cascade="all, delete-orphan")
    children = relationship("ForumReply", backref="parent", remote_side=[id])


class ReplyLike(Base):
    """Like on a forum reply."""

    __tablename__ = "reply_likes"
    __table_args__ = (UniqueConstraint("reply_id", "user_id", name="uq_reply_like"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reply_id = Column(UUID(as_uuid=True), ForeignKey("forum_replies.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ForumFollow(Base):
    """Follow relationship between a user and a forum thread."""

    __tablename__ = "forum_follows"
    __table_args__ = (UniqueConstraint("thread_id", "user_id", name="uq_forum_follow"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id = Column(UUID(as_uuid=True), ForeignKey("forum_threads.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))