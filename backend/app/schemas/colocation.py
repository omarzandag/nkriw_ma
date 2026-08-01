"""Co-location schemas."""

from datetime import datetime, date
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class ColocationImageSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    image_url: str


class ColocationAdBase(BaseModel):
    title: str = Field(min_length=5, max_length=255)
    description: str = Field(min_length=10)
    monthly_rent: float = Field(gt=0)
    available_rooms: int = Field(default=1, ge=1)
    current_roommates: int = Field(default=0, ge=0)
    city: str
    neighborhood: str | None = None
    address: str | None = None
    preferred_gender: str | None = None
    min_age: int | None = None
    max_age: int | None = None
    student_only: bool = False
    working_professional_only: bool = False
    smoking_allowed: bool = False
    pets_allowed: bool = False
    contact_phone: str | None = None
    available_date: date | None = None


class ColocationAdCreate(ColocationAdBase):
    pass


class ColocationAdUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    monthly_rent: float | None = Field(None, gt=0)
    available_rooms: int | None = None
    current_roommates: int | None = None
    city: str | None = None
    neighborhood: str | None = None
    address: str | None = None
    preferred_gender: str | None = None
    min_age: int | None = None
    max_age: int | None = None
    student_only: bool | None = None
    working_professional_only: bool | None = None
    smoking_allowed: bool | None = None
    pets_allowed: bool | None = None
    contact_phone: str | None = None
    available_date: date | None = None
    status: str | None = None


class ColocationAdResponse(ColocationAdBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    status: str
    publication_date: datetime
    last_update: datetime
    views: int
    images: list[ColocationImageSchema] = []
    author_username: str | None = None
    author_profile_picture: str | None = None
