"""Housing advertisement models."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Boolean, DateTime, Text, Integer, Float, Date, ForeignKey, JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class HousingAd(Base):
    """Housing rental advertisement."""

    __tablename__ = "housing_ads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # Basic info
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    rental_type = Column(String(50), nullable=False)  # apartment, house, studio, villa, shared_room, private_room, student_residence
    monthly_price = Column(Float, nullable=False)
    deposit = Column(Float, default=0)
    bills_included = Column(Boolean, default=False)
    furnished = Column(Boolean, default=False)

    # Property details
    rooms = Column(Integer, default=1)
    bathrooms = Column(Integer, default=1)
    surface_area = Column(Float, nullable=True)  # in m²
    available_date = Column(Date, nullable=True)

    # Location
    city = Column(String(100), nullable=False, index=True)
    neighborhood = Column(String(100), nullable=True)
    address = Column(String(255), nullable=True)
    gps_lat = Column(Float, nullable=True)
    gps_lng = Column(Float, nullable=True)

    # Contact
    contact_phone = Column(String(20), nullable=True)
    preferred_contact = Column(String(50), default="phone")  # phone, email, message

    # Preferences
    gender_preference = Column(String(20), nullable=True)  # male, female, any
    smoking_allowed = Column(Boolean, default=False)
    pets_allowed = Column(Boolean, default=False)

    # Amenities
    internet = Column(Boolean, default=False)
    parking = Column(Boolean, default=False)
    balcony = Column(Boolean, default=False)
    kitchen = Column(Boolean, default=False)
    washing_machine = Column(Boolean, default=False)
    air_conditioning = Column(Boolean, default=False)
    heating = Column(Boolean, default=False)

    # Status & timestamps
    status = Column(String(20), default="available")  # available, reserved, rented
    publication_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_update = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Views count
    views = Column(Integer, default=0)

    # Relationships
    images = relationship("HousingImage", backref="housing_ad", cascade="all, delete-orphan")


class HousingImage(Base):
    """Images for housing advertisements."""

    __tablename__ = "housing_images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    housing_id = Column(UUID(as_uuid=True), ForeignKey("housing_ads.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))