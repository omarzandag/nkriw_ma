"""Notification service for creating user notifications."""

from sqlalchemy.orm import Session
from uuid import UUID

from app.models.notification import Notification


def create_notification(
    db: Session,
    user_id: UUID,
    type: str,
    title: str,
    body: str | None = None,
    link: str | None = None,
) -> Notification:
    """Create a notification for a user."""
    notification = Notification(
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        link=link,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification