"""Carpool schemas."""

from datetime import datetime, date, time
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class CarpoolAdBase(BaseModel):
    departure_city: str
    destination_city: str
    departure_date: date
    departure_time: time
    available_seats: int = Field(ge=1, le=8)
    price_per_passenger: float = Field(ge=0)
    vehicle_model: str | None = None
    vehicle_color: str | None = None
    driver_name: str | None = None
    phone_number: str | None = None
    meeting_point: str | None = None
    estimated_arrival: str | None = None
    additional_info: str | None = None


class CarpoolAdCreate(CarpoolAdBase):
    pass


class CarpoolAdUpdate(BaseModel):
    departure_city: str | None = None
    destination_city: str | None = None
    departure_date: date | None = None
    departure_time: time | None = None
    available_seats: int | None = Field(None, ge=1, le=8)
    price_per_passenger: float | None = Field(None, ge=0)
    vehicle_model: str | None = None
    vehicle_color: str | None = None
    driver_name: str | None = None
    phone_number: str | None = None
    meeting_point: str | None = None
    estimated_arrival: str | None = None
    additional_info: str | None = None
    status: str | None = None


class CarpoolAdResponse(CarpoolAdBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    status: str
    publication_date: datetime
    last_update: datetime
    views: int
    author_username: str | None = None
    author_profile_picture: str | None = None
