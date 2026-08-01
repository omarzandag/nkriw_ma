"""Comment schemas."""

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class CommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=3000)
    parent_id: UUID | None = None


class CommentUpdate(BaseModel):
    content: str = Field(min_length=1, max_length=3000)


class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    content_type: str
    content_id: UUID
    parent_id: UUID | None = None
    content: str
    created_at: datetime
    last_update: datetime
    likes_count: int = 0
    liked_by_me: bool = False
    replies: list["CommentResponse"] = []
    username: str | None = None
    profile_picture: str | None = None
