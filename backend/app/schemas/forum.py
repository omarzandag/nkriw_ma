"""Forum schemas."""

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class ForumReplyBase(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


class ForumReplyCreate(ForumReplyBase):
    parent_id: UUID | None = None


class ForumReplyUpdate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


class ForumReplyResponse(ForumReplyBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    thread_id: UUID
    user_id: UUID
    parent_id: UUID | None = None
    created_at: datetime
    last_update: datetime
    likes_count: int = 0
    liked_by_me: bool = False


class ForumThreadBase(BaseModel):
    title: str = Field(min_length=5, max_length=255)
    category: str
    content: str = Field(min_length=10, max_length=10000)


class ForumThreadCreate(ForumThreadBase):
    pass


class ForumThreadUpdate(BaseModel):
    title: str | None = Field(None, min_length=5, max_length=255)
    category: str | None = None
    content: str | None = Field(None, min_length=10, max_length=10000)


class ForumThreadResponse(ForumThreadBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    created_at: datetime
    last_update: datetime
    views: int
    is_pinned: bool
    is_closed: bool
    replies_count: int = 0