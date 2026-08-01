"""Report schemas."""

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class ReportCreate(BaseModel):
    content_type: str  # user, housing, colocation, carpool, comment, thread, message
    content_id: UUID
    reason: str  # spam, scam, fake_info, offensive, harassment, duplicate, other
    description: str | None = Field(None, max_length=1000)


class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    reporter_id: UUID
    content_type: str
    content_id: UUID | None = None
    reason: str
    description: str | None = None
    status: str
    admin_notes: str | None = None
    reviewed_by: UUID | None = None
    created_at: datetime
    reviewed_at: datetime | None = None


class ReportAction(BaseModel):
    """Admin action on a report."""
    status: str  # reviewed, dismissed, warned, suspended, banned, deleted
    admin_notes: str | None = None