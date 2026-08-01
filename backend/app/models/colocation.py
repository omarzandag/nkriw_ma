"""Co-location (shared accommodation) models."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Boolean, DateTime, Text, Integer, Float, Date, ForeignKey
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class ColocationAd(Base):
    """Co-location advertisement for finding roommates."""

    __tablename__ = "colocation_ads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # House info
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    monthly_rent = Column(Float, nullable=False)
    available_rooms = Column(Integer, default=1)
    current_roommates = Column(Integer, default=0)

    # Location
    city = Column(String(100), nullable=False, index=True)
    neighborhood = Column(String(100), nullable=True)
    address = Column(String(255), nullable=True)

    # Preferences
    preferred_gender = Column(String(20), nullable=True)  # male, female, any
    min_age = Column(Integer, nullable=True)
    max_age = Column(Integer, nullable=True)
    student_only = Column(Boolean, default=False)
    working_professional_only = Column(Boolean, default=False)
    smoking_allowed = Column(Boolean, default=False)
    pets_allowed = Column(Boolean, default=False)

    # Contact
    contact_phone = Column(String(20), nullable=True)
    available_date = Column(Date, nullable=True)

    # Status & timestamps
    status = Column(String(20), default="available")  # available, reserved, found
    publication_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_update = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    views = Column(Integer, default=0)

    # Relationships
    images = relationship("ColocationImage", backref="colocation_ad", cascade="all, delete-orphan")


class ColocationImage(Base):
    """Images for co-location advertisements."""

    __tablename__ = "colocation_images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    colocation_id = Column(UUID(as_uuid=True), ForeignKey("colocation_ads.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))