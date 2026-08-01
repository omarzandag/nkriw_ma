"""User schemas."""

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    username: str
    full_name: str


class UserResponse(UserBase):
    """User response schema (public profile)."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    profile_picture: str | None = None
    cover_picture: str | None = None
    phone_number: str | None = None
    gender: str | None = None
    date_of_birth: datetime | None = None
    city: str | None = None
    bio: str | None = None
    is_admin: bool = False
    join_date: datetime
    last_active: datetime | None = None
    rating: float = 0.0
    verification_badge: bool = False
    housing_ads_count: int = 0
    forum_posts_count: int = 0
    comments_count: int = 0


class UserUpdate(BaseModel):
    """User profile update schema."""
    full_name: str | None = Field(None, min_length=2, max_length=255)
    username: str | None = Field(None, min_length=3, max_length=100)
    phone_number: str | None = None
    gender: str | None = None
    date_of_birth: datetime | None = None
    city: str | None = None
    bio: str | None = None
    profile_picture: str | None = None
    cover_picture: str | None = None


class AdminUserUpdate(BaseModel):
    """Admin user management schema."""
    is_admin: bool | None = None
    is_active: bool | None = None
    is_banned: bool | None = None
    is_suspended: bool | None = None
    email_verified: bool | None = None