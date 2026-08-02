"""Messaging schemas."""

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    conversation_id: UUID
    sender_id: UUID
    receiver_id: UUID
    content: str
    image_url: str | None = None
    is_read: bool
    is_delivered: bool
    read_at: datetime | None = None
    created_at: datetime


class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user1_id: UUID
    user2_id: UUID
    created_at: datetime
    last_message_at: datetime
    last_message: str | None = None
    unread_count: int = 0
    other_user_username: str | None = None
    other_user_profile_picture: str | None = None
    blocked_by: UUID | None = None
