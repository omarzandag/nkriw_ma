"""Housing schemas."""

from datetime import datetime, date
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class HousingImageSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    image_url: str


class HousingAdBase(BaseModel):
    title: str = Field(min_length=5, max_length=255)
    description: str = Field(min_length=10)
    rental_type: str  # apartment, house, studio, villa, shared_room, private_room, student_residence
    monthly_price: float = Field(gt=0)
    deposit: float = 0
    bills_included: bool = False
    furnished: bool = False
    rooms: int = Field(default=1, ge=1)
    bathrooms: int = Field(default=1, ge=1)
    surface_area: float | None = None
    available_date: date | None = None
    city: str
    neighborhood: str | None = None
    address: str | None = None
    gps_lat: float | None = None
    gps_lng: float | None = None
    contact_phone: str | None = None
    preferred_contact: str = "phone"
    gender_preference: str | None = None
    smoking_allowed: bool = False
    pets_allowed: bool = False
    internet: bool = False
    parking: bool = False
    balcony: bool = False
    kitchen: bool = False
    washing_machine: bool = False
    air_conditioning: bool = False
    heating: bool = False


class HousingAdCreate(HousingAdBase):
    pass


class HousingAdUpdate(BaseModel):
    title: str | None = Field(None, min_length=5, max_length=255)
    description: str | None = None
    rental_type: str | None = None
    monthly_price: float | None = Field(None, gt=0)
    deposit: float | None = None
    bills_included: bool | None = None
    furnished: bool | None = None
    rooms: int | None = Field(None, ge=1)
    bathrooms: int | None = Field(None, ge=1)
    surface_area: float | None = None
    available_date: date | None = None
    city: str | None = None
    neighborhood: str | None = None
    address: str | None = None
    gps_lat: float | None = None
    gps_lng: float | None = None
    contact_phone: str | None = None
    preferred_contact: str | None = None
    gender_preference: str | None = None
    smoking_allowed: bool | None = None
    pets_allowed: bool | None = None
    internet: bool | None = None
    parking: bool | None = None
    balcony: bool | None = None
    kitchen: bool | None = None
    washing_machine: bool | None = None
    air_conditioning: bool | None = None
    heating: bool | None = None
    status: str | None = None


class HousingAdResponse(HousingAdBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    status: str
    publication_date: datetime
    last_update: datetime
    views: int
    images: list[HousingImageSchema] = []
    author_username: str | None = None
    author_profile_picture: str | None = None
