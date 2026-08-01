"""Report system model."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Boolean, DateTime, Text, ForeignKey
)
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class Report(Base):
    """Report for users, advertisements, comments, threads, or messages."""

    __tablename__ = "reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reporter_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # Polymorphic reported content
    content_type = Column(String(50), nullable=False, index=True)
    # content_type: user, housing, colocation, carpool, comment, thread, message
    content_id = Column(UUID(as_uuid=True), nullable=True)

    # Report details
    reason = Column(String(50), nullable=False)
    # Reasons: spam, scam, fake_info, offensive, harassment, duplicate, other
    description = Column(Text, nullable=True)

    # Status: pending, reviewed, dismissed, warned, suspended, banned, deleted
    status = Column(String(20), default="pending")
    admin_notes = Column(Text, nullable=True)
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    reviewed_at = Column(DateTime, nullable=True)